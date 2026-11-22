-- ============================================================
-- ORBIT migration 003 — Tambalan hasil review blueprint v1
-- Menutup celah: hybrid search, metering AI, device tokens,
-- housekeeping updated_at, batasan entity_type, billing minimal.
-- Review & sesuaikan sebelum dijalankan. Idempoten-ish:
-- gunakan IF NOT EXISTS / IF EXISTS agar aman dijalankan ulang.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ------------------------------------------------------------
-- 1. HYBRID SEARCH (keyword + vector)
-- doc 04 menjanjikan hybrid search; skema awal hanya punya pgvector.
-- Dictionary 'simple' dipakai karena PostgreSQL tidak menyertakan
-- stemmer Bahasa Indonesia; recall kata kunci ditopang pg_trgm.
-- ------------------------------------------------------------

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(extracted_text, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS documents_search_tsv_idx
  ON documents USING GIN (search_tsv);

ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS search_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED;

CREATE INDEX IF NOT EXISTS document_chunks_search_tsv_idx
  ON document_chunks USING GIN (search_tsv);

-- Fuzzy match nama entitas (typo, variasi penulisan nama orang/tempat)
CREATE INDEX IF NOT EXISTS entities_normalized_name_trgm_idx
  ON entities USING GIN (normalized_name gin_trgm_ops);

-- HNSW untuk retrieval vektor — dimensi 1536 sesuai .env.example
-- (EMBEDDING_DIMENSIONS=1536). Jalankan setelah model embedding final.
-- CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw
--   ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------
-- 2. METERING AI (doc 04: "rate limit dan budget per pengguna",
--    doc 07: metrik "AI cost per active user")
-- Ditulis oleh service role setelah setiap panggilan provider.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('extraction','embedding','answer','plan','rerank')),
  provider TEXT,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cost_micros BIGINT NOT NULL DEFAULT 0 CHECK (cost_micros >= 0),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_workspace_created_idx
  ON ai_usage(workspace_id, created_at DESC);

-- ------------------------------------------------------------
-- 3. DEVICE TOKENS (doc 06 M7: mobile capture + push notification)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  locale TEXT NOT NULL DEFAULT 'id-ID',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

-- ------------------------------------------------------------
-- 4. HOUSEKEEPING updated_at (dideklarasikan di skema awal
--    tapi tidak pernah dipelihara)
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.orbit_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','documents','events','tasks']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_touch_updated_at ON public.%I;',
      t, t
    );
    EXECUTE format(
      'CREATE TRIGGER %I_touch_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.orbit_touch_updated_at();',
      t, t
    );
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 5. KONSISTENSI ENUM entity_type (satu-satunya kolom tipe
--    tanpa CHECK di skema awal). Sesuaikan daftar dengan hasil
--    ekstraksi aktual; 'other' sebagai jebakan umum.
-- ------------------------------------------------------------

ALTER TABLE entities DROP CONSTRAINT IF EXISTS entities_entity_type_check;
ALTER TABLE entities
  ADD CONSTRAINT entities_entity_type_check CHECK (
    entity_type IN ('person','organization','place','date','account','other')
  );

-- ------------------------------------------------------------
-- 6. BILLING MINIMAL (P1 — doc 07 "uji paket berbayar").
-- Dibuat sekarang agar skema pricing tidak improvisasi nanti.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, -- free | plus | pro | family | business
  name TEXT NOT NULL,
  price_idr INTEGER NOT NULL DEFAULT 0 CHECK (price_idr >= 0),
  limits JSONB NOT NULL DEFAULT '{}' -- contoh: {"documents": 100, "ai_answers_month": 20}
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- satu subscription aktif per workspace
  UNIQUE NULLS NOT DISTINCT (workspace_id, status) DEFERRABLE INITIALLY DEFERRED
);

CREATE TRIGGER subscriptions_touch_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.orbit_touch_updated_at();

-- Seed hipotesis harga (doc 07) — harga validasi, bukan final.
INSERT INTO plans (id, name, price_idr, limits) VALUES
  ('free',     'Free',     0,      '{"documents": 100, "reminders_month": 10, "ai_answers_month": 0}'),
  ('plus',     'Plus',     39000,  '{"documents": 2000, "ai_answers_month": 100}'),
  ('pro',      'Pro',      89000,  '{"documents": 10000, "ai_answers_month": 500, "integrations": true}'),
  ('family',   'Family',   129000, '{"members": 5, "ai_answers_month": 200}'),
  ('business', 'Business', 299000, '{"members": null, "ai_answers_month": 2000}')
ON CONFLICT (id) DO NOTHING;

-- Catatan: UNIQUE NULLS NOT DISTINCT butuh PostgreSQL 15+; sesuaikan
-- (mis. partial unique index) bila Supabase proyek Anda lebih tua.

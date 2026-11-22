# Panduan Migrasi ke Supabase (PostgreSQL + RLS)

> Prasyarat sudah disiapkan otomatis dan **sudah diverifikasi dengan PostgreSQL nyata**
> (embedded via `npm run verify:pg`, 13 langkah hijau: skema, migrasi, 55 kebijakan RLS,
> impor dump, rekonsiliasi 21 tabel, isolasi antar pengguna):
> - skema: `blueprint/ORBIT_Blueprint_v1/database/` (schema.sql + migrations 002, 003 + policies/rls_full.sql — **2 bug SQL v1 ditemukan & diperbaiki oleh verifikasi**: policy `document_entities` menunjuk kolom yang tidak ada, dan `NEW` dipakai di policy `messages` yang tak dikenali Postgres vanilla)
> - alat ekspor data lokal: `cd app && npm run export:pg` → `server/data/export/orbit-pg-<stamp>.sql`
>   (kolom difilter ke skema target + boolean dikonversi; ⚠ tiga kolom MVP disengaja dilewati: `documents.extraction`, `document_chunks.embedding`, `document_entities.confidence` — keputusan data-layer produksi, lihat Langkah 6)
> - uji ulang kapan pun: `npm run verify:pg`

## Langkah 1 — Buat proyek Supabase
1. https://supabase.com → New project.
2. Region: **Singapore / Jakarta** (ap-southeast-1/2) untuk pengguna Indonesia.
3. Simpan: password database, Project URL, `service_role` key (untuk server), anon key (untuk klien bila perlu).

## Langkah 2 — Ambil connection string
Dashboard → **Connect** → pakai **Session pooler** (port 5432) untuk psql:
```
postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

## Langkah 3 — Buat skema (urutan penting)
```bash
psql "$DATABASE_URL" -f blueprint/ORBIT_Blueprint_v1/database/schema.sql
psql "$DATABASE_URL" -f blueprint/ORBIT_Blueprint_v1/database/migrations/002_security_and_indexes.sql
psql "$DATABASE_URL" -f blueprint/ORBIT_Blueprint_v1/database/migrations/003_hybrid_search_and_metering.sql
psql "$DATABASE_URL" -f blueprint/ORBIT_Blueprint_v1/database/policies/rls_full.sql
```
Catatan: `schema.sql` perlu ekstensi — jalankan di SQL Editor bila psql tidak tersedia.
Kolom MVP tambahan (mis. `users.onboarded_at`, `notification_optin`,
`documents.processing_error`, `confirmed`, tabel `feedback`) belum ada di
schema.sql — tambahkan via SQL Editor:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_optin BOOLEAN NOT NULL DEFAULT FALSE;
-- kolom MVP yang tidak ada di skema blueprint (server membutuhkannya):
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_error TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
ALTER TABLE ai_approvals ADD COLUMN IF NOT EXISTS execution_note TEXT;
-- activity_logs MVP mencatat peristiwa tingkat akun (workspace NULL):
ALTER TABLE activity_logs ALTER COLUMN workspace_id DROP NOT NULL;
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('queued','processing','ready','failed')),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  context TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS billing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  amount_idr INTEGER NOT NULL CHECK (amount_idr > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled','expired')),
  provider TEXT NOT NULL DEFAULT 'mock' CHECK (provider IN ('mock','midtrans')),
  provider_ref TEXT,
  checkout_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Langkah 4 — Impor data lokal
```bash
cd app
npm run export:pg          # regenerasi dump terbaru dari SQLite lokal
psql "$DATABASE_URL" -f server/data/export/orbit-pg-<stamp>.sql
```
Dump diawali `SET session_replication_role = replica` (role postgres Supabase punya hak ini)
supaya FK dilewati sementara; selesai kembali ke DEFAULT lalu COMMIT.

## Langkah 5 — Verifikasi
```bash
npm run metrics      # angka lokal
psql "$DATABASE_URL" -c "SELECT (SELECT COUNT(*) FROM documents) docs, (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM document_chunks) chunks;"
```
Angka harus sama dengan `npm run metrics` (demo: 12 dokumen, 3 pengguna, 14 chunk).

## Langkah 6 — Lapisan data server (manual, sengaja)
Server node saat ini memakai SQLite (`node:sqlite`). Skema SQL-nya adalah
cermin skema PostgreSQL, jadi perpindahan data layer = ganti `db.mjs`
ke klien `pg`/`postgres` dengan `DATABASE_URL` (query sudah Postgres-style
kebanyakan; catatan: `datetime('now')` → `now()`, `json_extract` → operator
JSONB). Ini pekerjaan terkontrol — kerjakan setelah proyek Supabase ada dan
uji dengan test suite yang sama (`npm test`, `ORBIT_DB=pg`).

## RLS & keamanan
- `policies/rls_full.sql` mengaktifkan RLS + helper `orbit_can_access` (anti-rekursif) — wajib aktif sebelum klien non-server menyentuh DB.
- Server tetap memakai `service_role`/connection string (melewati RLS karena server melakukan otorisasi per-workspace sendiri, seperti sekarang).
- Jangan pernah menaruh `service_role` key di frontend/mobile.

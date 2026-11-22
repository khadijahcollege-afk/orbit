/* ============================================================
   ORBIT — worker thread lapisan data PostgreSQL (dipakai bila
   ORBIT_DB=pglite|pg; lihat db-bridge.mjs untuk jembatan sinkron).
   - ORBIT_DB=pglite : PostgreSQL embedded (WASM) untuk uji lokal —
     bootstrap skema otomatis dari blueprint + blok ALTER MVP.
   - ORBIT_DB=pg     : klien pg.Pool (Supabase) — skema dianggap sudah
     dibuat (docs/supabase-migrasi.md); blok ALTER dijalankan idempoten.
   Protokol RPC sinkron (Atomics) dijembatani db-bridge.mjs.
   ============================================================ */
import { parentPort, workerData } from 'node:worker_threads'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const { shared, backend, databaseUrl, dataDir, appDir } = workerData
const { statusBuf, dataBuf, lengthBuf } = shared
const BP = path.join(appDir, '..', '..', 'blueprint', 'ORBIT_Blueprint_v1')
const read = (p) => readFileSync(p, 'utf8')

let query // (sql, params) => { rows }

async function boot() {
  if (backend === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite')
    const { pg_trgm } = await import('@electric-sql/pglite/contrib/pg_trgm')
    const { pgcrypto } = await import('@electric-sql/pglite/contrib/pgcrypto')
    const db = new PGlite({ extensions: { pg_trgm, pgcrypto } })
    // Bootstrap (idempoten) — sama dengan npm run verify:pg:
    // pgvector tidak ada di pglite → kolom embedding lokal TEXT (MVP: JSON teks).
    const schemaSql = read(path.join(BP, 'database', 'schema.sql'))
      .split('\n')
      .filter((l) => !/CREATE EXTENSION IF NOT EXISTS vector/.test(l))
      .join('\n')
      .replaceAll('VECTOR(1536)', 'TEXT')
    await db.exec(schemaSql)
    await db.exec("CREATE SCHEMA IF NOT EXISTS auth; CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('orbit.test_uid', true), '')::uuid $$;")
    await db.exec(read(path.join(BP, 'database', 'migrations', '002_security_and_indexes.sql')))
    await db.exec(read(path.join(BP, 'database', 'migrations', '003_hybrid_search_and_metering.sql')))
    await db.exec(bootstrapMvpSql())
    console.log('[db-worker] plans setelah boot:', (await db.query('SELECT COUNT(*) c FROM plans')).rows[0].c)
    query = async (sql, params) => {
      if (!params || params.length === 0) {
        // multi-pernyataan (simple protocol); baris = pernyataan terakhir
        const results = await db.exec(sql)
        const last = results.at(-1)
        return { rows: last?.rows ?? [], changes: last?.affectedRows ?? 0 }
      }
      const r = await db.query(sql, params)
      return { rows: r.rows, changes: r.affectedRows ?? r.rowCount ?? 0 }
    }
  } else {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 })
    // skema dianggap sudah dibuat; blok ALTER MVP idempoten (abaikan gagal per pernyataan)
    for (const stmt of bootstrapMvpSql().split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
      try {
        await pool.query(stmt)
      } catch {
        /* sudah ada / tidak berlaku */
      }
    }
    query = async (sql, params) => {
      const r = await pool.query(sql, params ?? [])
      return { rows: r.rows, changes: r.rowCount ?? 0 }
    }
  }
}

/** Blok ALTER + tabel MVP — SAMA dengan blok di docs/supabase-migrasi.md. */
function bootstrapMvpSql() {
  return `
    ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_optin BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_error TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction JSONB;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
    ALTER TABLE ai_approvals ADD COLUMN IF NOT EXISTS execution_note TEXT;
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
  `
}

parentPort.on('message', async (msg) => {
  const before = query ? (await query('SELECT COUNT(*) c FROM plans').catch(() => ({ rows: [{ c: -1 }] }))).rows[0].c : -1
  const { rows: afterRows } = (async () => ({ rows: [] }))()
  const { id, sql, params } = msg
  try {
    if (!query) await boot()
    const { rows, changes } = await query(sql, params)
    const payload = JSON.stringify({ ok: true, rows, changes })
    const bytes = Buffer.from(payload, 'utf8')
    if (bytes.length > dataBuf.length - 4) {
      writeResponse(id, JSON.stringify({ ok: false, error: 'response terlalu besar' }))
      return
    }
    lengthBuf[0] = bytes.length
    dataBuf.set(bytes.subarray(0, Math.min(bytes.length, dataBuf.length)), 0)
    Atomics.store(statusBuf, 0, bytes.length <= dataBuf.length ? 1 : 2)
    Atomics.notify(statusBuf, 0)
  } catch (err) {
    writeResponse(id, JSON.stringify({ ok: false, error: String(err?.message || err).slice(0, 500) }))
  }
})

function writeResponse(id, payload) {
  const bytes = Buffer.from(payload, 'utf8')
  lengthBuf[0] = bytes.length
  dataBuf.set(bytes.subarray(0, Math.min(bytes.length, dataBuf.length)), 0)
  Atomics.store(statusBuf, 0, 1)
  Atomics.notify(statusBuf, 0)
}

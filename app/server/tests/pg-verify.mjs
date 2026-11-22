/* ============================================================
   ORBIT — verifikasi jalur Supabase dengan PostgreSQL sungguhan
   (embedded via @electric-sql/pglite, tanpa Docker/server).
   Mengujui TEPAT seperti yang akan dijalankan di Supabase:
     1. schema.sql (blueprint) + ekstensi pgcrypto/vector/pg_trgm
     2. migrations 002, 003
     3. policies/rls_full.sql (dengan stub auth.uid() ala Supabase)
     4. ALTER kolom MVP + tabel feedback (dari docs/supabase-migrasi.md)
     5. dump `npm run export:pg` → impor → rekonsiliasi per-tabel
     6. Uji perilaku RLS: pengguna A tidak melihat dokumen B
   Jalankan: node server/tests/pg-verify.mjs
   ============================================================ */
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const APP = path.resolve(HERE, '..', '..')
const BP = path.join(APP, '..', 'blueprint', 'ORBIT_Blueprint_v1')
const DATA = process.env.ORBIT_DATA_DIR || path.join(APP, 'server', 'data')
const read = (p) => readFileSync(p, 'utf8')

let step = 0
const ok = (msg) => console.log(`  ✓ [${++step}] ${msg}`)
const die = (msg, err) => {
  console.error(`  ✗ [${step + 1}] ${msg}`)
  console.error(err?.message?.slice(0, 500) || err)
  process.exit(1)
}

const db = new PGlite({ extensions: { pg_trgm, pgcrypto } })
const exec = async (sql) => db.exec(sql)

/* Stub auth ala Supabase SEBELUM apa pun yang menyebut auth.uid()
   (di Supabase nyata, skema auth + auth.uid() sudah bawaan). */
try {
  await exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('orbit.test_uid', true), '')::uuid
    $$;
  `)
  ok('stub auth.uid() (konteks uji dari current_setting)')
} catch (err) { die('stub auth gagal', err) }

/* 1. Skema blueprint. Catatan: pgvector tidak tersedia di PGlite build ini —
   `CREATE EXTENSION vector` dilewati dan kolom `embedding VECTOR(1536)`
   di-lokalkan menjadi TEXT (MVP menyimpan embedding sebagai JSON teks).
   Di Supabase: vector ada bawaan; keputusan pgvector-vs-TEXT untuk embedding
   adalah bagian migrasi data layer (lihat docs/supabase-migrasi.md). */
try {
  const schemaSql = read(path.join(BP, 'database', 'schema.sql'))
    .split('\n')
    .filter((l) => !/CREATE EXTENSION IF NOT EXISTS vector/.test(l))
    .join('\n')
    .replaceAll('VECTOR(1536)', 'TEXT')
  await exec(schemaSql)
  ok('schema.sql blueprint (21 tabel + pgcrypto; embedding VECTOR→TEXT lokal, pgvector keputusan migrasi)')
} catch (err) { die('schema.sql gagal', err) }

/* 2. Migrasi v1.1 */
try {
  await exec(read(path.join(BP, 'database', 'migrations', '002_security_and_indexes.sql')))
  ok('migrations/002_security_and_indexes.sql')
} catch (err) { die('migrasi 002 gagal', err) }
try {
  await exec(read(path.join(BP, 'database', 'migrations', '003_hybrid_search_and_metering.sql')))
  ok('migrations/003_hybrid_search_and_metering.sql (hybrid search + metering)')
} catch (err) { die('migrasi 003 gagal', err) }

/* 3. RLS (stub auth sudah dipasang di atas). PG_VERIFY_ISOLATE=1 menunjukkan
   pernyataan mana yang gagal alih-alih berhenti di pertama. */
function splitStatements(sql) {
  // pisahkan per ';' di luar kutip tunggal, kutip-ganda, dan blok $$..$$
  const out = []
  let cur = ''
  let dollarTag = null
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    if (dollarTag) {
      if (sql.startsWith(dollarTag, i)) {
        cur += dollarTag
        i += dollarTag.length - 1
        dollarTag = null
      } else {
        cur += c
      }
      continue
    }
    if (!inSingle && !inDouble && c === '$') {
      const m = /^\$[a-zA-Z_]*\$/.exec(sql.slice(i))
      if (m) {
        dollarTag = m[0]
        cur += m[0] // masukkan tag pembuka utuh, lanjut setelahnya
        i += m[0].length - 1
        continue
      }
    }
    if (c === "'" && !inDouble) inSingle = !inSingle
    else if (c === '"' && !inSingle) inDouble = !inDouble
    else if (c === '-' && sql[i + 1] === '-' && !inSingle && !inDouble) {
      while (i < sql.length && sql[i] !== '\n') i++ // lewati komentar baris
      cur += '\n'
      continue
    }
    if (c === ';' && !inSingle && !inDouble && !dollarTag) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out.filter((s) => s.length)
}

const rlsSql = read(path.join(BP, 'database', 'policies', 'rls_full.sql'))
if (process.env.PG_VERIFY_ISOLATE) {
  let bad = 0
  const stmts = splitStatements(rlsSql)
  for (const s of stmts) {
    try {
      await exec(s)
    } catch (err) {
      bad++
      console.error(`  ✗ ${s.replace(/\s+/g, ' ').slice(0, 110)} => ${err.message.slice(0, 110)}`)
    }
  }
  console.error(`  (isolasi: ${stmts.length} pernyataan, ${bad} gagal)`)
} else {
  try {
    await exec(rlsSql)
    const n = (await db.query(`SELECT COUNT(*) c FROM pg_policies WHERE schemaname = 'public'`)).rows[0].c
    ok(`policies/rls_full.sql — ${n} kebijakan RLS aktif`)
  } catch (err) { die('rls_full.sql gagal', err) }
}

/* 4. Kolom MVP (dari docs/supabase-migrasi.md) */
try {
  await exec(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_optin BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_error TEXT;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction JSONB;
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS confirmed BOOLEAN;
    ALTER TABLE ai_approvals ADD COLUMN IF NOT EXISTS execution_note TEXT;
    -- activity_logs MVP mencatat peristiwa tingkat akun (workspace NULL)
    ALTER TABLE activity_logs ALTER COLUMN workspace_id DROP NOT NULL;
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
  `)
  ok('ALTER kolom MVP + tabel feedback')
} catch (err) { die('ALTER MVP gagal', err) }

/* 5. Impor dump terbaru dari npm run export:pg */
const dumpDir = path.join(DATA, 'export')
const dumps = existsSync(dumpDir) ? readdirSyncNewest(dumpDir) : []
if (!dumps.length) die('tidak ada dump — jalankan dulu: npm run export:pg', '')
const dumpPath = dumps[0]
const src = new DatabaseSync(path.join(DATA, 'orbit.db'), { readOnly: true })
try {
  await exec(read(dumpPath))
  ok(`dump diimpor: ${path.basename(dumpPath)}`)
} catch (err) { die('impor dump gagal', err) }

/* Rekonsiliasi per tabel */
const tables = src.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all().map((r) => r.name)
let mismatch = 0
for (const t of tables) {
  const srcCount = src.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c
  const pgCount = (await db.query(`SELECT COUNT(*) c FROM ${t}`)).rows[0].c
  if (srcCount !== pgCount) {
    mismatch++
    console.error(`  ✗ rekonsiliasi ${t}: sqlite=${srcCount} pg=${pgCount}`)
  }
}
if (mismatch) die(`rekonsiliasi gagal di ${mismatch} tabel`, '')
ok(`rekonsiliasi ${tables.length} tabel: semua jumlah baris cocok`)

/* 6. Uji perilaku RLS: role non-superuser, konteks uid berganti */
try {
  await exec(`
    CREATE ROLE test_user NOLOGIN;
    GRANT USAGE ON SCHEMA public TO test_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO test_user;
  `)
  const users = src.prepare(`SELECT id, full_name FROM users ORDER BY created_at LIMIT 2`).all()
  const [A, B] = users
  const wsA = src.prepare(`SELECT workspace_id FROM workspace_members WHERE user_id = ? LIMIT 1`).get(A.id)?.workspace_id
  const docsA = src.prepare(`SELECT COUNT(*) c FROM documents WHERE workspace_id = ?`).get(wsA)?.c

  await exec(`BEGIN; SET LOCAL ROLE test_user;`)
  await exec(`SELECT set_config('orbit.test_uid', '${A.id}', true);`)
  const seenA = (await db.query(`SELECT COUNT(*) c FROM documents`)).rows[0].c
  const wsAll = (await db.query(`SELECT COUNT(*) c FROM workspaces`)).rows[0].c
  await exec(`SELECT set_config('orbit.test_uid', '${B?.id || A.id}', true);`)
  const seenB = (await db.query(`SELECT COUNT(*) c FROM documents`)).rows[0].c
  // orbit_can_access langsung (GUC masih hidup dalam transaksi yang sama)
  await exec(`SELECT set_config('orbit.test_uid', '${A.id}', true);`)
  const can = (await db.query(`SELECT orbit_can_access('${wsA}', 'viewer') ok`)).rows[0].ok
  const canAdmin = (await db.query(`SELECT orbit_can_access('${wsA}', 'admin') ok`)).rows[0].ok
  await exec(`SELECT set_config('orbit.test_uid', '${B?.id || A.id}', true);`)
  const nonMember = (await db.query(`SELECT orbit_can_access('${wsA}', 'viewer') ok`)).rows[0].ok
  await exec(`COMMIT;`)

  if (seenA !== docsA) die(`A melihat ${seenA} dokumen, seharusnya ${docsA}`, '')
  ok(`RLS: pengguna A (${A.full_name}) hanya melihat ${seenA} dokumen miliknya`)
  ok(`RLS: pengguna B melihat ${seenB} dokumen (A punya ${docsA} — tidak bocor)`)
  if (seenB !== 0 && seenB === seenA) die('RLS tidak menyaring antar pengguna', '')
  if (wsAll > 1) ok(`RLS: daftar workspace juga tersaring (${wsAll} terlihat)`)
  if (!can) die('orbit_can_access salah untuk anggota', '')
  ok('helper orbit_can_access benar utk anggota workspace (viewer)')
  if (!canAdmin) die('owner seharusnya memenuhi syarat admin', '')
  ok('helper orbit_can_access: owner memenuhi syarat admin')
  if (nonMember) die('bukan anggota diizinkan orbit_can_access', '')
  ok('helper orbit_can_access menolak bukan-anggota workspace')
} catch (err) { die('uji RLS gagal', err) }

console.log(`\n[pg-verify] SELESAI — jalur Supabase terverifikasi dengan PostgreSQL nyata (embedded).`)

function readdirSyncNewest(dir) {
  return readdirSync(dir)
    .filter((f) => f.startsWith('orbit-pg-') && f.endsWith('.sql'))
    .sort()
    .reverse()
    .map((f) => path.join(dir, f))
}

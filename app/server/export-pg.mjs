/* ============================================================
   ORBIT — ekspor SQLite → dump SQL PostgreSQL (persiapan Supabase).
   - Urutan tabel otomatis (topologi FK dari PRAGMA foreign_key_list)
   - TRUNCATE ... CASCADE di depan agar aman dijalankan ulang
   - Validasi: rekonsiliasi jumlah baris + kecocokan kolom vs schema.sql
   Jalankan: npm run export:pg   (hasil di server/data/export/*.sql)
   Impor:     psql "$DATABASE_URL" -f <file>
   ============================================================ */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.ORBIT_DATA_DIR || path.join(here, 'data')
const dbPath = path.join(dataDir, 'orbit.db')
const outDir = path.join(dataDir, 'export')
const blueprintSchema = path.resolve(here, '..', '..', 'blueprint', 'ORBIT_Blueprint_v1', 'database', 'schema.sql')
if (!existsSync(dbPath)) {
  console.error(`[export-pg] DB tidak ada: ${dbPath}`)
  process.exit(1)
}

const db = new DatabaseSync(dbPath, { readOnly: true })
const tables = db
  .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
  .all()
  .map((r) => r.name)

/* --- urutan insert: topologi FK (parents dulu) --- */
const fks = new Map()
for (const t of tables) fks.set(t, db.prepare(`PRAGMA foreign_key_list(${t})`).all().map((f) => f.table).filter((p) => tables.includes(p) && p !== t))
const order = []
const state = new Map(tables.map((t) => [t, 0])) // 0=belum,1=proses,2=selesai
function visit(t) {
  if (state.get(t) === 2) return
  if (state.get(t) === 1) throw new Error(`FK melingkar di sekitar ${t}`)
  state.set(t, 1)
  for (const p of fks.get(t)) visit(p)
  state.set(t, 2)
  order.push(t)
}
for (const t of tables) visit(t)

/* --- nilai → SQL literal --- */
const pgValue = (v) => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return v
  if (typeof v === 'bigint') return v.toString()
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (v instanceof Uint8Array) return `'\\x${Buffer.from(v).toString('hex')}'::bytea`
  return `'${String(v).replaceAll("'", "''")}'`
}

/* --- kolom target: skema blueprint + tabel/kolom MVP terdokumentasi.
     Sumber kebenaran = docs/supabase-migrasi.md (blok ALTER + DDL).
     Kolom SQLite yang tidak ada di target DILEWATI dengan peringatan. --- */
const schemaCols = new Map() // tabel → Map(kolom → tipe SQL target)
for (const p of [blueprintSchema, path.resolve(here, '..', '..', 'blueprint', 'ORBIT_Blueprint_v1', 'database', 'migrations', '002_security_and_indexes.sql'), path.resolve(here, '..', '..', 'blueprint', 'ORBIT_Blueprint_v1', 'database', 'migrations', '003_hybrid_search_and_metering.sql')]) {
  if (!existsSync(p)) continue
  const sql = readFileSync(p, 'utf8')
  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(([^;]+?)\n\);/gs)) {
    const name = m[1]
    const cols = [...m[2].matchAll(/^\s{2}(\w+)\s+(TEXT|INTEGER|REAL|BOOLEAN|TIMESTAMPTZ|UUID|JSONB|BYTEA|DOUBLE PRECISION|BIGINT)/gm)].map((c) => [c[1], c[2]])
    if (!schemaCols.has(name)) schemaCols.set(name, new Map(cols))
  }
}
/* Tabel tambahan MVP (DDL lengkap ada di panduan migrasi) */
for (const [t, cols] of Object.entries({
  sessions: [['token', 'TEXT'], ['user_id', 'UUID'], ['created_at', 'TIMESTAMPTZ'], ['expires_at', 'TIMESTAMPTZ']],
  exports: [['id', 'UUID'], ['user_id', 'UUID'], ['status', 'TEXT'], ['payload', 'JSONB'], ['created_at', 'TIMESTAMPTZ']],
  feedback: [['id', 'UUID'], ['user_id', 'UUID'], ['message', 'TEXT'], ['context', 'TEXT'], ['status', 'TEXT'], ['created_at', 'TIMESTAMPTZ']],
  billing_orders: [['id', 'UUID'], ['workspace_id', 'UUID'], ['user_id', 'UUID'], ['plan_id', 'TEXT'], ['amount_idr', 'INTEGER'], ['status', 'TEXT'], ['provider', 'TEXT'], ['provider_ref', 'TEXT'], ['checkout_url', 'TEXT'], ['paid_at', 'TIMESTAMPTZ'], ['created_at', 'TIMESTAMPTZ'], ['updated_at', 'TIMESTAMPTZ']],
})) schemaCols.set(t, new Map(cols))
/* Kolom tambahan MVP pada tabel blueprint (wajib ada di blok ALTER panduan) */
const MVP_ADDITIONS = {
  users: [['password_hash', 'TEXT'], ['deleted_at', 'TIMESTAMPTZ'], ['onboarded_at', 'TIMESTAMPTZ'], ['notification_optin', 'BOOLEAN']],
  documents: [['confirmed', 'BOOLEAN'], ['processing_error', 'TEXT']],
  ai_approvals: [['execution_note', 'TEXT']],
}
for (const [t, cols] of Object.entries(MVP_ADDITIONS)) for (const [c, ty] of cols) schemaCols.get(t)?.set(c, ty)
const BOOLEAN_TARGET = new Map()
for (const [, cols] of schemaCols) for (const [c, ty] of cols) if (ty === 'BOOLEAN') BOOLEAN_TARGET.set(c, true)

mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outPath = path.join(outDir, `orbit-pg-${stamp}.sql`)
const parts = [
  `-- ORBIT: dump SQLite → PostgreSQL (${stamp})`,
  `-- Impor: psql "$DATABASE_URL" -f ${path.basename(outPath)}`,
  `-- SKEMA HARUS SUDAH DIBUAT: schema.sql + migrations 002, 003 + policies/rls_full.sql`,
  `BEGIN;`,
  `SET session_replication_role = replica; -- Supabase: role postgres punya ini; bila gagal, jalankan per-bagian`,
  `TRUNCATE ${order.join(', ')} RESTART IDENTITY CASCADE;`,
]
const summary = []
let totalRows = 0
for (const t of order) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all()
  const rows = db.prepare(`SELECT * FROM ${t}`).all()
  // cocokkan kolom dengan blueprint (peringatan saja — kolom tambahan MVP diabaikan saat impor manual)
  if (schemaCols.has(t)) {
    const missing = cols.filter((c) => !schemaCols.get(t).has(c.name) && !['onboarded_at', 'notification_optin', 'confirmed', 'processing_error'].includes(c.name))
    if (missing.length) summary.push(`  ⚠ ${t}: kolom tidak ada di schema.sql: ${missing.map((c) => c.name).join(', ')}`)
  }
  // emit hanya kolom yang dikenali skema target; sisanya dilewati + peringatan
  const target = schemaCols.get(t) ?? new Set(cols.map((c) => c.name))
  const emitted = cols.filter((c) => target.has(c.name))
  const skipped = cols.filter((c) => !target.has(c.name))
  if (skipped.length) summary.push(`  ⚠ ${t}: kolom dilewati (tidak di skema target): ${skipped.map((c) => c.name).join(', ')}`)
  for (const r of rows) {
    const vals = emitted.map((c) => {
      let v = r[c.name]
      if (BOOLEAN_TARGET.has(c.name) && (v === 0 || v === 1)) v = v === 1 // kolom boolean target
      return pgValue(v)
    })
    parts.push(`INSERT INTO ${t} (${emitted.map((c) => c.name).join(', ')}) VALUES (${vals.join(', ')});`)
  }
  totalRows += rows.length
  summary.push(`  ${t}: ${rows.length} baris`)
}
parts.push(`SET session_replication_role = DEFAULT;`, `COMMIT;`, `-- selesai: ${totalRows} baris total`)
writeFileSync(outPath, parts.join('\n') + '\n', 'utf8')

console.log(`[export-pg] ${outPath}`)
console.log(summary.join('\n'))
console.log(`[export-pg] total ${totalRows} baris, ${order.length} tabel (urutan FK aman)`)
db.close()

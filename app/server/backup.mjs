/* ============================================================
   ORBIT — backup database (doc 05: "backup dan recovery testing").
   Menyalin SQLite via VACUUM INTO (konsisten walau WAL aktif).
   Jalankan manual atau via cron/task scheduler harian:
     node server/backup.mjs
   ============================================================ */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.ORBIT_DATA_DIR || path.join(here, 'data')
const dbPath = path.join(dataDir, 'orbit.db')
const backupDir = path.join(dataDir, 'backups')
mkdirSync(backupDir, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const target = path.join(backupDir, `orbit-${stamp}.db`)

const db = new DatabaseSync(dbPath, { readOnly: true })
db.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`)
db.close()

// Verifikasi restore: buka salinan read-only dan pastikan inti datanya terbaca.
// (doc 05 — backup yang tidak pernah diuji buka dianggap tidak ada.)
const verify = new DatabaseSync(target, { readOnly: true })
const counts = {
  users: verify.prepare('SELECT COUNT(*) c FROM users').get().c,
  documents: verify.prepare('SELECT COUNT(*) c FROM documents').get().c,
  reminders: verify.prepare('SELECT COUNT(*) c FROM reminders').get().c,
}
const integrity = verify.prepare('PRAGMA integrity_check').get().integrity_check
verify.close()
if (integrity !== 'ok') {
  console.error(`[backup] GAGAL verifikasi integritas: ${integrity}`)
  process.exit(1)
}

// retensi: simpan 14 backup terakhir
const files = readdirSync(backupDir)
  .filter((f) => f.startsWith('orbit-') && f.endsWith('.db'))
  .sort()
  .reverse()
for (const old of files.slice(14)) unlinkSync(path.join(backupDir, old))

const size = statSync(target).size
console.log(`[backup] ${target} (${(size / 1024).toFixed(1)} KB) · integritas ok · users=${counts.users} documents=${counts.documents} reminders=${counts.reminders}`)

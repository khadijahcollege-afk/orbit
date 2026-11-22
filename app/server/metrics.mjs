/* ============================================================
   ORBIT — metrik beta (docs/06 "Validasi pasar"):
   activation, weekly active, search success proxy, reminder
   usefulness proxy, pemakaian AI, feedback. Baca-only.
   Jalankan: npm run metrics
   ============================================================ */
import { DatabaseSync } from 'node:sqlite'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.ORBIT_DATA_DIR || path.join(here, 'data')
const dbPath = path.join(dataDir, 'orbit.db')
if (!existsSync(dbPath)) {
  console.error(`[metrics] DB tidak ada: ${dbPath}`)
  process.exit(1)
}
const db = new DatabaseSync(dbPath, { readOnly: true })

const one = (sql, ...args) => db.prepare(sql).get(...args)
const all = (sql, ...args) => db.prepare(sql).all(...args)
const nowIso = new Date().toISOString()
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()

const users = one(`SELECT COUNT(*) c FROM users WHERE deleted_at IS NULL`).c
// aktivasi per pengguna: punya ≥1 dokumen di workspace-nya
const activatedUsers = one(
  `SELECT COUNT(DISTINCT m.user_id) c FROM workspace_members m
   WHERE m.user_id IN (SELECT id FROM users WHERE deleted_at IS NULL)
     AND EXISTS (SELECT 1 FROM documents d WHERE d.workspace_id = m.workspace_id)`,
).c
const weeklyActive = one(
  `SELECT COUNT(DISTINCT l.actor_id) c FROM activity_logs l
   JOIN users u ON u.id = l.actor_id
   WHERE l.actor_id IS NOT NULL AND l.created_at >= ? AND u.deleted_at IS NULL`,
  weekAgo,
).c
const docsTotal = one(`SELECT COUNT(*) c FROM documents`).c
const docsStatus = all(`SELECT processing_status, COUNT(*) c FROM documents GROUP BY processing_status ORDER BY c DESC`)
const answersMonth = one(`SELECT COUNT(*) c FROM ai_usage WHERE kind = 'answer' AND created_at >= ?`, monthStart).c
const answersTotal = one(`SELECT COUNT(*) c FROM ai_usage WHERE kind = 'answer'`).c
const searchesMonth = one(`SELECT COUNT(*) c FROM ai_usage WHERE kind = 'rerank' AND created_at >= ?`, monthStart).c
const extractionAll = all(`SELECT SUM(CASE WHEN json_extract(extraction,'$.confidence') >= 0.8 THEN 1 ELSE 0 END) ok, COUNT(*) c FROM documents WHERE extraction IS NOT NULL`).at(0)
const approvals = all(`SELECT status, COUNT(*) c FROM ai_approvals GROUP BY status`)
const remindersMonth = one(`SELECT COUNT(*) c FROM reminders WHERE created_at >= ?`, monthStart).c
const remindersSent = one(`SELECT COUNT(*) c FROM reminders WHERE status = 'sent'`).c
const plans = all(`SELECT s.plan_id, COUNT(*) c FROM subscriptions s GROUP BY s.plan_id ORDER BY c DESC`)
const feedback = all(`SELECT status, COUNT(*) c FROM feedback GROUP BY status`)
const docsWithDue = one(`SELECT COUNT(*) c FROM documents WHERE extraction IS NOT NULL AND json_extract(extraction,'$.due_date') IS NOT NULL`).c

console.log('=== METRIK BETA ORBIT (docs/06 validasi pasar) ===')
console.log(`Periode: ${nowIso}`)
console.log('')
console.log('--- Akuisisi & aktivasi ---')
console.log(`Pengguna aktif             : ${users}`)
console.log(`Diaktifkan (≥1 dokumen)    : ${activatedUsers} (${users ? Math.round((activatedUsers / users) * 100) : 0}%)`)
console.log(`Weekly active (7 hari)     : ${weeklyActive} (${users ? Math.round((weeklyActive / users) * 100) : 0}%)`)
console.log('')
console.log('--- Konten & kualitas ekstraksi ---')
console.log(`Dokumen total              : ${docsTotal}`)
for (const s of docsStatus) console.log(`  ${s.processing_status.padEnd(14)}: ${s.c}`)
console.log(`Ekstraksi confidence ≥0.8  : ${extractionAll.ok}/${extractionAll.c}`)
console.log(`Dokumen ber-jatuh tempo    : ${docsWithDue}`)
console.log('')
console.log('--- Pemakaian (proxy docs/06) ---')
console.log(`Pencarian (hybrid) bulan ini: ${searchesMonth}`)
console.log(`Jawaban AI bulan ini       : ${answersMonth} (total ${answersTotal})`)
console.log(`Pengingat dibuat bulan ini : ${remindersMonth} (terkirim total ${remindersSent})`)
console.log('Approval:', approvals.map((a) => `${a.status}=${a.c}`).join(' · ') || 'kosong')
console.log('Paket:', plans.map((p) => `${p.plan_id}=${p.c}`).join(' · '))
console.log('')
console.log('--- Umpan balik beta ---')
console.log(feedback.length ? feedback.map((f) => `${f.status}=${f.c}`).join(' · ') : 'belum ada')
db.close()

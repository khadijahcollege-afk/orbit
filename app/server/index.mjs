/* ============================================================
   ORBIT server — HTTP API v1 (node:http, tanpa dependensi).
   Kontrak mengikuti api/openapi-v1-complete.yaml (blueprint).
   Static: menyajikan ../dist bila ada (single-process deploy).
   Jalankan: node server/index.mjs  (default port 8787)
   ============================================================ */
import http from 'node:http'
import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// .env loader ringan (tanpa dependensi): isi env yang BELUM ada di process.env
for (const line of (() => {
  try {
    return readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'), 'utf8').split('\n')
  } catch {
    return []
  }
})()) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
import { db, now, uuid, storageDir, logActivity, logUsage, getLimits, getSubscription, usageThisMonth, monthStart, ensureSubscriptions } from './db.mjs'
import {
  authenticate, requireMembership, createSession, destroySession,
  hashPassword, verifyPassword, registerUser, HttpError,
} from './auth.mjs'
import { withFallback, getProvider, getCooldowns } from './ai/index.mjs'
import { activeProvider, createCheckout, verifyMidtransSignature, midtransStatusToOrder } from './payments.mjs'
import { hybridSearch, processDocument } from './pipeline.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(here, '..', 'dist')
const PORT = Number(process.env.PORT || 8787)
const MAX_UPLOAD = 26_214_400 // 25 MB — sesuai kontrak

const idempotency = new Map() // key -> { status, body } (MVP: in-memory)

/* ---------------- helpers ---------------- */

function json(res, status, body) {
  const buf = Buffer.from(JSON.stringify(body))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': buf.length,
  })
  res.end(buf)
}

/* CORS (doc 06 M7: mobile/Expo web preview) — auth memakai Bearer, bukan cookie,
   jadi origin default '*' aman untuk demo; CORS_ORIGIN mempersempit bila perlu. */
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
const corsHeaders = {
  'access-control-allow-origin': CORS_ORIGIN,
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,authorization,x-request-id,idempotency-key',
  'access-control-max-age': '86400',
}

function fail(res, err) {
  if (err instanceof HttpError) {
    json(res, err.status, { error: { code: err.code, message: err.message, ...err.extra } })
  } else {
    console.error(err)
    json(res, 500, { error: { code: 'internal_error', message: 'Kesalahan server', request_id: uuid() } })
  }
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) {
        reject(new HttpError(413, 'payload_too_large', 'Body melewati batas'))
        req.destroy()
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    throw new HttpError(400, 'validation_error', 'Body bukan JSON valid')
  }
}

const rateBuckets = new Map()
function rateLimit(key, cap, windowMs) {
  const t = Date.now()
  const b = rateBuckets.get(key) || { count: 0, reset: t + windowMs }
  if (t > b.reset) { b.count = 0; b.reset = t + windowMs }
  b.count += 1
  rateBuckets.set(key, b)
  if (b.count > cap) {
    throw new HttpError(429, 'rate_limited', 'Kuota melewati batas', { retry_after_ms: b.reset - t })
  }
}

function requireUser(req) {
  const user = authenticate(req)
  if (!user) throw new HttpError(401, 'unauthorized', 'Token tidak ada atau kedaluwarsa')
  return user
}

function requireWs(user, url, minRole = 'viewer') {
  const wsId = url.searchParams.get('workspace_id')
  if (!wsId) throw new HttpError(400, 'validation_error', 'workspace_id wajib')
  const role = requireMembership(user.id, wsId, minRole)
  if (!role) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace / peran kurang')
  return wsId
}

/** SQLite 'YYYY-MM-DD HH:MM:SS' → ISO 8601; nilai sudah-ISO dibiarkan utuh */
const iso = (s) => {
  if (!s) return s
  if (s.includes('T')) return s.endsWith('Z') ? s : `${s}Z`
  return `${s.replace(' ', 'T')}Z`
}

function docOut(row) {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    title: row.title,
    description: row.description,
    file_type: row.file_type,
    file_size: row.file_size,
    category: row.category,
    processing_status: row.processing_status,
    processing_error: row.processing_error,
    source_type: row.source_type,
    extraction: row.extraction ? JSON.parse(row.extraction) : null,
    confirmed: row.confirmed === 1,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  }
}

function taskOut(r) {
  return {
    ...r,
    due_at: r.due_at ?? null,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
  }
}

/* ---------------- seed demo ---------------- */

function seed() {
  ensureSubscriptions()
  const anyUser = db.prepare('SELECT 1 FROM users LIMIT 1').get()
  if (!anyUser) {
    const { userId, workspaceId } = registerUser({
      email: 'demo@orbit.id', password: 'orbit12345', full_name: 'Andi Pratama',
    })
    const put = (title, file) => {
      const id = uuid()
      const filePath = `${id}${path.extname(file)}`
      const content = readFileSync(path.join(here, 'seed', file), 'utf8')
      writeFileSync(path.join(storageDir, filePath), content)
      db.prepare(
        `INSERT INTO documents (id, workspace_id, uploaded_by, title, file_path, file_type, file_size, source_type, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'upload', '{}')`,
      ).run(id, workspaceId, userId, title, filePath, path.extname(file).slice(1), content.length)
      return id
    }
    const ids = [
      put('Kontrak Sewa Rumah', 'kontrak-sewa.txt'),
      put('Kuitansi transfer deposit', 'kuitansi-deposit.txt'),
      put('Invoice internet FirstMedia', 'invoice-internet.txt'),
      put('Voice note Ibu (transkrip)', 'voice-note-ibu.txt'),
    ]
    processDocument(ids[0]); processDocument(ids[1]); processDocument(ids[2]); processDocument(ids[3])
    console.log('[seed] akun demo dibuat: demo@orbit.id / orbit12345')
  }
  // Demo naik ke Plus trial (13 hari) — mengilustrasikan paket berbayar
  const demo = db.prepare('SELECT id FROM users WHERE email = ?').get('demo@orbit.id')
  if (demo) {
    const wsDemo = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ? LIMIT 1').get(demo.id)
    if (wsDemo) {
      const sub = getSubscription(wsDemo.workspace_id)
      if (sub && sub.plan_id === 'free') {
        db.prepare(
          `UPDATE subscriptions SET plan_id = 'plus', status = 'trialing', current_period_end = ?, updated_at = ? WHERE id = ?`,
        ).run(new Date(Date.now() + 13 * 864e5).toISOString(), now(), sub.id)
        console.log('[seed] demo diupgrade ke Plus trial 13 hari')
      }
    }
  }
}

/* ---------------- routes ---------------- */

/** @type {Array<{m:string|RegExp, h:(req,res,ctx)=>Promise<void>}>} */
const routes = []
function route(pattern, handler) { routes.push({ pattern, handler }) }

route(/^\/api\/v1\/health$/, (req, res) => {
  const tryCount = (sql) => {
    try {
      return db.prepare(sql).get().c
    } catch {
      return -1
    }
  }
  json(res, 200, {
    ok: true,
    db: 'ok',
    uptime_s: Math.round(process.uptime()),
    ai_provider: getProvider().id,
    ai_cooldowns: getCooldowns(),
    counts: {
      users: tryCount('SELECT COUNT(*) c FROM users'),
      documents: tryCount('SELECT COUNT(*) c FROM documents'),
      chunks: tryCount('SELECT COUNT(*) c FROM document_chunks'),
      reminders_scheduled: tryCount("SELECT COUNT(*) c FROM reminders WHERE status = 'scheduled'"),
    },
  })
})

/* ---- auth ---- */
route(/^\/api\/v1\/auth\/register$/, async (req, res) => {
  rateLimit(`reg:${req.socket.remoteAddress}`, 10, 60_000)
  const body = await readJson(req)
  const { email, password, full_name } = body
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(400, 'validation_error', 'Email tidak valid', { fields: { email: 'format email' } })
  if (!password || password.length < 8) throw new HttpError(400, 'validation_error', 'Password minimal 8 karakter', { fields: { password: 'min 8 karakter' } })
  if (!full_name) throw new HttpError(400, 'validation_error', 'Nama wajib', { fields: { full_name: 'wajib' } })
  const { userId, workspaceId } = registerUser(body)
  const session = createSession(userId)
  logActivity(workspaceId, userId, 'account.registered', 'user', userId)
  json(res, 201, { token: session.token, expires_at: session.expires_at, user: db.prepare('SELECT id, email, full_name, locale, timezone FROM users WHERE id = ?').get(userId), workspace_id: workspaceId })
})

route(/^\/api\/v1\/auth\/login$/, async (req, res) => {
  rateLimit(`login:${req.socket.remoteAddress}`, 20, 60_000)
  const { email, password } = await readJson(req)
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(String(email || ''))
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    throw new HttpError(401, 'unauthorized', 'Email atau password salah')
  }
  const session = createSession(user.id)
  const ws = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ? LIMIT 1').get(user.id)
  json(res, 200, { token: session.token, expires_at: session.expires_at, user: { id: user.id, email: user.email, full_name: user.full_name, locale: user.locale, timezone: user.timezone, onboarded_at: user.onboarded_at ?? null }, workspace_id: ws?.workspace_id })
})

route(/^\/api\/v1\/auth\/logout$/, async (req, res) => {
  const h = req.headers['authorization'] || ''
  if (h.startsWith('Bearer ')) destroySession(h.slice(7).trim())
  json(res, 204, {})
})

/* ---- users ---- */
route(/^\/api\/v1\/users\/me$/, async (req, res) => {
  const user = requireUser(req)
  if (req.method === 'GET') {
    const ws = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ? LIMIT 1').get(user.id)
    json(res, 200, { id: user.id, email: user.email, full_name: user.full_name, avatar_url: null, locale: user.locale, timezone: user.timezone, onboarded_at: user.onboarded_at ?? null, workspace_id: ws?.workspace_id })
    return
  }
  if (req.method === 'PATCH') {
    const b = await readJson(req)
    db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), locale = COALESCE(?, locale), timezone = COALESCE(?, timezone), updated_at = ? WHERE id = ?')
      .run(b.full_name ?? null, b.locale ?? null, b.timezone ?? null, now(), user.id)
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
    json(res, 200, { id: u.id, email: u.email, full_name: u.full_name, locale: u.locale, timezone: u.timezone, onboarded_at: u.onboarded_at ?? null })
    return
  }
  throw new HttpError(405, 'validation_error', 'Method tidak didukung')
})

/* Onboarding (docs/08 Product): pilih zona waktu & bahasa saat pertama masuk. */
route(/^\/api\/v1\/users\/me\/onboarding$/, async (req, res) => {
  const user = requireUser(req)
  if (req.method !== 'POST') throw new HttpError(405, 'validation_error', 'Method tidak didukung')
  const b = await readJson(req)
  const tz = String(b.timezone || 'Asia/Jakarta')
  const known = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC']
  if (!known.includes(tz)) throw new HttpError(400, 'validation_error', 'timezone tidak dikenal', { fields: { timezone: `salah satu dari: ${known.join(', ')}` } })
  const locale = ['id-ID', 'en'].includes(String(b.locale)) ? String(b.locale) : 'id-ID'
  const notif = b.notification_optin === true
  db.prepare('UPDATE users SET timezone = ?, locale = ?, onboarded_at = ?, updated_at = ? WHERE id = ?').run(tz, locale, now(), now(), user.id)
  logActivity(null, user.id, 'account.onboarded', 'user', user.id, { timezone: tz, notification_optin: notif })
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id)
  json(res, 200, { id: u.id, email: u.email, full_name: u.full_name, locale: u.locale, timezone: u.timezone, onboarded_at: u.onboarded_at, notification_optin: notif })
})

/* ---- documents ---- */
route(/^\/api\/v1\/documents$/, async (req, res, ctx) => {
  const user = requireUser(req)
  if (req.method === 'GET') {
    const url = ctx.url
    const wsId = requireWs(user, url)
    const status = url.searchParams.get('status')
    const limit = Math.min(Number(url.searchParams.get('limit') || 20), 100)
    const rows = db.prepare(
      `SELECT * FROM documents WHERE workspace_id = ? ${status ? 'AND processing_status = ?' : ''} ORDER BY created_at DESC LIMIT ?`,
    ).all(...(status ? [wsId, status, limit] : [wsId, limit]))
    json(res, 200, { data: rows.map(docOut), next_cursor: rows.length === limit ? rows.at(-1).created_at : null })
    return
  }
  if (req.method === 'POST') {
    rateLimit(`doc:${user.id}`, 60, 60_000)
    const idem = req.headers['idempotency-key']
    if (idem && idempotency.has(`doc:${idem}`)) { json(res, ...idempotency.get(`doc:${idem}`)); return }
    const b = await readJson(req)
    const { workspace_id: wsId, title, file_type, file_size } = b
    if (!wsId || !title || !file_type || !file_size) throw new HttpError(400, 'validation_error', 'workspace_id, title, file_type, file_size wajib', { fields: { workspace_id: 'wajib', title: 'wajib', file_type: 'wajib', file_size: 'wajib' } })
    const role = requireMembership(user.id, wsId, 'member')
    if (!role) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace / peran kurang')
    if (Number(file_size) > MAX_UPLOAD) throw new HttpError(413, 'payload_too_large', 'Melewati batas 25 MB')
    // Kuota dokumen per paket (doc 07)
    const { limits, sub } = getLimits(wsId)
    const docCount = db.prepare('SELECT COUNT(*) c FROM documents WHERE workspace_id = ?').get(wsId).c
    if (docCount >= limits.documents) {
      throw new HttpError(429, 'rate_limited', `Kuota dokumen habis untuk paket ${sub.plan_name} (${limits.documents} dokumen). Upgrade ke Plus untuk 2000 dokumen.`)
    }
    // Ekstensi dari MIME type (TEXTUAL pipeline butuh .txt/.md/.csv/.json)
    const MIME_EXT = {
      'text/plain': 'txt', 'text/markdown': 'md', 'text/csv': 'csv', 'application/json': 'json',
      'application/pdf': 'pdf', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
    }
    const ext = MIME_EXT[String(file_type).toLowerCase()] || 'bin'
    const id = uuid()
    const filePath = `${id}.${ext}`
    db.prepare(
      `INSERT INTO documents (id, workspace_id, uploaded_by, title, description, file_path, file_type, file_size, source_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, wsId, user.id, String(title), b.description ?? null, filePath, String(file_type), Number(file_size), b.source_type || 'upload')
    logActivity(wsId, user.id, 'document.created', 'document', id)
    const out = docOut(db.prepare('SELECT * FROM documents WHERE id = ?').get(id))
    const payload = [201, {
      ...out,
      upload: { url: `/api/v1/uploads/${id}`, method: 'PUT', expires_at: new Date(Date.now() + 15 * 60_000).toISOString() },
    }]
    if (idem) idempotency.set(`doc:${idem}`, payload)
    json(res, ...payload)
    return
  }
  throw new HttpError(405, 'validation_error', 'Method tidak didukung')
})

// PUT bytes mentah ke storage privat (signed URL MVP: id dokumen + sesi)
route(/^\/api\/v1\/uploads\/([0-9a-f-]{36})$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(ctx.params[0])
  if (!doc) throw new HttpError(404, 'not_found', 'Dokumen tidak ada')
  if (doc.workspace_id && !requireMembership(user.id, doc.workspace_id, 'member')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')
  const buf = await readBody(req, MAX_UPLOAD)
  if (buf.length === 0) throw new HttpError(400, 'validation_error', 'File kosong')
  // Validasi konten (doc 05): jpg/png/pdf magic bytes; teks dipindai menyeluruh
  // (NUL / kontrol di mana pun = biner, mencegah polyglot lolos sebagai .txt).
  const sig = buf.subarray(0, 4)
  const isJpg = sig[0] === 0xff && sig[1] === 0xd8
  const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47
  const isPdf = sig.toString('latin1').startsWith('%PDF')
  const looksTextual = (() => {
    // byte ≥ 128 diperbolehkan (UTF-8 multi-byte); NUL + kontrol non-utks = biner
    for (const b of buf) {
      if (b === 0) return false
      if (b < 32 && b !== 9 && b !== 10 && b !== 13) return false
    }
    return true
  })()
  if (!isJpg && !isPng && !isPdf && !looksTextual) {
    throw new HttpError(400, 'validation_error', 'Tipe file tidak didukung (jpg/png/pdf/teks)')
  }
  mkdirSync(storageDir, { recursive: true })
  writeFileSync(path.join(storageDir, doc.file_path), buf)
  db.prepare(`UPDATE documents SET file_size = ?, processing_status = 'queued', updated_at = ? WHERE id = ?`)
    .run(buf.length, now(), doc.id)
  processDocument(doc.id)
  json(res, 202, { ok: true, status: 'queued' })
})

route(/^\/api\/v1\/documents\/([0-9a-f-]{36})$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(ctx.params[0])
  if (!doc || !requireMembership(user.id, doc.workspace_id, 'viewer')) throw new HttpError(404, 'not_found', 'Dokumen tidak ada atau bukan milik workspace')
  if (req.method === 'GET') {
    const out = docOut(doc)
    const entities = db.prepare(
      `SELECT e.id, e.entity_type, e.name FROM document_entities de JOIN entities e ON e.id = de.entity_id WHERE de.document_id = ?`,
    ).all(doc.id)
    json(res, 200, { ...out, entities })
    return
  }
  if (req.method === 'DELETE') {
    rmSync(path.join(storageDir, doc.file_path), { force: true })
    db.prepare('DELETE FROM documents WHERE id = ?').run(doc.id)
    logActivity(doc.workspace_id, user.id, 'document.deleted', 'document', doc.id)
    json(res, 204, {})
    return
  }
  throw new HttpError(405, 'validation_error', 'Method tidak didukung')
})

route(/^\/api\/v1\/documents\/([0-9a-f-]{36})\/process$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(ctx.params[0])
  if (!doc || !requireMembership(user.id, doc.workspace_id, 'member')) throw new HttpError(404, 'not_found', 'Dokumen tidak ada')
  if (!doc.file_path || !existsSync(path.join(storageDir, doc.file_path))) {
    throw new HttpError(409, 'conflict', 'File belum diunggah')
  }
  db.prepare(`UPDATE documents SET processing_status = 'queued', updated_at = ? WHERE id = ?`).run(now(), doc.id)
  processDocument(doc.id)
  json(res, 202, { document: docOut(db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id)) })
})

route(/^\/api\/v1\/documents\/([0-9a-f-]{36})\/confirm-extraction$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(ctx.params[0])
  if (!doc || !requireMembership(user.id, doc.workspace_id, 'member')) throw new HttpError(404, 'not_found', 'Dokumen tidak ada')
  const b = await readJson(req)
  if (typeof b.approved !== 'boolean') throw new HttpError(400, 'validation_error', 'approved (boolean) wajib')
  let extraction = doc.extraction ? JSON.parse(doc.extraction) : null
  if (b.corrected) {
    if (extraction) extraction = { ...extraction, ...b.corrected, _ai_original: { confidence: extraction.confidence } }
    else extraction = { ...b.corrected }
  }
  const status = b.approved ? 'completed' : 'needs_review'
  db.prepare(`UPDATE documents SET extraction = ?, processing_status = ?, confirmed = ?, updated_at = ? WHERE id = ?`)
    .run(extraction ? JSON.stringify(extraction) : null, status, b.approved ? 1 : 0, now(), doc.id)
  logActivity(doc.workspace_id, user.id, 'document.confirmed', 'document', doc.id, { approved: b.approved })
  json(res, 200, docOut(db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id)))
})

/* ---- memory ---- */

/* Graf pengetahuan (eksperimen, di luar 8 modul blueprint): entitas hasil
   pipeline + tautan ke dokumen, workspace-scoped. Kecil (≤60 entitas) agar
   ringan digambar di frontend. */
route(/^\/api\/v1\/graph$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const wsId = requireWs(user, ctx.url)
  const entities = db
    .prepare(
      `SELECT e.id, e.entity_type, e.name, COUNT(de.document_id) deg
       FROM entities e LEFT JOIN document_entities de ON de.entity_id = e.id
       WHERE e.workspace_id = ?
       GROUP BY e.id ORDER BY deg DESC, e.name LIMIT 60`,
    )
    .all(wsId)
  const ids = entities.map((e) => e.id)
  let edges = []
  const docs = db
    .prepare(
      `SELECT DISTINCT d.id, d.title, d.processing_status
       FROM documents d JOIN document_entities de ON de.document_id = d.id
       WHERE d.workspace_id = ? AND de.entity_id IN (${ids.map(() => '?').join(',') || "''"})
       ORDER BY d.created_at DESC LIMIT 40`,
    )
    .all(wsId, ...ids)
  if (ids.length) {
    edges = db
      .prepare(`SELECT document_id, entity_id FROM document_entities WHERE entity_id IN (${ids.map(() => '?').join(',')})`)
      .all(...ids)
  }
  json(res, 200, {
    nodes: [
      ...entities.map((e) => ({ id: `e:${e.id}`, type: 'entity', entity_type: e.entity_type, label: e.name, degree: e.deg })),
      ...docs.map((d) => ({ id: `d:${d.id}`, type: 'document', label: d.title, processing_status: d.processing_status })),
    ],
    edges: edges.map((l) => ({ source: `d:${l.document_id}`, target: `e:${l.entity_id}` })),
  })
})
route(/^\/api\/v1\/memory\/search$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const url = ctx.url
  const wsId = requireWs(user, url)
  rateLimit(`mem:${user.id}`, 60, 60_000)
  const q = url.searchParams.get('q')
  if (!q) throw new HttpError(400, 'validation_error', 'q wajib')
  const mode = url.searchParams.get('mode') || 'hybrid'
  const limit = Math.min(Number(url.searchParams.get('limit') || 10), 50)
  const hits = hybridSearch({ workspaceId: wsId, query: q, mode, limit })
  logUsage(wsId, user.id, 'rerank')
  json(res, 200, {
    data: hits.map((h) => ({
      document_id: h.document_id,
      chunk_id: h.id,
      title: h.title,
      snippet: h.content.slice(0, 240),
      score: Number(h.score.toFixed(4)),
      source: { created_at: h.created_at },
    })),
  })
})

/* ---- assistant ---- */
route(/^\/api\/v1\/assistant\/chat$/, async (req, res) => {
  const user = requireUser(req)
  rateLimit(`ai:${user.id}`, 20, 60_000)
  const b = await readJson(req)
  const { workspace_id: wsId, message } = b
  if (!wsId || !message) throw new HttpError(400, 'validation_error', 'workspace_id dan message wajib')
  if (!requireMembership(user.id, wsId, 'member')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')

  // Kuota AI per paket (doc 07: Free tanpa AI; Plus 100 jawaban/bulan)
  const { limits, sub } = getLimits(wsId)
  const used = usageThisMonth(wsId, 'answer')
  if (used >= limits.ai_answers_month) {
    throw new HttpError(429, 'rate_limited',
      `Kuota AI habis untuk paket ${sub.plan_name} (${limits.ai_answers_month} jawaban/bulan). Upgrade ke Plus untuk 100 jawaban/bulan.`,
      { retry_after_ms: null },
    )
  }

  let conversationId = b.conversation_id
  if (conversationId) {
    const conv = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId)
    if (!conv || conv.workspace_id !== wsId) throw new HttpError(404, 'not_found', 'Percakapan tidak ada')
  } else {
    conversationId = uuid()
    db.prepare('INSERT INTO conversations (id, workspace_id, created_by, title) VALUES (?, ?, ?, ?)')
      .run(conversationId, wsId, user.id, String(message).slice(0, 60))
  }
  db.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
    .run(uuid(), conversationId, 'user', String(message).slice(0, 10000))

  // RAG: retrieval workspace-scoped (doc 04) + due_date dari hasil ekstraksi
  const hits = hybridSearch({ workspaceId: wsId, query: String(message), mode: 'hybrid', limit: 5 })
  const context = hits.map((h) => {
    const d = db.prepare('SELECT extraction FROM documents WHERE id = ?').get(h.document_id)
    const ex = d?.extraction ? JSON.parse(d.extraction) : null
    return { id: h.id, document_id: h.document_id, workspace_id: wsId, title: h.title, content: h.content, due_date: ex?.due_date || null, score: h.score }
  })
  const answer = await withFallback('answerQuestion', { question: message, context })
  if (!answer) throw new HttpError(503, 'ai_unavailable', 'Semua provider AI gagal')
  logUsage(wsId, user.id, 'answer')

  // Usulan aksi → approval queue (doc 04: model tidak menulis bebas)
  const approvals = []
  for (const action of answer.suggested_actions || []) {
    const aid = uuid()
    db.prepare(
      `INSERT INTO ai_approvals (id, workspace_id, user_id, action_type, payload, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(aid, wsId, user.id, action.type, JSON.stringify(action.payload), new Date(Date.now() + 7 * 864e5).toISOString())
    approvals.push({ id: aid, action_type: action.type, status: 'pending' })
  }

  const messageId = uuid()
  db.prepare('INSERT INTO messages (id, conversation_id, role, content, citations, metadata) VALUES (?, ?, ?, ?, ?, ?)')
    .run(messageId, conversationId, 'assistant', answer.answer, JSON.stringify(answer.citations || []), JSON.stringify({ insufficient_data: answer.insufficient_data === true }))

  json(res, 200, {
    conversation_id: conversationId,
    message_id: messageId,
    answer: answer.answer,
    insufficient_data: answer.insufficient_data === true,
    citations: answer.citations || [],
    approvals,
  })
})

/* ---- tasks / events / reminders ---- */
route(/^\/api\/v1\/tasks$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const url = ctx.url
  if (req.method === 'GET') {
    const wsId = requireWs(user, url)
    const rows = db.prepare('SELECT * FROM tasks WHERE workspace_id = ? ORDER BY due_at IS NULL, due_at LIMIT 100').all(wsId)
    json(res, 200, { data: rows.map(taskOut) })
    return
  }
  if (req.method === 'POST') {
    const idem = req.headers['idempotency-key']
    if (idem && idempotency.has(`task:${idem}`)) { json(res, ...idempotency.get(`task:${idem}`)); return }
    const b = await readJson(req)
    const wsId = b.workspace_id
    if (!wsId || !b.title) throw new HttpError(400, 'validation_error', 'workspace_id dan title wajib')
    if (!requireMembership(user.id, wsId, 'member')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')
    const id = uuid()
    db.prepare(
      `INSERT INTO tasks (id, workspace_id, event_id, created_by, title, description, status, priority, due_at, source_document_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, wsId, b.event_id ?? null, user.id, String(b.title), b.description ?? null, b.status || 'pending', b.priority || 'normal', b.due_at ?? null, b.source_document_id ?? null)
    const payload = [201, taskOut(db.prepare('SELECT * FROM tasks WHERE id = ?').get(id))]
    if (idem) idempotency.set(`task:${idem}`, payload)
    json(res, ...payload)
    return
  }
  throw new HttpError(405, 'validation_error', 'Method tidak didukung')
})

route(/^\/api\/v1\/tasks\/([0-9a-f-]{36})$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(ctx.params[0])
  if (!task || !requireMembership(user.id, task.workspace_id, 'member')) throw new HttpError(404, 'not_found', 'Tugas tidak ada')
  const b = await readJson(req)
  db.prepare(
    `UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status), priority = COALESCE(?, priority), due_at = COALESCE(?, due_at), updated_at = ? WHERE id = ?`,
  ).run(b.title ?? null, b.description ?? null, b.status ?? null, b.priority ?? null, b.due_at ?? null, now(), task.id)
  json(res, 200, taskOut(db.prepare('SELECT * FROM tasks WHERE id = ?').get(task.id)))
})

route(/^\/api\/v1\/events$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const url = ctx.url
  if (req.method === 'GET') {
    const wsId = requireWs(user, url)
    const rows = db.prepare('SELECT * FROM events WHERE workspace_id = ? ORDER BY created_at DESC').all(wsId)
    const prog = db.prepare(`SELECT
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) done,
      COUNT(*) total FROM tasks WHERE event_id = ?`)
    json(res, 200, {
      data: rows.map((r) => {
        const p = prog.get(r.id)
        return {
          ...r,
          start_at: iso(r.start_at),
          end_at: iso(r.end_at),
          created_at: iso(r.created_at),
          updated_at: iso(r.updated_at),
          task_progress: { done: p.done || 0, total: p.total || 0 },
        }
      }),
    })
    return
  }
  if (req.method === 'POST') {
    const b = await readJson(req)
    const wsId = b.workspace_id
    if (!wsId || !b.title) throw new HttpError(400, 'validation_error', 'workspace_id dan title wajib')
    if (!requireMembership(user.id, wsId, 'member')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')
    const id = uuid()
    db.prepare(
      `INSERT INTO events (id, workspace_id, created_by, title, description, event_type, start_at, end_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, wsId, user.id, String(b.title), b.description ?? null, b.event_type ?? null, b.start_at ?? null, b.end_at ?? null)
    json(res, 201, {
      ...db.prepare('SELECT * FROM events WHERE id = ?').get(id),
      start_at: iso(b.start_at),
      end_at: iso(b.end_at),
      task_progress: { done: 0, total: 0 },
    })
    return
  }
  throw new HttpError(405, 'validation_error', 'Method tidak didukung')
})

route(/^\/api\/v1\/reminders$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const url = ctx.url
  if (req.method === 'GET') {
    const wsId = requireWs(user, url)
    const rows = db.prepare('SELECT * FROM reminders WHERE workspace_id = ? ORDER BY scheduled_at LIMIT 100').all(wsId)
    json(res, 200, {
      data: rows.map((r) => ({ ...r, scheduled_at: iso(r.scheduled_at), created_at: iso(r.created_at) })),
    })
    return
  }
  if (req.method === 'POST') {
    const idem = req.headers['idempotency-key']
    if (idem && idempotency.has(`rem:${idem}`)) { json(res, ...idempotency.get(`rem:${idem}`)); return }
    const b = await readJson(req)
    const wsId = b.workspace_id
    if (!wsId || !b.title || !b.scheduled_at) throw new HttpError(400, 'validation_error', 'workspace_id, title, scheduled_at wajib')
    if (!requireMembership(user.id, wsId, 'member')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')
    // Validasi tanggal sebelum disimpan (prinsip blueprint: pengingat salah)
    const at = new Date(b.scheduled_at)
    if (Number.isNaN(at.getTime())) throw new HttpError(400, 'validation_error', 'scheduled_at bukan ISO 8601')
    // Kuota pengingat bulanan per paket ("pengingat terbatas" di Free)
    const { limits, sub } = getLimits(wsId)
    const remUsed = db
      .prepare(`SELECT COUNT(*) c FROM reminders WHERE workspace_id = ? AND created_at >= ?`)
      .get(wsId, monthStart()).c
    if (remUsed >= limits.reminders_month) {
      throw new HttpError(429, 'rate_limited', `Kuota pengingat habis untuk paket ${sub.plan_name} (${limits.reminders_month}/bulan). Upgrade ke Plus untuk 100/bulan.`)
    }
    const id = uuid()
    db.prepare('INSERT INTO reminders (id, workspace_id, task_id, title, scheduled_at) VALUES (?, ?, ?, ?, ?)')
      .run(id, wsId, b.task_id ?? null, String(b.title), at.toISOString())
    const payload = [201, { ...db.prepare('SELECT * FROM reminders WHERE id = ?').get(id), scheduled_at: at.toISOString(), created_at: now() }]
    if (idem) idempotency.set(`rem:${idem}`, payload)
    json(res, ...payload)
    return
  }
  throw new HttpError(405, 'validation_error', 'Method tidak didukung')
})

/* ---- approvals ---- */
route(/^\/api\/v1\/approvals\/([0-9a-f-]{36})\/(approve|reject)$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const approval = db.prepare('SELECT * FROM ai_approvals WHERE id = ?').get(ctx.params[0])
  if (!approval || !requireMembership(user.id, approval.workspace_id, 'viewer')) throw new HttpError(404, 'not_found', 'Approval tidak ada')
  if (approval.user_id !== user.id) throw new HttpError(403, 'forbidden', 'Bukan pemilik approval ini')
  if (approval.status !== 'pending') throw new HttpError(409, 'conflict', 'Approval sudah diputuskan')

  const decision = ctx.params[1]
  let note = null
  if (decision === 'approve') {
    const payload = JSON.parse(approval.payload)
    if (approval.action_type === 'create_task') {
      const id = uuid()
      db.prepare(`INSERT INTO tasks (id, workspace_id, created_by, title, due_at) VALUES (?, ?, ?, ?, ?)`)
        .run(id, approval.workspace_id, user.id, String(payload.title || 'Tugas dari assistant'), payload.due_at ?? null)
      note = `Task dibuat: ${payload.title}`
    } else if (approval.action_type === 'create_reminder') {
      const at = new Date(payload.scheduled_at)
      if (Number.isNaN(at.getTime())) {
        db.prepare(`UPDATE ai_approvals SET status = 'failed', execution_note = ?, decided_at = ? WHERE id = ?`)
          .run('scheduled_at tidak valid', now(), approval.id)
        throw new HttpError(400, 'validation_error', 'scheduled_at tidak valid — approval ditandai gagal')
      }
      const id = uuid()
      db.prepare(`INSERT INTO reminders (id, workspace_id, title, scheduled_at) VALUES (?, ?, ?, ?)`)
        .run(id, approval.workspace_id, String(payload.title || 'Pengingat'), at.toISOString())
      note = `Pengingat dibuat untuk ${at.toISOString()}`
    } else if (approval.action_type === 'create_event') {
      const id = uuid()
      db.prepare(`INSERT INTO events (id, workspace_id, created_by, title) VALUES (?, ?, ?, ?)`)
        .run(id, approval.workspace_id, user.id, String(payload.title || 'Event'))
      note = `Event dibuat: ${payload.title}`
    } else {
      note = 'Tipe aksi eksternal tidak dieksekusi otomatis (butuh integrasi)'
    }
    db.prepare(`UPDATE ai_approvals SET status = 'executed', execution_note = ?, decided_at = ? WHERE id = ?`)
      .run(note, now(), approval.id)
  } else {
    const b = await readJson(req).catch(() => ({}))
    db.prepare(`UPDATE ai_approvals SET status = 'rejected', execution_note = ?, decided_at = ? WHERE id = ?`)
      .run(b.reason || 'Ditolak pengguna', now(), approval.id)
    note = 'Ditolak'
  }
  logActivity(approval.workspace_id, user.id, `approval.${decision}`, 'ai_approval', approval.id)
  const out = db.prepare('SELECT * FROM ai_approvals WHERE id = ?').get(approval.id)
  json(res, 200, { ...out, created_at: iso(out.created_at), decided_at: iso(out.decided_at), expires_at: iso(out.expires_at) })
})

route(/^\/api\/v1\/approvals$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const url = ctx.url
  const wsId = requireWs(user, url)
  const rows = db.prepare('SELECT * FROM ai_approvals WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50').all(wsId)
  json(res, 200, {
    data: rows.map((r) => ({
      ...r,
      payload: JSON.parse(r.payload),
      created_at: iso(r.created_at),
      decided_at: iso(r.decided_at),
      expires_at: iso(r.expires_at),
    })),
  })
})

/* ---- Life Event Engine (module 05: AI plan, dibuat atas permintaan pengguna) ---- */
route(/^\/api\/v1\/events\/generate-plan$/, async (req, res) => {
  const user = requireUser(req)
  const b = await readJson(req)
  const wsId = b.workspace_id
  const goal = String(b.goal || '').trim()
  if (!wsId || !goal) throw new HttpError(400, 'validation_error', 'workspace_id dan goal wajib')
  if (!requireMembership(user.id, wsId, 'member')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')
  rateLimit(`plan:${user.id}`, 10, 60_000)

  const plan = await withFallback('generatePlan', { goal })
  if (!plan) throw new HttpError(503, 'ai_unavailable', 'Semua provider AI gagal')
  logUsage(wsId, user.id, 'plan')

  const eventId = uuid()
  db.prepare(
    `INSERT INTO events (id, workspace_id, created_by, title, description, event_type, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
  ).run(eventId, wsId, user.id, plan.title, `Rencana dibuat dari: "${goal}"`, plan.event_type)
  const taskIds = []
  for (const step of plan.steps) {
    const tid = uuid()
    db.prepare(`INSERT INTO tasks (id, workspace_id, event_id, created_by, title) VALUES (?, ?, ?, ?, ?)`)
      .run(tid, wsId, eventId, user.id, step)
    taskIds.push(tid)
  }
  logActivity(wsId, user.id, 'event.plan_generated', 'event', eventId, { steps: plan.steps.length })
  json(res, 201, {
    event: { ...db.prepare('SELECT * FROM events WHERE id = ?').get(eventId), task_progress: { done: 0, total: taskIds.length } },
    tasks: db.prepare('SELECT * FROM tasks WHERE event_id = ?').all(eventId),
  })
})

/* ---- account: usage & paket ---- */
route(/^\/api\/v1\/account\/usage$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const url = ctx.url
  const wsId = url.searchParams.get('workspace_id')
  if (!wsId) throw new HttpError(400, 'validation_error', 'workspace_id wajib')
  if (!requireMembership(user.id, wsId, 'viewer')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')
  const { sub, limits } = getLimits(wsId)
  json(res, 200, {
    plan: { id: sub.plan_id, name: sub.plan_name, price_idr: sub.price_idr, status: sub.status, current_period_end: sub.current_period_end },
    limits,
    usage: {
      documents: db.prepare('SELECT COUNT(*) c FROM documents WHERE workspace_id = ?').get(wsId).c,
      answers_month: usageThisMonth(wsId, 'answer'),
      reminders_month: db
        .prepare(`SELECT COUNT(*) c FROM reminders WHERE workspace_id = ? AND created_at >= ?`)
        .get(wsId, monthStart()).c,
    },
  })
})

/* ---- billing: paket & pembayaran (doc 07 — freemium) ---- */

/** Aktifkan langganan setelah order terbayar (dipanggil hanya dari status verified). */
function applyPaidOrder(order) {
  const periodEnd = new Date(Date.now() + 30 * 86_400_000).toISOString()
  db.prepare(`UPDATE billing_orders SET status = 'paid', paid_at = ?, updated_at = ? WHERE id = ?`).run(now(), now(), order.id)
  const sub = db.prepare('SELECT id FROM subscriptions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1').get(order.workspace_id)
  if (sub) {
    db.prepare(`UPDATE subscriptions SET plan_id = ?, status = 'active', current_period_end = ?, updated_at = ? WHERE id = ?`).run(order.plan_id, periodEnd, now(), sub.id)
  } else {
    db.prepare(`INSERT INTO subscriptions (id, workspace_id, plan_id, status, current_period_end) VALUES (?, ?, ?, 'active', ?)`).run(uuid(), order.workspace_id, order.plan_id, periodEnd)
  }
  logActivity(order.workspace_id, order.user_id, 'billing.paid', 'subscription', order.id, { plan_id: order.plan_id, provider: order.provider })
}

function orderOut(o) {
  return { id: o.id, plan_id: o.plan_id, amount_idr: o.amount_idr, status: o.status, provider: o.provider, checkout_url: o.checkout_url, paid_at: o.paid_at, created_at: o.created_at }
}

route(/^\/api\/v1\/billing\/plans$/, async (req, res) => {
  const plans = db.prepare('SELECT id, name, price_idr, limits FROM plans ORDER BY price_idr').all()
  json(res, 200, { provider: activeProvider(), plans: plans.map((p) => ({ ...p, limits: JSON.parse(p.limits || '{}') })) })
})

route(/^\/api\/v1\/billing\/checkout$/, async (req, res) => {
  const user = requireUser(req)
  const body = await readJson(req)
  const wsId = body.workspace_id
  if (!wsId) throw new HttpError(400, 'validation_error', 'workspace_id wajib')
  if (!requireMembership(user.id, wsId, 'member')) throw new HttpError(403, 'forbidden', 'Bukan anggota workspace')
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(String(body.plan_id || ''))
  if (!plan || plan.price_idr <= 0) throw new HttpError(400, 'validation_error', 'plan_id tidak dikenal atau paket gratis')
  const sub = getSubscription(wsId)
  if (sub.plan_id === plan.id && sub.status === 'active') throw new HttpError(409, 'conflict', 'Paket ini sudah aktif')
  // pakai ulang order pending yang sama agar tidak menumpuk tagihan
  const pending = db.prepare(`SELECT id FROM billing_orders WHERE workspace_id = ? AND plan_id = ? AND status = 'pending'`).get(wsId, plan.id)
  const id = pending?.id || uuid()
  if (!pending) {
    db.prepare(`INSERT INTO billing_orders (id, workspace_id, user_id, plan_id, amount_idr, provider) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, wsId, user.id, plan.id, plan.price_idr, activeProvider())
  }
  const order = db.prepare('SELECT * FROM billing_orders WHERE id = ?').get(id)
  const checkout = await createCheckout(order, plan, user)
  db.prepare('UPDATE billing_orders SET checkout_url = ?, provider_ref = ?, updated_at = ? WHERE id = ?').run(checkout.checkout_url, checkout.provider_ref, now(), id)
  json(res, 201, {
    order: { ...orderOut(order), checkout_url: checkout.checkout_url },
    provider: checkout.provider,
    payment_url: checkout.provider === 'midtrans' ? checkout.checkout_url : null,
  })
})

route(/^\/api\/v1\/billing\/orders$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const wsId = requireWs(user, ctx.url)
  const orders = db.prepare('SELECT * FROM billing_orders WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 20').all(wsId)
  json(res, 200, { orders: orders.map(orderOut) })
})

/* Selesaikan order mock (simulasi pembayaran demo lokal). Tidak berlaku untuk
   provider nyata — pembayaran asli hanya lewat /billing/webhook. */
route(/^\/api\/v1\/billing\/orders\/([0-9a-f-]{36})\/mock-complete$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const order = db.prepare('SELECT * FROM billing_orders WHERE id = ?').get(ctx.params[0])
  if (!order || !requireMembership(user.id, order.workspace_id, 'member')) throw new HttpError(404, 'not_found', 'Order tidak dikenal')
  if (order.provider !== 'mock') throw new HttpError(409, 'conflict', 'Order bukan mock')
  if (order.status !== 'pending') throw new HttpError(409, 'conflict', `Order sudah ${order.status}`)
  const { outcome } = await readJson(req)
  if (outcome !== 'paid' && outcome !== 'failed' && outcome !== 'cancelled') {
    throw new HttpError(400, 'validation_error', "outcome harus 'paid' | 'failed' | 'cancelled'")
  }
  if (outcome === 'paid') applyPaidOrder(order)
  else db.prepare('UPDATE billing_orders SET status = ?, updated_at = ? WHERE id = ?').run(outcome, now(), order.id)
  json(res, 200, { order: orderOut(db.prepare('SELECT * FROM billing_orders WHERE id = ?').get(order.id)) })
})

/* Webhook provider pembayaran (tanpa sesi; diverifikasi signature Midtrans). */
route(/^\/api\/v1\/billing\/webhook$/, async (req, res) => {
  rateLimit(`hook:${req.socket.remoteAddress}`, 60, 60_000)
  const notif = await readJson(req)
  if (!verifyMidtransSignature(notif)) throw new HttpError(403, 'forbidden', 'Signature webhook tidak valid')
  const order = db.prepare('SELECT * FROM billing_orders WHERE id = ?').get(String(notif.order_id || ''))
  if (!order) throw new HttpError(404, 'not_found', 'Order tidak dikenal')
  const status = midtransStatusToOrder(notif.transaction_status, notif.fraud_status)
  if (status === 'paid' && order.status !== 'paid') applyPaidOrder(order)
  else if (status !== 'pending') db.prepare('UPDATE billing_orders SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), order.id)
  json(res, 200, { received: true, order_id: order.id, status })
})

/* ---- dashboard ---- */
route(/^\/api\/v1\/dashboard$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const wsId = requireWs(user, ctx.url)
  const priorities = db.prepare(`SELECT * FROM tasks WHERE workspace_id = ? AND status != 'completed' ORDER BY due_at IS NULL, due_at LIMIT 3`).all(wsId)
  const pendingApprovals = db.prepare(`SELECT COUNT(*) c FROM ai_approvals WHERE workspace_id = ? AND status = 'pending'`).get(wsId).c
  const dueSoon = db.prepare(`SELECT * FROM reminders WHERE workspace_id = ? AND status = 'scheduled' ORDER BY scheduled_at LIMIT 5`).all(wsId)
  const recentDocuments = db.prepare(`SELECT * FROM documents WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 5`).all(wsId)
  const activeEvents = db.prepare(`SELECT * FROM events WHERE workspace_id = ? AND status = 'active' LIMIT 5`).all(wsId)
  json(res, 200, {
    priorities: priorities.map(taskOut),
    pending_approvals: pendingApprovals,
    due_soon: dueSoon,
    recent_documents: recentDocuments.map(docOut),
    active_events: activeEvents,
    generated_at: now(),
  })
})

/* ---- account ---- */
route(/^\/api\/v1\/account\/export$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const id = uuid()
  const memberships = db.prepare('SELECT workspace_id FROM workspace_members WHERE user_id = ?').all(user.id)
  const data = { user: { id: user.id, email: user.email, full_name: user.full_name, locale: user.locale, timezone: user.timezone }, workspaces: [] }
  for (const m of memberships) {
    const wsId = m.workspace_id
    data.workspaces.push({
      workspace: db.prepare('SELECT id, name, type FROM workspaces WHERE id = ?').get(wsId),
      documents: db.prepare('SELECT id, title, category, processing_status, extraction, created_at FROM documents WHERE workspace_id = ?').all(wsId),
      tasks: db.prepare('SELECT id, title, status, due_at FROM tasks WHERE workspace_id = ?').all(wsId),
      reminders: db.prepare('SELECT id, title, scheduled_at, status FROM reminders WHERE workspace_id = ?').all(wsId),
      events: db.prepare('SELECT id, title, status FROM events WHERE workspace_id = ?').all(wsId),
    })
  }
  db.prepare('INSERT INTO exports (id, user_id, status, payload) VALUES (?, ?, ?, ?)').run(id, user.id, 'ready', JSON.stringify(data))
  json(res, 202, { export_id: id, status: 'ready', download_url: `/api/v1/account/export/${id}` })
})

route(/^\/api\/v1\/account\/export\/([0-9a-f-]{36})$/, async (req, res, ctx) => {
  const user = requireUser(req)
  const row = db.prepare('SELECT * FROM exports WHERE id = ? AND user_id = ?').get(ctx.params[0], user.id)
  if (!row) throw new HttpError(404, 'not_found', 'Ekspor tidak ada')
  json(res, 200, JSON.parse(row.payload))
})

/* ---- umpan balik beta (docs/08: beta user feedback channel) ---- */
route(/^\/api\/v1\/feedback$/, async (req, res) => {
  const user = requireUser(req)
  if (req.method === 'POST') {
    rateLimit(`fb:${user.id}`, 5, 3600_000) // maks 5/jam
    const b = await readJson(req)
    const message = String(b.message || '').trim()
    if (message.length < 1 || message.length > 2000) {
      throw new HttpError(400, 'validation_error', 'message wajib (1–2000 karakter)')
    }
    const context = b.context ? String(b.context).slice(0, 200) : null
    const id = uuid()
    db.prepare(`INSERT INTO feedback (id, user_id, message, context) VALUES (?, ?, ?, ?)`).run(id, user.id, message, context)
    logActivity(null, user.id, 'feedback.submitted', 'feedback', id)
    json(res, 201, { id, status: 'open', created_at: now() })
    return
  }
  if (req.method === 'GET') {
    const rows = db.prepare(`SELECT id, message, context, status, created_at FROM feedback WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`).all(user.id)
    json(res, 200, { data: rows })
    return
  }
  throw new HttpError(405, 'validation_error', 'Method tidak didukung')
})

route(/^\/api\/v1\/account$/, async (req, res) => {
  const user = requireUser(req)
  const b = await readJson(req)
  if (b.confirm_text !== 'HAPUS AKUN') throw new HttpError(400, 'validation_error', 'confirm_text harus "HAPUS AKUN"')
  // MVP: penghapusan langsung (tanpa masa tenggang) — data & file turunan
  // dibersihkan oleh kaskade FK; doc 05: kebijakan retensi utk produksi.
  db.prepare(`UPDATE users SET deleted_at = ? WHERE id = ?`).run(now(), user.id)
  for (const srow of db.prepare('SELECT token FROM sessions WHERE user_id = ?').all(user.id)) {
    destroySession(srow.token)
  }
  logActivity(null, user.id, 'account.deleted', 'user', user.id)
  json(res, 202, { scheduled_at: now(), cancel_until: null, note: 'MVP: penghapusan langsung, semua sesi dicabut' })
})

/* ---------------- static SPA + server ---------------- */

function serveStatic(res, filePath, contentType) {
  const stream = createReadStream(filePath)
  res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-cache' })
  stream.pipe(res)
  stream.on('error', () => res.end())
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const ctx = { url, params: [] }
  try {
    // CORS (doc 06 M7: mobile/Expo web) — auth via Bearer, bukan cookie.
    for (const [k, v] of Object.entries(corsHeaders)) res.setHeader(k, v)
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    for (const r of routes) {
      const m = url.pathname.match(r.pattern)
      if (m) {
        ctx.params = m.slice(1)
        await r.handler(req, res, ctx)
        return
      }
    }
    // Static SPA fallback (untuk deploy single-process)
    if (!url.pathname.startsWith('/api/')) {
      const safe = path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, '')
      let filePath = path.join(distDir, safe === '/' || safe === '\\' ? 'index.html' : safe)
      if (!filePath.startsWith(distDir)) throw new HttpError(400, 'validation_error', 'Path tidak valid')
      if (!existsSync(filePath)) filePath = path.join(distDir, 'index.html')
      if (existsSync(filePath)) {
        const ext = path.extname(filePath)
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff' }
        serveStatic(res, filePath, types[ext] || 'application/octet-stream')
        return
      }
      json(res, 404, { error: { code: 'not_found', message: 'Build belum ada — jalankan npm run build' } })
      return
    }
    json(res, 404, { error: { code: 'not_found', message: 'Endpoint tidak dikenal' } })
  } catch (err) {
    fail(res, err)
  }
})

seed()

// Scheduler MVP (pengganti BullMQ untuk demo lokal, doc 06 M2):
// - pengingat jatuh waktu → status 'sent'
// - approval lewat expires_at → status 'expired'
// - backup harian otomatis (checklist docs/08) — cek mtime backup terbaru
const BACKUP_SCRIPT = path.join(here, 'backup.mjs')
const backupDirDaily = path.join(process.env.ORBIT_DATA_DIR || path.join(here, 'data'), 'backups')
const newestBackupAgeMs = () => {
  try {
    const files = readdirSync(backupDirDaily).filter((f) => f.startsWith('orbit-') && f.endsWith('.db'))
    if (!files.length) return Infinity
    const newest = files.map((f) => statSync(path.join(backupDirDaily, f)).mtimeMs).sort((a, b) => b - a)[0]
    return Date.now() - newest
  } catch {
    return Infinity
  }
}
let lastDailyBackupAge = newestBackupAgeMs()
setInterval(() => {
  try {
    const due = db
      .prepare(`SELECT id, workspace_id, title FROM reminders WHERE status = 'scheduled' AND scheduled_at <= ?`)
      .all(now())
    for (const r of due) {
      db.prepare(`UPDATE reminders SET status = 'sent' WHERE id = ?`).run(r.id)
      logActivity(r.workspace_id, null, 'reminder.sent', 'reminder', r.id, { title: r.title })
    }
    if (due.length) console.log(`[scheduler] ${due.length} pengingat dikirim`)
    const exp = db
      .prepare(`SELECT id FROM ai_approvals WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at <= ?`)
      .all(now())
    for (const a of exp) db.prepare(`UPDATE ai_approvals SET status = 'expired' WHERE id = ?`).run(a.id)
    // backup harian: jalankan proses terpisah bila backup terbaru > 24 jam
    if (newestBackupAgeMs() > 24 * 3600_000) {
      lastDailyBackupAge = Infinity // cegah spam saat spawn gagal berulang
      const child = spawn(process.execPath, [BACKUP_SCRIPT], {
        cwd: here,
        env: process.env,
        stdio: 'ignore',
        detached: false,
      })
      child.on('close', (code) => {
        lastDailyBackupAge = newestBackupAgeMs()
        console.log(`[scheduler] backup harian selesai (exit ${code})`)
      })
    }
  } catch (err) {
    console.error('[scheduler]', err)
  }
}, 60_000)

// beri kesempatan microtask pipeline seed selesai sebelum menerima trafik
setTimeout(() => {
  server.listen(PORT, () => {
    console.log(`[orbit] API v1 siap di http://localhost:${PORT}/api/v1`)
    console.log(`[orbit] Static SPA: ${existsSync(distDir) ? distDir : '(belum ada build)'}`)
  })
}, 200)

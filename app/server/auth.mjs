/* ============================================================
   ORBIT server — autentikasi (scrypt + session token) dan
   helper authorization workspace (mirror RLS blueprint).
   ============================================================ */
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { db, now, uuid } from './db.mjs'

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 hari

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expires)
  return { token, expires_at: expires }
}

export function destroySession(token) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

/** Mengembalikan user atau null; token dari header Authorization: Bearer. */
export function authenticate(req) {
  const header = req.headers['authorization'] || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return null
  const row = db
    .prepare(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > ? AND u.deleted_at IS NULL`,
    )
    .get(token, now())
  return row || null
}

/** Pastikan user punya akses ke workspace (dan peran minimal). */
export function requireMembership(userId, workspaceId, minRole = 'viewer') {
  const member = db
    .prepare('SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?')
    .get(workspaceId, userId)
  if (!member) return null
  const rank = { owner: 4, admin: 3, member: 2, viewer: 1 }
  return rank[member.role] >= rank[minRole] ? member.role : null
}

/** Registrasi: users + workspace personal + membership owner (bootstrap blueprint). */
export function registerUser({ email, password, full_name, locale, timezone }) {
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)
  if (exists) throw new HttpError(409, 'conflict', 'Email sudah terdaftar')
  const userId = uuid()
  db.prepare(
    'INSERT INTO users (id, email, password_hash, full_name, locale, timezone) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, email, hashPassword(password), full_name, locale || 'id-ID', timezone || 'Asia/Jakarta')
  const wsId = uuid()
  db.prepare('INSERT INTO workspaces (id, name, type, owner_id) VALUES (?, ?, ?, ?)').run(
    wsId,
    full_name ? `Ruang pribadi ${full_name}` : 'Ruang pribadi',
    'personal',
    userId,
  )
  db.prepare('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').run(
    wsId,
    userId,
    'owner',
  )
  // Paket default Free (doc 07) — upgrade via subscription
  db.prepare(`INSERT INTO subscriptions (id, workspace_id, plan_id, status) VALUES (?, ?, 'free', 'active')`).run(uuid(), wsId)
  return { userId, workspaceId: wsId }
}

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

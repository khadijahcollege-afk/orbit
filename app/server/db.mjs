/* ============================================================
   ORBIT server — database (SQLite, mirror skema PostgreSQL
   blueprint). Node >= 23.4 (node:sqlite tanpa flag).
   Timestamps ISO 8601; embedding disimpan JSON TEXT (MVP):
   skala demo, retrieval dihitung di aplikasi.
   ============================================================ */
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
// ORBIT_DATA_DIR: lokasi data alternatif (tests / multi-env); default server/data
const dataDir = process.env.ORBIT_DATA_DIR || path.join(here, 'data')
export const storageDir = path.join(dataDir, 'storage')
mkdirSync(storageDir, { recursive: true })

export const db = new DatabaseSync(path.join(dataDir, 'orbit.db'))
db.exec('PRAGMA journal_mode = WAL;')
db.exec('PRAGMA foreign_keys = ON;')

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  locale TEXT NOT NULL DEFAULT 'id-ID',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('personal','family','team')),
  owner_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin','member','viewer')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  uploaded_by TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size INTEGER,
  category TEXT,
  extracted_text TEXT,
  extraction TEXT,            -- JSON hasil ekstraksi (schema doc 04)
  confirmed INTEGER NOT NULL DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending','queued','processing','needs_review','completed','failed')),
  processing_error TEXT,
  source_type TEXT NOT NULL DEFAULT 'upload',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS documents_ws_created ON documents(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL,    -- JSON array float (hash-based, dim 128)
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS chunks_ws ON document_chunks(workspace_id);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person','organization','place','date','account','other')),
  name TEXT NOT NULL,
  normalized_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS entities_ws_name ON entities(workspace_id, normalized_name);

CREATE TABLE IF NOT EXISTS document_entities (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'mentions',
  confidence REAL,
  PRIMARY KEY (document_id, entity_id, relation_type)
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT,
  start_at TEXT,
  end_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  created_by TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  due_at TEXT,
  source_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS tasks_ws_due ON tasks(workspace_id, due_at);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','sent','dismissed','cancelled','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS reminders_sched ON reminders(status, scheduled_at);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by TEXT REFERENCES users(id),
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system','user','assistant','tool')),
  content TEXT NOT NULL,
  citations TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_approvals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  action_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','executed','failed')),
  execution_note TEXT,
  expires_at TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('extraction','embedding','answer','plan','rerank')),
  provider TEXT NOT NULL DEFAULT 'local-deterministic',
  model TEXT NOT NULL DEFAULT 'heuristic-v1',
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_micros INTEGER NOT NULL DEFAULT 0,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ai_usage_ws_created ON ai_usage(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('queued','processing','ready','failed')),
  payload TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, -- free | plus | pro | family | business
  name TEXT NOT NULL,
  price_idr INTEGER NOT NULL DEFAULT 0 CHECK (price_idr >= 0),
  limits TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trialing','active','past_due','cancelled','expired')),
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS billing_orders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  amount_idr INTEGER NOT NULL CHECK (amount_idr > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','cancelled','expired')),
  provider TEXT NOT NULL DEFAULT 'mock' CHECK (provider IN ('mock','midtrans')),
  provider_ref TEXT,
  checkout_url TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

/* Migrasi ringan (idempoten): onboarding docs/08 — pilihan timezone/bahasa saat pertama masuk. */
if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'onboarded_at')) {
  db.exec(`ALTER TABLE users ADD COLUMN onboarded_at TEXT`)
}

/* Kanal umpan balik beta (docs/08 Operations: beta user feedback channel). */
db.exec(`
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND 2000),
  context TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

export const now = () => new Date().toISOString()
export const uuid = () => crypto.randomUUID()

export function logActivity(workspaceId, actorId, action, resourceType, resourceId, metadata = {}) {
  db.prepare(
    `INSERT INTO activity_logs (id, workspace_id, actor_id, action, resource_type, resource_id, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(uuid(), workspaceId, actorId, action, resourceType, resourceId, JSON.stringify(metadata))
}

export function logUsage(workspaceId, userId, kind, documentId = null) {
  db.prepare(
    `INSERT INTO ai_usage (id, workspace_id, user_id, kind, document_id) VALUES (?, ?, ?, ?, ?)`,
  ).run(uuid(), workspaceId, userId, kind, documentId)
}

/* ---------- paket & kuota (doc 07 blueprint) ---------- */

const DEFAULT_LIMITS = { documents: 100, reminders_month: 10, ai_answers_month: 0 }

export function seedPlans() {
  db.prepare(
    `INSERT INTO plans (id, name, price_idr, limits) VALUES
      ('free',     'Free',     0,      ?),
      ('plus',     'Plus',     39000,  ?),
      ('pro',      'Pro',      89000,  ?),
      ('family',   'Family',   129000, ?),
      ('business', 'Business', 299000, ?)
    ON CONFLICT (id) DO NOTHING`,
  ).run(
    JSON.stringify({ documents: 100, reminders_month: 10, ai_answers_month: 0 }),
    JSON.stringify({ documents: 2000, reminders_month: 100, ai_answers_month: 100 }),
    JSON.stringify({ documents: 10000, reminders_month: 500, ai_answers_month: 500 }),
    JSON.stringify({ documents: 5000, reminders_month: 200, ai_answers_month: 200 }),
    JSON.stringify({ documents: 100000, reminders_month: 2000, ai_answers_month: 2000 }),
  )
}

/** Pastikan tiap workspace punya subscription; workspace tanpa → Free. */
export function ensureSubscriptions() {
  seedPlans()
  const ws = db.prepare('SELECT id FROM workspaces').all()
  for (const w of ws) {
    const sub = db.prepare('SELECT 1 FROM subscriptions WHERE workspace_id = ?').get(w.id)
    if (!sub) {
      db.prepare(`INSERT INTO subscriptions (id, workspace_id, plan_id, status) VALUES (?, ?, 'free', 'active')`).run(uuid(), w.id)
    }
  }
}

export function getSubscription(workspaceId) {
  ensureSubscriptions()
  const sub = db
    .prepare(
      `SELECT s.*, p.name AS plan_name, p.price_idr, p.limits AS plan_limits
       FROM subscriptions s JOIN plans p ON p.id = s.plan_id
       WHERE s.workspace_id = ? ORDER BY s.created_at DESC LIMIT 1`,
    )
    .get(workspaceId)
  // Kedaluwarsa periode (trial/paid berakhir) → nonaktifkan saat dibaca
  // (lazy expiry — pengganti scheduler; doc 07 freemium).
  if (sub && ['active', 'trialing'].includes(sub.status) && sub.current_period_end) {
    if (new Date(sub.current_period_end).getTime() < Date.now()) {
      db.prepare(`UPDATE subscriptions SET status = 'expired', updated_at = ? WHERE id = ?`).run(now(), sub.id)
      sub.status = 'expired'
    }
  }
  return sub
}

export function getLimits(workspaceId) {
  const sub = getSubscription(workspaceId)
  // Langganan expired → kembali ke limit Free sampai pembayaran berikutnya.
  const rawLimits = sub?.status === 'expired' ? null : sub?.plan_limits
  let limits = DEFAULT_LIMITS
  try {
    limits = { ...DEFAULT_LIMITS, ...(rawLimits ? JSON.parse(rawLimits) : {}) }
  } catch {
    /* pakai default */
  }
  return { sub, limits }
}

export function monthStart() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}

export function usageThisMonth(workspaceId, kind) {
  return db
    .prepare(`SELECT COUNT(*) c FROM ai_usage WHERE workspace_id = ? AND kind = ? AND created_at >= ?`)
    .get(workspaceId, kind, monthStart()).c
}

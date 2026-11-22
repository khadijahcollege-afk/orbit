/* API client v1 ORBIT — fetch + token (SecureStore di native, localStorage di web). */
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

export const API_BASE: string = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787/api/v1'
const TOKEN_KEY = 'orbit_token'

export const tokenStore = {
  get(): Promise<string | null> {
    return Platform.OS === 'web'
      ? Promise.resolve(localStorage.getItem(TOKEN_KEY))
      : SecureStore.getItemAsync(TOKEN_KEY)
  },
  set(value: string): Promise<void> {
    return Platform.OS === 'web'
      ? Promise.resolve(localStorage.setItem(TOKEN_KEY, value))
      : SecureStore.setItemAsync(TOKEN_KEY, value)
  },
  clear(): Promise<void> {
    return Platform.OS === 'web'
      ? Promise.resolve(localStorage.removeItem(TOKEN_KEY))
      : SecureStore.deleteItemAsync(TOKEN_KEY)
  },
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

interface ApiOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  token?: string | null
  raw?: BodyInit // FormData / bytes untuk upload
}

/* Resolvi path: path relatif milik API (/api/...) → origin dasar;
   path lain diawali API_BASE (mis. /documents). */
function resolveUrl(path: string): string {
  if (path.startsWith('/api/')) return API_BASE.replace(/\/api\/v1\/?$/, '') + path
  if (path.startsWith('/')) return `${API_BASE}${path}`
  return `${API_BASE}/${path}`
}

export async function api<T = unknown>(path: string, opts: ApiOpts = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (opts.token) headers.authorization = `Bearer ${opts.token}`
  if (opts.raw) {
    if (!(opts.raw instanceof FormData)) headers['content-type'] = 'application/octet-stream'
  } else if (opts.body !== undefined) {
    headers['content-type'] = 'application/json'
  }
  const res = await fetch(resolveUrl(path), {
    method: opts.method || 'GET',
    headers,
    body: opts.raw ? opts.raw : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } })?.error
    throw new ApiError(res.status, err?.code || 'error', err?.message || `HTTP ${res.status}`)
  }
  return data as T
}

/* ---------- bentuk data (subset kontrak API v1) ---------- */

export interface Me {
  id: string
  email: string
  full_name: string
  timezone?: string
  locale?: string
  onboarded_at?: string | null
  workspace_id?: string
}

export interface Dashboard {
  priorities: { id: string; title: string; due_at: string | null; status: string }[]
  pending_approvals: number
  due_soon: { id: string; title: string; scheduled_at: string; status: string }[]
  recent_documents: { id: string; title: string; processing_status: string; created_at: string }[]
  active_events: { id: string; title: string; start_at: string | null }[]
}

export interface DocItem {
  id: string
  title: string
  category: string | null
  file_type: string
  processing_status: 'queued' | 'processing' | 'ready' | 'failed'
  created_at: string
  extraction: { amount: number | null; due_date: string | null } | null
}

export interface EventItem {
  id: string
  title: string
  description: string | null
  event_type: string | null
  start_at: string | null
  end_at: string | null
  status: string
  task_progress: { done: number; total: number }
}

export interface ReminderItem {
  id: string
  title: string
  scheduled_at: string
  status: string
}

export interface ChatAnswer {
  conversation_id: string
  message_id: string
  answer: string
  insufficient_data: boolean
  citations: { document_id: string; title: string }[]
  suggested_actions: { type: string; payload: Record<string, unknown>; requires_approval: boolean }[]
}

export interface UsageInfo {
  plan: { id: string; name: string; price_idr: number; status: string; current_period_end: string | null }
  limits: { documents: number; reminders_month: number; ai_answers_month: number }
  usage: { documents: number; answers_month: number; reminders_month: number }
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function fmtRp(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

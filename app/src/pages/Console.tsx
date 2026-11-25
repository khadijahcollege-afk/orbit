import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BrainCircuit,
  Check,
  ClipboardCheck,
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Network,
  RefreshCw,
  Search,
  Settings,
  Send,
  ShieldAlert,
  Trash2,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { Logo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MessageSquarePlus } from 'lucide-react'

/* ============================================================
   ORBIT Console — aplikasi nyata di atas API v1 blueprint.
   Terpisah dari demo konsep (/app): semua data di sini nyata
   (SQLite + pipeline lokal), bukan data dummy.
   ============================================================ */

const API = '/api/v1'
const TOKEN_KEY = 'orbit_token'

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Menunggu file', cls: 'bg-muted text-muted-foreground' },
  queued: { label: 'Diantrikan', cls: 'bg-cyan/15 text-cyan' },
  processing: { label: 'Diproses', cls: 'bg-cyan/15 text-cyan' },
  needs_review: { label: 'Perlu review', cls: 'bg-amber/15 text-amber' },
  completed: { label: 'Selesai', cls: 'bg-green/15 text-green' },
  failed: { label: 'Gagal', cls: 'bg-destructive/15 text-destructive' },
}

const TYPE_LABEL: Record<string, string> = {
  contract: 'Kontrak',
  bill: 'Tagihan',
  receipt: 'Kuitansi',
  registration: 'Pendaftaran',
  report: 'Laporan',
  identity: 'Identitas',
  other: 'Umum',
}

async function api<T = unknown>(path: string, opts: RequestInit & { token?: string } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      ...(opts.body && !(opts.body instanceof ArrayBuffer) ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: { message?: string } }).error?.message || `HTTP ${res.status}`)
  return data as T
}

/* ---------------- Auth ---------------- */

function AuthScreen({ onAuthed }: { onAuthed: (t: { token: string; ws: string; name: string }) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('demo@orbit.id')
  const [password, setPassword] = useState('orbit12345')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const out = await api<{ token: string; workspace_id: string; user: { full_name?: string } }>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        { method: 'POST', body: JSON.stringify({ email, password, full_name: name || email.split('@')[0] }) },
      )
      onAuthed({ token: out.token, ws: out.workspace_id, name: out.user.full_name || email })
    } catch (err) {
      setError(String((err as Error).message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-starfield flex min-h-screen items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={34} wordmarkClassName="text-foreground" />
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-border bg-panel p-6 ring-glow">
          <h1 className="font-display text-lg font-bold">
            {mode === 'login' ? 'Masuk ke Konsol ORBIT' : 'Buat akun ORBIT'}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Aplikasi nyata di atas API v1 — dokumen, memori, assistant, approval.
          </p>
          {mode === 'register' && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
              className="mt-4 w-full rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            required
            className="mt-3 w-full rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            required
            className="mt-3 w-full rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          {error && (
            <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="mt-4 w-full rounded-xl">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? 'Masuk' : 'Daftar'}
          </Button>
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
          {mode === 'login' && (
            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
              Akun demo: <b className="text-foreground">demo@orbit.id</b> / orbit12345 — sudah berisi 4 dokumen
              yang diproses pipeline.
            </p>
          )}
        </form>
      </motion.div>
    </div>
  )
}

/* ---------------- Tab Dokumen ---------------- */

interface Doc {
  id: string
  title: string
  processing_status: string
  file_type: string
  extraction: {
    document_type?: string
    title?: string
    issuer?: string | null
    amount?: number | null
    due_date?: string | null
    category?: string
    confidence?: number
    _simulated?: boolean
  } | null
  confirmed?: boolean
}

/* Form koreksi ekstraksi — module 02 (review & koreksi pengguna) */
function ReviewForm({ token, doc, onDone }: { token: string; doc: Doc; onDone: () => void }) {
  const ex = doc.extraction || {}
  const [title, setTitle] = useState(String(ex.title || doc.title))
  const [issuer, setIssuer] = useState(String(ex.issuer || ''))
  const [amount, setAmount] = useState(ex.amount ? String(ex.amount) : '')
  const [due, setDue] = useState(String(ex.due_date || ''))
  const [busy, setBusy] = useState(false)

  const submit = async (approved: boolean) => {
    setBusy(true)
    try {
      await api(`/documents/${doc.id}/confirm-extraction`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          approved,
          corrected: {
            title,
            issuer: issuer.trim() || null,
            amount: amount ? Number(amount.replace(/\D/g, '')) : null,
            due_date: due || null,
            document_type: ex.document_type || 'other',
            category: ex.category || 'umum',
            confidence: approved ? Math.max(0.95, Number(ex.confidence) || 0.95) : ex.confidence,
            requires_confirmation: !approved,
          },
        }),
      })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  const input = 'rounded-lg border border-border bg-panel-2 px-2.5 py-1.5 text-xs outline-none focus:border-primary/50'
  return (
    <div className="mt-3 rounded-xl border border-amber/30 bg-amber/5 p-3">
      <div className="mb-2 text-[11px] font-bold tracking-widest text-amber">PERIKSA & KOREKSI HASIL AI</div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className="col-span-2 md:col-span-1">
          <span className="mb-1 block text-[10px] text-muted-foreground">Judul</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={cn(input, 'w-full')} />
        </label>
        <label>
          <span className="mb-1 block text-[10px] text-muted-foreground">Penerbit</span>
          <input value={issuer} onChange={(e) => setIssuer(e.target.value)} className={cn(input, 'w-full')} placeholder="—" />
        </label>
        <label>
          <span className="mb-1 block text-[10px] text-muted-foreground">Nominal (Rp)</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" className={cn(input, 'w-full')} placeholder="—" />
        </label>
        <label>
          <span className="mb-1 block text-[10px] text-muted-foreground">Tanggal penting</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={cn(input, 'w-full')} />
        </label>
      </div>
      <div className="mt-2.5 flex gap-2">
        <Button size="sm" className="h-7 rounded-lg text-xs" disabled={busy} onClick={() => submit(true)}>
          <Check className="h-3.5 w-3.5" /> Simpan & konfirmasi
        </Button>
        <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-muted-foreground" disabled={busy} onClick={() => submit(false)}>
          Masih perlu review
        </Button>
      </div>
    </div>
  )
}

function DocumentsTab({ token, ws, onChanged }: { token: string; ws: string; onChanged: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const out = await api<{ data: Doc[] }>(`/documents?workspace_id=${ws}`, { token })
    setDocs(out.data)
    return out.data
  }, [token, ws])

  useEffect(() => {
    let stop = false
    const tick = async () => {
      const data = await load()
      const busy = data.some((d) => ['pending', 'queued', 'processing'].includes(d.processing_status))
      if (!stop) setTimeout(tick, busy ? 1500 : 4000)
    }
    tick()
    return () => {
      stop = true
    }
  }, [load])

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const created = await api<{ id: string }>(`/documents`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          workspace_id: ws,
          title: file.name.replace(/\.[^.]+$/, ''),
          file_type: file.type || 'text/plain',
          file_size: file.size,
        }),
      })
      const bytes = await file.arrayBuffer()
      await api(`/uploads/${created.id}`, { method: 'PUT', token, body: bytes })
      await load()
      onChanged()
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const act = async (id: string, action: 'confirm' | 'reprocess' | 'delete', body?: object) => {
    if (action === 'confirm') await api(`/documents/${id}/confirm-extraction`, { method: 'POST', token, body: JSON.stringify({ approved: true, ...body }) })
    if (action === 'reprocess') await api(`/documents/${id}/process`, { method: 'POST', token })
    if (action === 'delete') await api(`/documents/${id}`, { method: 'DELETE', token })
    await load()
    onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.csv,.json,.pdf,.png,.jpg,.jpeg"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Upload className="mx-auto h-5 w-5 text-primary" />
        <div className="font-display mt-2 text-sm font-semibold">Masukkan dokumen — diproses pipeline nyata</div>
        <div className="mt-1 text-xs text-muted-foreground">
          Teks (.txt/.md/.csv/.json) diekstraksi asli · PDF/gambar pakai OCR simulasi (perlu review)
        </div>
        <Button size="sm" variant="outline" className="mt-3 rounded-lg border-primary/40" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Pilih file
        </Button>
      </div>

      <div className="space-y-2.5">
        {docs.map((d) => {
          const meta = STATUS_META[d.processing_status] || STATUS_META.pending
          const ex = d.extraction
          return (
            <div key={d.id} className="rounded-2xl border border-border bg-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-cyan" />
                <span className="text-sm font-semibold">{d.title}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', meta.cls)}>{meta.label}</span>
                {ex?.document_type && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground/80">
                    {TYPE_LABEL[ex.document_type] || ex.document_type}
                  </span>
                )}
                {ex?._simulated && (
                  <span className="rounded-md border border-amber/40 px-1.5 py-0.5 text-[10px] text-amber">simulasi OCR</span>
                )}
              </div>
              {ex && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {ex.issuer && <span>Penerbit: <b className="text-foreground/85">{ex.issuer}</b></span>}
                  {ex.amount ? <span>Nominal: <b className="text-foreground/85">Rp {ex.amount.toLocaleString('id-ID')}</b></span> : null}
                  {ex.due_date && <span>Tanggal: <b className="text-foreground/85">{ex.due_date}</b></span>}
                  <span>yakin {Math.round((ex.confidence || 0) * 100)}%</span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-muted-foreground" onClick={() => act(d.id, 'reprocess')}>
                  <RefreshCw className="h-3.5 w-3.5" /> Proses ulang
                </Button>
                <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-muted-foreground hover:text-destructive" onClick={() => act(d.id, 'delete')}>
                  <Trash2 className="h-3.5 w-3.5" /> Hapus
                </Button>
              </div>
              {d.processing_status === 'needs_review' && (
                <ReviewForm token={token} doc={d} onDone={() => { load(); onChanged() }} />
              )}
            </div>
          )
        })}
        {docs.length === 0 && (
          <p className="rounded-2xl border border-border bg-panel p-6 text-center text-xs text-muted-foreground">
            Belum ada dokumen — mulai dari satu kuitansi atau catatan.
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------------- Tab Memory ---------------- */

interface Hit {
  document_id: string
  chunk_id: string
  title: string
  snippet: string
  score: number
}

function MemoryTab({ token, ws }: { token: string; ws: string }) {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'hybrid' | 'keyword' | 'semantic'>('hybrid')
  const [hits, setHits] = useState<Hit[] | null>(null)
  const [busy, setBusy] = useState(false)

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!q.trim()) return
    setBusy(true)
    try {
      const out = await api<{ data: Hit[] }>(
        `/memory/search?workspace_id=${ws}&q=${encodeURIComponent(q)}&mode=${mode}`,
        { token },
      )
      setHits(out.data)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <div className="flex flex-1 items-center gap-2.5 rounded-xl border border-border bg-panel px-3.5">
          <Search className="h-4 w-4 text-primary" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari di memori… (mis. deposit kontrak)"
            className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="rounded-xl border border-border bg-panel px-3 text-sm outline-none"
        >
          <option value="hybrid">Hybrid</option>
          <option value="keyword">Keyword</option>
          <option value="semantic">Semantic</option>
        </select>
        <Button type="submit" className="rounded-xl" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cari'}
        </Button>
      </form>

      {hits && (
        <div className="space-y-2.5">
          {hits.length === 0 && (
            <p className="rounded-2xl border border-border bg-panel p-6 text-center text-xs text-muted-foreground">
              Tidak ada hasil di memori untuk pencarian ini.
            </p>
          )}
          {hits.map((h) => (
            <div key={h.chunk_id} className="rounded-2xl border border-border bg-panel p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{h.title}</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                  skor {h.score.toFixed(3)}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{h.snippet}</p>
            </div>
          ))}
        </div>
      )}

      <KnowledgeGraph token={token} ws={ws} />
    </div>
  )
}

/* ---------------- Graf pengetahuan (eksperimen — di luar 8 modul blueprint) ---------------- */

interface GraphNode {
  id: string
  type: 'entity' | 'document'
  label: string
  entity_type?: string
  processing_status?: string
  degree?: number
}
interface GraphData {
  nodes: GraphNode[]
  edges: { source: string; target: string }[]
}

const ENTITY_COLORS: Record<string, string> = {
  organization: '#6655E8',
  person: '#9A8CFF',
  date: '#D97706',
  place: '#16A34A',
  account: '#0EA5E9',
  other: '#8A93A8',
}

/** Tata letak force-sim sederhana (repulsi + pegas), deterministik tanpa animasi. */
function layoutGraph(data: GraphData, W = 640, H = 360): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>()
  const nodes = data.nodes
  if (!nodes.length) return pos
  nodes.forEach((n, i) => {
    const a = (2 * Math.PI * i) / nodes.length
    pos.set(n.id, { x: W / 2 + Math.cos(a) * 120, y: H / 2 + Math.sin(a) * 90 })
  })
  const index = new Map(nodes.map((n, i) => [n.id, i]))
  const edges = data.edges.filter((e) => index.has(e.source) && index.has(e.target))
  for (let iter = 0; iter < 260; iter++) {
    const temp = 1 - iter / 260
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      const pa = pos.get(a.id)!
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const pb = pos.get(b.id)!
        const dx = pa.x - pb.x
        const dy = pa.y - pb.y
        const d2 = dx * dx + dy * dy || 1
        if (d2 > 40000) continue // jauh → abaikan
        const f = (1600 / d2) * temp
        const d = Math.sqrt(d2)
        const ux = (dx / d) * f
        const uy = (dy / d) * f
        pa.x += ux
        pa.y += uy
        pb.x -= ux
        pb.y -= uy
      }
    }
    for (const e of edges) {
      const pa = pos.get(e.source)!
      const pb = pos.get(e.target)!
      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const d = Math.sqrt(dx * dx + dy * dy) || 1
      const f = (d - 72) * 0.06 * temp
      const ux = (dx / d) * f
      const uy = (dy / d) * f
      pa.x += ux
      pa.y += uy
      pb.x -= ux
      pb.y -= uy
    }
    // sentripetal + jangkar tepi
    for (const n of nodes) {
      const p = pos.get(n.id)!
      p.x += (W / 2 - p.x) * 0.02 * temp
      p.y += (H / 2 - p.y) * 0.02 * temp
      p.x = Math.max(30, Math.min(W - 30, p.x))
      p.y = Math.max(24, Math.min(H - 24, p.y))
    }
  }
  return pos
}

function KnowledgeGraph({ token, ws }: { token: string; ws: string }) {
  const [data, setData] = useState<GraphData | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open || data) return
    api<GraphData>(`/graph?workspace_id=${ws}`, { token }).then(setData).catch(() => setData({ nodes: [], edges: [] }))
  }, [open, token, ws, data])

  const pos = data ? layoutGraph(data) : null

  return (
    <section className="rounded-2xl border border-border bg-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xs font-bold tracking-widest text-muted-foreground">GRAF PENGETAHUAN</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Eksperimen — peta entitas hasil pipeline (organisasi, tanggal, dst.) dan dokumen terkaitnya.
          </p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl border-border" onClick={() => setOpen((v) => !v)}>
          {open ? 'Tutup' : 'Tampilkan'}
        </Button>
      </div>
      {open && data && (
        data.nodes.length === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">Belum ada entitas — masukkan dokumen dulu lewat Inbox.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <svg viewBox="0 0 640 360" className="h-[360px] w-full min-w-[520px]" role="img" aria-label="Graf pengetahuan">
              {data.edges.map((e, i) => {
                const a = pos!.get(e.source)
                const b = pos!.get(e.target)
                if (!a || !b) return null
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#252D47" strokeWidth={1} />
              })}
              {data.nodes.map((n) => {
                const p = pos!.get(n.id)
                if (!p) return null
                const isEntity = n.type === 'entity'
                const color = isEntity ? ENTITY_COLORS[n.entity_type || 'other'] || '#8A93A8' : '#3A4468'
                const r = isEntity ? 6 + Math.min(8, (n.degree || 1)) : 7
                return (
                  <g key={n.id}>
                    <circle cx={p.x} cy={p.y} r={r} fill={color} opacity={isEntity ? 0.9 : 0.75} stroke="#0B1020" strokeWidth={1.5} />
                    <title>{n.label}</title>
                    <text x={p.x} y={p.y - r - 4} textAnchor="middle" fontSize={8.5} fill="#8A93A8">
                      {n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}
                    </text>
                  </g>
                )
              })}
            </svg>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
              {Object.entries(ENTITY_COLORS).map(([k, c]) => (
                <span key={k} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} /> {k}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: '#3A4468' }} /> dokumen
              </span>
            </div>
          </div>
        )
      )}
    </section>
  )
}

/* ---------------- Tab Assistant ---------------- */

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  citations?: { document_id: string; title: string }[]
  insufficient?: boolean
  approvals?: { id: string; action_type: string; status: string }[]
}

interface ConversationSummary {
  id: string
  title: string
  created_at: string
  message_count: number
  preview: string
}

function AssistantTab({ token, ws }: { token: string; ws: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const [convs, setConvs] = useState<ConversationSummary[] | null>(null)

  const loadConvs = useCallback(() => {
    api<{ data: ConversationSummary[] }>(`/assistant/conversations?workspace_id=${ws}`, { token })
      .then((d) => setConvs(d.data))
      .catch(() => {})
  }, [token, ws])

  const openConv = useCallback(
    async (id: string) => {
      try {
        const d = await api<{ id: string; messages: { role: string; content: string; citations: { document_id: string; title: string }[]; insufficient_data: boolean }[] }>(
          `/assistant/conversations/${id}`,
          { token },
        )
        setConvId(d.id)
        setMsgs(
          d.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content, citations: m.citations, insufficient: m.insufficient_data })),
        )
      } catch {
        /* biarkan tampilan sekarang */
      }
    },
    [token],
  )

  const deleteConv = useCallback(
    async (id: string) => {
      try {
        await api(`/assistant/conversations/${id}`, { method: 'DELETE', token })
        if (convId === id) {
          setConvId(null)
          setMsgs([])
        }
        loadConvs()
      } catch {
        /* biarkan */
      }
    },
    [token, convId, loadConvs],
  )

  useEffect(() => {
    loadConvs()
  }, [loadConvs])

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    setMsgs((m) => [...m, { role: 'user', content: text }])
    setBusy(true)
    try {
      const out = await api<{
        answer: string
        insufficient_data: boolean
        citations: { document_id: string; title: string }[]
        approvals: { id: string; action_type: string; status: string }[]
        conversation_id: string
      }>('/assistant/chat', {
        method: 'POST',
        token,
        body: JSON.stringify({ workspace_id: ws, message: text }),
      })
      setConvId(out.conversation_id)
      loadConvs()
      setMsgs((m) => [
        ...m,
        {
          role: 'assistant',
          content: out.answer,
          citations: out.citations,
          insufficient: out.insufficient_data,
          approvals: out.approvals,
        },
      ])
    } catch (err) {
      setMsgs((m) => [...m, { role: 'assistant', content: `Gagal: ${(err as Error).message}` }])
    } finally {
      setBusy(false)
    }
  }

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    await api(`/approvals/${id}/${decision}`, { method: 'POST', token, body: JSON.stringify({}) })
    setMsgs((m) =>
      m.map((msg) => ({
        ...msg,
        approvals: msg.approvals?.map((a) => (a.id === id ? { ...a, status: decision === 'approve' ? 'executed' : 'rejected' } : a)),
      })),
    )
  }

  return (
    <div className="space-y-4">
      <div className="min-h-64 space-y-3 rounded-2xl border border-border bg-panel p-4">
        {msgs.length === 0 && (
          <div className="py-10 text-center">
            <BrainCircuit className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="font-display mt-2 text-sm font-semibold">Tanya memori Anda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Jawaban hanya dari dokumen tersimpan, dengan sitasi. Tanpa dasar → ORBIT menolak menebak.
            </p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            {m.role === 'user' ? (
              <div className="max-w-lg rounded-2xl rounded-br-md bg-primary/20 px-4 py-2.5 text-sm font-medium">{m.content}</div>
            ) : (
              <div className={cn('rounded-2xl rounded-bl-md border p-4', m.insufficient ? 'border-dashed border-amber/40 bg-amber/5' : 'border-line bg-panel-2')}>
                <p className="whitespace-pre-line text-sm leading-relaxed">{m.content}</p>
                {!!m.citations?.length && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.citations.map((c, ci) => (
                      <span key={ci} className="rounded-md border border-line bg-panel px-2 py-0.5 text-[10.5px] text-foreground/80">
                        {c.title}
                      </span>
                    ))}
                  </div>
                )}
                {m.approvals?.map((a) => (
                  <div key={a.id} className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold">
                        Usulan: buat pengingat <span className="text-primary">({a.status})</span>
                      </span>
                      {a.status === 'pending' && (
                        <span className="flex gap-2">
                          <Button size="sm" className="h-7 rounded-lg text-xs" onClick={() => decide(a.id, 'approve')}>Setujui</Button>
                          <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-muted-foreground" onClick={() => decide(a.id, 'reject')}>
                            <X className="h-3 w-3" /> Tolak
                          </Button>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />}
        {convs && convs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground">RIWAYAT:</span>
            {convs.slice(0, 6).map((c) => (
              <span key={c.id} className="inline-flex items-center">
                <button
                  onClick={() => openConv(c.id)}
                  title={c.preview}
                  className={cn(
                    'max-w-[180px] truncate rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                    c.id === convId ? 'border-primary/60 bg-primary/15 text-foreground' : 'border-border text-muted-foreground hover:bg-muted',
                  )}
                >
                  {c.title || c.preview || 'Percakapan'}
                </button>
                {c.id === convId && (
                  <button
                    onClick={() => deleteConv(c.id)}
                    aria-label="Hapus percakapan"
                    title="Hapus percakapan"
                    className="ml-0.5 rounded-full border border-border p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
            <button
              onClick={() => {
                setMsgs([])
                setConvId(null)
              }}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
            >
              + Baru
            </button>
          </div>
        )}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Contoh: kapan jatuh tempo tagihan internet saya?"
          className="flex-1 rounded-xl border border-border bg-panel px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
        />
        <Button type="submit" size="icon" className="rounded-xl" disabled={busy} aria-label="Kirim">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

/* ---------------- Tab Tindakan ---------------- */

interface Approval {
  id: string
  action_type: string
  status: string
  payload: { title?: string; scheduled_at?: string }
}
interface Task {
  id: string
  title: string
  status: string
  due_at: string | null
  priority: string
  event_id?: string | null
}

function ActionsTab({ token, ws, onChanged }: { token: string; ws: string; onChanged: () => void }) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [reminders, setReminders] = useState<{ id: string; title: string; scheduled_at: string; status: string }[]>([])
  const [newTask, setNewTask] = useState('')
  const [newRem, setNewRem] = useState('')
  const [remDate, setRemDate] = useState('')

  const load = useCallback(async () => {
    const [a, t, r] = await Promise.all([
      api<{ data: Approval[] }>(`/approvals?workspace_id=${ws}`, { token }),
      api<{ data: Task[] }>(`/tasks?workspace_id=${ws}`, { token }),
      api<{ data: { id: string; title: string; scheduled_at: string; status: string }[] }>(`/reminders?workspace_id=${ws}`, { token }),
    ])
    setApprovals(a.data)
    setTasks(t.data)
    setReminders(r.data)
  }, [token, ws])

  useEffect(() => {
    load()
  }, [load])

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    await api(`/approvals/${id}/${decision}`, { method: 'POST', token, body: JSON.stringify({}) })
    await load()
    onChanged()
  }

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return
    await api(`/tasks`, { method: 'POST', token, body: JSON.stringify({ workspace_id: ws, title: newTask.trim() }) })
    setNewTask('')
    await load()
    onChanged()
  }

  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRem.trim() || !remDate) return
    await api(`/reminders`, {
      method: 'POST',
      token,
      body: JSON.stringify({ workspace_id: ws, title: newRem.trim(), scheduled_at: `${remDate}T09:00:00` }),
    })
    setNewRem('')
    setRemDate('')
    await load()
    onChanged()
  }

  const toggleTask = async (t: Task) => {
    await api(`/tasks/${t.id}`, { method: 'PATCH', token, body: JSON.stringify({ status: t.status === 'completed' ? 'pending' : 'completed' }) })
    await load()
    onChanged()
  }

  const pending = approvals.filter((a) => a.status === 'pending')
  const decided = approvals.filter((a) => a.status !== 'pending')

  return (
    <div className="space-y-5">
      <section>
        <h2 className="font-display mb-2.5 text-xs font-bold tracking-widest text-muted-foreground">
          MENUNGGU PERSETUJUAN ({pending.length})
        </h2>
        <div className="space-y-2.5">
          {pending.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-panel p-4">
              <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{a.payload.title || a.action_type}</div>
                <div className="text-[11px] text-muted-foreground">
                  {a.action_type === 'create_reminder' && a.payload.scheduled_at ? `Pengingat pada ${a.payload.scheduled_at}` : a.action_type}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 rounded-lg text-xs" onClick={() => decide(a.id, 'approve')}>Setujui</Button>
                <Button size="sm" variant="ghost" className="h-7 rounded-lg text-xs text-muted-foreground" onClick={() => decide(a.id, 'reject')}>
                  <X className="h-3 w-3" /> Tolak
                </Button>
              </div>
            </div>
          ))}
          {pending.length === 0 && <p className="rounded-2xl border border-border bg-panel p-4 text-xs text-muted-foreground">Tidak ada usulan aksi yang menunggu.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-display mb-2.5 text-xs font-bold tracking-widest text-muted-foreground">TUGAS</h2>
        <div className="space-y-2">
          {tasks.map((t) => (
            <button key={t.id} onClick={() => toggleTask(t)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-left transition-colors hover:border-primary/30">
              <span className={cn('flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border', t.status === 'completed' ? 'border-green bg-green/20 text-green' : 'border-muted-foreground/40')}>
                {t.status === 'completed' && <Check className="h-3 w-3" />}
              </span>
              <span className={cn('flex-1 text-sm', t.status === 'completed' && 'text-muted-foreground line-through')}>{t.title}</span>
              {t.due_at && <span className="text-[11px] text-amber">{t.due_at.slice(0, 10)}</span>}
            </button>
          ))}
        </div>
        <form onSubmit={addTask} className="mt-2 flex gap-2">
          <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Tugas baru…" className="flex-1 rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none focus:border-primary/50" />
          <Button type="submit" variant="outline" className="rounded-xl border-primary/40">Tambah</Button>
        </form>
      </section>

      <section>
        <h2 className="font-display mb-2.5 text-xs font-bold tracking-widest text-muted-foreground">PENGINGAT</h2>
        <div className="space-y-2">
          {reminders.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-panel px-4 py-3">
              <span className="text-sm">{r.title}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{r.scheduled_at.slice(0, 16).replace('T', ' ')}</span>
            </div>
          ))}
          {reminders.length === 0 && <p className="rounded-xl border border-border bg-panel px-4 py-3 text-xs text-muted-foreground">Belum ada pengingat.</p>}
        </div>
        <form onSubmit={addReminder} className="mt-2 flex flex-wrap gap-2">
          <input value={newRem} onChange={(e) => setNewRem(e.target.value)} placeholder="Pengingat baru…" className="min-w-40 flex-1 rounded-xl border border-border bg-panel px-3.5 py-2.5 text-sm outline-none focus:border-primary/50" />
          <input type="date" value={remDate} onChange={(e) => setRemDate(e.target.value)} className="rounded-xl border border-border bg-panel px-3 py-2.5 text-sm outline-none focus:border-primary/50" />
          <Button type="submit" variant="outline" className="rounded-xl border-primary/40">Tambah</Button>
        </form>
      </section>

      {decided.length > 0 && (
        <section>
          <h2 className="font-display mb-2.5 text-xs font-bold tracking-widest text-muted-foreground">RIWAYAT KEPUTUSAN</h2>
          <div className="space-y-1.5">
            {decided.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-panel-2 px-3.5 py-2 text-xs">
                <span className="text-muted-foreground">{a.payload.title || a.action_type}</span>
                <span className={cn('font-semibold', a.status === 'executed' ? 'text-green' : 'text-muted-foreground')}>{a.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ---------------- Tab Ringkasan ---------------- */

interface Usage {
  plan: { id: string; name: string; price_idr: number; status: string; current_period_end: string | null }
  limits: { documents: number; reminders_month: number; ai_answers_month: number }
  usage: { documents: number; answers_month: number; reminders_month: number }
}

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / Math.max(max, 1)) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {used} / {max === 0 ? '0 (tidak tersedia)' : max.toLocaleString('id-ID')}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full', pct >= 100 ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-cyan')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function RingkasanTab({ token, ws, gotoTab }: { token: string; ws: string; gotoTab: (t: 'dokumen' | 'tindakan' | 'events') => void }) {
  const [dash, setDash] = useState<{
    priorities: Task[]
    pending_approvals: number
    due_soon: { id: string; title: string; scheduled_at: string }[]
    recent_documents: Doc[]
  } | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)

  useEffect(() => {
    const load = async () => {
      const [d, u] = await Promise.all([
        api<NonNullable<typeof dash>>(`/dashboard?workspace_id=${ws}`, { token }),
        api<Usage>(`/account/usage?workspace_id=${ws}`, { token }),
      ])
      setDash(d)
      setUsage(u)
    }
    load()
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [token, ws])

  if (!dash || !usage) return <Loader2 className="mx-auto mt-16 h-5 w-5 animate-spin text-muted-foreground" />

  const stats = [
    { label: 'Prioritas hari ini', value: dash.priorities.length, to: 'tindakan' as const },
    { label: 'Approval menunggu', value: dash.pending_approvals, to: 'tindakan' as const },
    { label: 'Pengingat terdekat', value: dash.due_soon.length, to: 'tindakan' as const },
    { label: 'Dokumen tersimpan', value: usage.usage.documents, to: 'dokumen' as const },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => gotoTab(s.to)}
            className="rounded-2xl border border-border bg-panel p-4 text-left transition-colors hover:border-primary/35"
          >
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
            <div className="font-display mt-1 text-2xl font-bold">{s.value}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="font-display mb-3 text-xs font-bold tracking-widest text-muted-foreground">PRIORITAS</h2>
          <div className="space-y-2">
            {dash.priorities.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-panel-2 px-3.5 py-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span className="flex-1 text-sm">{t.title}</span>
                {t.due_at && <span className="text-[11px] text-amber">{t.due_at.slice(0, 10)}</span>}
              </div>
            ))}
            {dash.priorities.length === 0 && <p className="text-xs text-muted-foreground">Tidak ada — bersih!</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-panel p-5">
          <h2 className="font-display mb-3 text-xs font-bold tracking-widest text-muted-foreground">PENGINGAT TERDEKAT</h2>
          <div className="space-y-2">
            {dash.due_soon.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-line bg-panel-2 px-3.5 py-2.5">
                <span className="text-sm">{r.title}</span>
                <span className="text-[11px] text-muted-foreground">{r.scheduled_at.slice(0, 16).replace('T', ' ')}</span>
              </div>
            ))}
            {dash.due_soon.length === 0 && <p className="text-xs text-muted-foreground">Belum ada pengingat terjadwal.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-panel to-cyan/8 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xs font-bold tracking-widest text-muted-foreground">PAKET & PEMAKAIAN BULAN INI</h2>
          <span className="rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-foreground">
            {usage.plan.name} · {usage.plan.status === 'trialing' ? 'trial' : usage.plan.status}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <UsageBar label="Dokumen" used={usage.usage.documents} max={usage.limits.documents} />
          <UsageBar label="Jawaban AI" used={usage.usage.answers_month} max={usage.limits.ai_answers_month} />
          <UsageBar label="Pengingat" used={usage.usage.reminders_month} max={usage.limits.reminders_month} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {usage.plan.status === 'trialing' && usage.plan.current_period_end
            ? `Trial berakhir ${usage.plan.current_period_end.slice(0, 10)} · `
            : ''}
          Upgrade paket tersedia di tab Akun — enforcement kuota aktif otomatis.
        </p>
      </section>
    </div>
  )
}

/* ---------------- Tab Events (Life Event Engine) ---------------- */

interface EventRow {
  id: string
  title: string
  description: string | null
  event_type: string | null
  status: string
  task_progress: { done: number; total: number }
}

function EventsTab({ token, ws, onChanged }: { token: string; ws: string; onChanged: () => void }) {
  const [events, setEvents] = useState<EventRow[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [goal, setGoal] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [e, t] = await Promise.all([
      api<{ data: EventRow[] }>(`/events?workspace_id=${ws}`, { token }),
      api<{ data: Task[] }>(`/tasks?workspace_id=${ws}`, { token }),
    ])
    setEvents(e.data)
    setTasks(t.data)
  }, [token, ws])

  useEffect(() => {
    load()
  }, [load])

  const toggleTask = async (t: Task) => {
    await api(`/tasks/${t.id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify({ status: t.status === 'completed' ? 'pending' : 'completed' }),
    })
    await load()
    onChanged()
  }

  const generatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await api(`/events/generate-plan`, {
        method: 'POST',
        token,
        body: JSON.stringify({ workspace_id: ws, goal: goal.trim() }),
      })
      setGoal('')
      await load()
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    await api(`/events`, { method: 'POST', token, body: JSON.stringify({ workspace_id: ws, title: newTitle.trim() }) })
    setNewTitle('')
    await load()
    onChanged()
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-magenta/30 bg-gradient-to-br from-magenta/10 via-panel to-primary/10 p-5">
        <div className="font-display text-[11px] font-bold tracking-[0.25em] text-magenta">LIFE EVENT ENGINE</div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Tulis tujuan dalam satu kalimat — ORBIT menyusun event + daftar tugasnya (provider lokal).
        </p>
        <form onSubmit={generatePlan} className="mt-3 flex gap-2">
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder='Contoh: "Saya mau pindah rumah bulan depan"'
            className="flex-1 rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-sm outline-none focus:border-magenta/50"
          />
          <Button type="submit" className="rounded-xl" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Susun rencana'}
          </Button>
        </form>
        {error && (
          <p className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
        )}
        <form onSubmit={createEvent} className="mt-2.5 flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="…atau buat event manual"
            className="flex-1 rounded-xl border border-border bg-background/70 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50"
          />
          <Button type="submit" variant="outline" className="rounded-xl border-border">Tambah</Button>
        </form>
      </div>

      <div className="space-y-4">
        {events.map((ev) => {
          const evTasks = tasks.filter((t) => t.event_id === ev.id)
          const pct = ev.task_progress.total ? Math.round((ev.task_progress.done / ev.task_progress.total) * 100) : 0
          return (
            <div key={ev.id} className="rounded-2xl border border-border bg-panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display font-bold">{ev.title}</h3>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {ev.event_type || 'general'} · {ev.status}
                </span>
              </div>
              {ev.description && <p className="mt-1 text-xs text-muted-foreground">{ev.description}</p>}
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Progres</span>
                  <span className="font-semibold">
                    {ev.task_progress.done}/{ev.task_progress.total} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary via-magenta to-cyan" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {evTasks.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-panel-2"
                  >
                    <span
                      className={cn(
                        'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border',
                        t.status === 'completed' ? 'border-green bg-green/20 text-green' : 'border-muted-foreground/40',
                      )}
                    >
                      {t.status === 'completed' && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn('flex-1 text-sm', t.status === 'completed' && 'text-muted-foreground line-through')}>
                      {t.title}
                    </span>
                  </button>
                ))}
                {evTasks.length === 0 && <p className="px-2.5 text-xs text-muted-foreground">Belum ada tugas di event ini.</p>}
              </div>
            </div>
          )
        })}
        {events.length === 0 && (
          <p className="rounded-2xl border border-border bg-panel p-6 text-center text-xs text-muted-foreground">
            Belum ada urusan besar. Coba susun rencana pertama di atas.
          </p>
        )}
      </div>
    </div>
  )
}

/* ---------------- Tab Akun (module 08 — Control) ---------------- */

const TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC']

/* ---- Paket & Tagihan (doc 07 — freemium, gateway pembayaran) ---- */

interface BillingPlan {
  id: string
  name: string
  price_idr: number
  limits: { documents: number; reminders_month: number; ai_answers_month: number }
}
interface BillingOrder {
  id: string
  plan_id: string
  amount_idr: number
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired'
  provider: 'mock' | 'midtrans'
  paid_at: string | null
  created_at: string
}

const rp = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const STATUS_LABEL: Record<BillingOrder['status'], string> = {
  pending: 'menunggu bayar',
  paid: 'terbayar',
  failed: 'gagal',
  cancelled: 'dibatalkan',
  expired: 'kedaluwarsa',
}

function BillingSection({ token, ws, currentPlanId, onPaid }: { token: string; ws: string; currentPlanId?: string; onPaid: () => void }) {
  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [orders, setOrders] = useState<BillingOrder[] | null>(null)
  const [pending, setPending] = useState<BillingOrder | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const reload = useCallback(() => {
    api<{ plans: BillingPlan[] }>('/billing/plans', { token }).then((d) => setPlans(d.plans)).catch(() => {})
    api<{ orders: BillingOrder[] }>(`/billing/orders?workspace_id=${ws}`, { token }).then((d) => setOrders(d.orders)).catch(() => {})
  }, [token, ws])

  useEffect(() => {
    reload()
  }, [reload])

  // Provider nyata: Snap dibuka di tab lain → pantau status order sampai berubah.
  useEffect(() => {
    if (!pending || pending.provider !== 'midtrans') return
    const started = Date.now()
    const t = setInterval(async () => {
      if (Date.now() - started > 120_000) {
        clearInterval(t)
        setPending(null)
        return
      }
      try {
        const d = await api<{ orders: BillingOrder[] }>(`/billing/orders?workspace_id=${ws}`, { token })
        const o = d.orders.find((x) => x.id === pending.id)
        if (o && o.status !== 'pending') {
          clearInterval(t)
          setPending(null)
          reload()
          if (o.status === 'paid') onPaid()
        }
      } catch {
        /* coba lagi */
      }
    }, 4000)
    return () => clearInterval(t)
  }, [pending, token, ws, reload, onPaid])

  const checkout = async (plan_id: string) => {
    setBusy(true)
    setErr('')
    try {
      const r = await api<{ order: BillingOrder; provider: string; payment_url: string | null }>('/billing/checkout', {
        method: 'POST',
        token,
        body: JSON.stringify({ workspace_id: ws, plan_id }),
      })
      if (r.provider === 'midtrans' && r.payment_url) window.open(r.payment_url, '_blank')
      setPending(r.order)
      reload()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Checkout gagal')
    } finally {
      setBusy(false)
    }
  }

  const completeMock = async (outcome: 'paid' | 'cancelled') => {
    if (!pending) return
    setBusy(true)
    try {
      await api(`/billing/orders/${pending.id}/mock-complete`, { method: 'POST', token, body: JSON.stringify({ outcome }) })
      setPending(null)
      reload()
      if (outcome === 'paid') onPaid()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Gagal menyelesaikan pembayaran')
    } finally {
      setBusy(false)
    }
  }

  const paid = orders?.filter((o) => o.status === 'paid') ?? []
  return (
    <>
      <section className="rounded-2xl border border-border bg-panel p-5 lg:col-span-2">
        <h2 className="font-display mb-3 text-xs font-bold tracking-widest text-muted-foreground">PAKET LANGGANAN</h2>
        {err && <p className="mb-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          {(plans ?? []).map((p) => {
            const current = p.id === currentPlanId
            return (
              <div key={p.id} className={cn('flex flex-col rounded-xl border p-3.5', current ? 'border-primary/60 bg-primary/5' : 'border-border bg-panel-2')}>
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{p.price_idr === 0 ? 'Gratis' : `${rp(p.price_idr)}/bln`}</div>
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  <li>{p.limits.documents.toLocaleString('id-ID')} dokumen</li>
                  <li>{p.limits.ai_answers_month} jawaban AI/bln</li>
                  <li>{p.limits.reminders_month} pengingat/bln</li>
                </ul>
                <div className="mt-3 flex-1" />
                {current ? (
                  <span className="rounded-xl border border-primary/40 px-2.5 py-1.5 text-center text-[11px] font-semibold text-primary">Paket aktif</span>
                ) : p.price_idr > 0 ? (
                  <Button size="sm" className="rounded-xl" disabled={busy || !!pending} onClick={() => checkout(p.id)}>
                    {pending ? 'Menunggu…' : 'Upgrade'}
                  </Button>
                ) : (
                  <span className="rounded-xl border border-border px-2.5 py-1.5 text-center text-[11px] text-muted-foreground">—</span>
                )}
              </div>
            )
          })}
          {!plans && <Loader2 className="mx-auto mt-4 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Simulasi pembayaran (provider mock) */}
        {pending && pending.provider === 'mock' && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold">Simulasi pembayaran — {rp(pending.amount_idr)}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Mode demo (tanpa kunci gateway). Dengan MIDTRANS_SERVER_KEY, langkah ini diganti halaman Snap asli.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="rounded-xl" disabled={busy} onClick={() => completeMock('paid')}>Bayar sekarang</Button>
              <Button size="sm" variant="outline" className="rounded-xl border-border" disabled={busy} onClick={() => completeMock('cancelled')}>Batalkan</Button>
            </div>
          </div>
        )}
        {/* Provider nyata: instruksi menunggu Snap */}
        {pending && pending.provider === 'midtrans' && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs">
            Halaman pembayaran Midtrans terbuka di tab baru. Status pesanan diperiksa otomatis setiap 4 detik.
          </div>
        )}
      </section>

      {paid.length > 0 && (
        <section className="rounded-2xl border border-border bg-panel p-5 lg:col-span-2">
          <h2 className="font-display mb-3 text-xs font-bold tracking-widest text-muted-foreground">RIWAYAT PEMBAYARAN</h2>
          <div className="space-y-1.5">
            {paid.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-xs">
                <span>
                  Paket <b className="capitalize">{o.plan_id}</b> · {rp(o.amount_idr)} · {STATUS_LABEL[o.status]}
                </span>
                <span className="text-muted-foreground">{(o.paid_at || o.created_at).slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function AccountTab({ token, ws, name, onLoggedOut }: { token: string; ws: string; name: string; onLoggedOut: () => void }) {
  const [profile, setProfile] = useState({ full_name: name, timezone: 'Asia/Jakarta', locale: 'id-ID' })
  const [saved, setSaved] = useState(false)
  const [health, setHealth] = useState<{ ai_provider: string; uptime_s: number; counts: Record<string, number> } | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState(false)

  const reloadUsage = useCallback(() => {
    api<Usage>(`/account/usage?workspace_id=${ws}`, { token }).then(setUsage).catch(() => {})
  }, [token, ws])

  useEffect(() => {
    api<{ ai_provider: string; uptime_s: number; counts: Record<string, number> }>('/health', { token }).then(setHealth).catch(() => {})
    reloadUsage()
  }, [token, reloadUsage])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/users/me', { method: 'PATCH', token, body: JSON.stringify(profile) })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setBusy(false)
    }
  }

  const exportData = async () => {
    const req = await api<{ export_id: string; download_url: string }>('/account/export', { token })
    const data = await api(`/account/export/${req.export_id}`, { token })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `orbit-export-${req.export_id.slice(0, 8)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirmText !== 'HAPUS AKUN' || busy) return
    setBusy(true)
    try {
      await api('/account', { method: 'DELETE', token, body: JSON.stringify({ confirm_text: confirmText }) })
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(`${TOKEN_KEY}_ctx`)
      onLoggedOut()
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50'
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-panel p-5">
        <h2 className="font-display mb-3 text-xs font-bold tracking-widest text-muted-foreground">PROFIL</h2>
        <form onSubmit={saveProfile} className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Nama</span>
            <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Zona waktu</span>
            <select value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })} className={input}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Bahasa</span>
            <select value={profile.locale} onChange={(e) => setProfile({ ...profile, locale: e.target.value })} className={input}>
              <option value="id-ID">Indonesia</option>
              <option value="en">English</option>
            </select>
          </label>
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" className="rounded-xl" disabled={busy}>Simpan</Button>
            {saved && <span className="text-xs text-green">Tersimpan ✓</span>}
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-panel p-5">
        <h2 className="font-display mb-3 text-xs font-bold tracking-widest text-muted-foreground">PAKET & STATUS SERVER</h2>
        {usage && (
          <div className="mb-3 rounded-xl border border-primary/25 bg-primary/5 px-3.5 py-2.5 text-xs">
            <b>{usage.plan.name}</b> · {usage.plan.status}
            {usage.plan.current_period_end ? ` · s.d. ${usage.plan.current_period_end.slice(0, 10)}` : ''}
          </div>
        )}
        {health && (
          <div className="space-y-1 text-[11px] text-muted-foreground">
            <div>Provider AI: <b className="text-foreground">{health.ai_provider}</b></div>
            <div>Server hidup: <b className="text-foreground">{health.uptime_s}s</b> · dokumen: {health.counts.documents} · chunk: {health.counts.chunks}</div>
          </div>
        )}
        <h2 className="font-display mb-2 mt-5 text-xs font-bold tracking-widest text-muted-foreground">DATA &amp; PRIVASI</h2>
        <Button variant="outline" size="sm" className="rounded-xl border-border" onClick={exportData}>
          Ekspor data saya (JSON)
        </Button>
        <h2 className="font-display mb-2 mt-5 text-xs font-bold tracking-widest text-destructive">ZONA BAHAYA</h2>
        <form onSubmit={deleteAccount} className="space-y-2">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Penghapusan langsung: semua workspace, dokumen, dan file turunan dihapus (kaskade). Ketik <b className="text-foreground">HAPUS AKUN</b> untuk konfirmasi.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="HAPUS AKUN"
            className={cn(input, 'font-mono text-xs')}
          />
          <Button type="submit" variant="destructive" size="sm" className="rounded-xl" disabled={confirmText !== 'HAPUS AKUN' || busy}>
            Hapus akun permanen
          </Button>
        </form>
      </section>

      <BillingSection token={token} ws={ws} currentPlanId={usage?.plan.id} onPaid={reloadUsage} />
    </div>
  )
}

/* ---------------- Console shell ---------------- */

/* Umpan balik beta (docs/08: beta user feedback channel). */
function FeedbackDialog({ token, onClose }: { token: string; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const sel = 'w-full rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || busy) return
    setBusy(true)
    try {
      await api('/feedback', { method: 'POST', token, body: JSON.stringify({ message, context: 'console-web' }) })
      toast.success('Terima kasih! Umpan balik Anda masuk ke antrean review.')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim umpan balik')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl">
        <h2 className="font-display text-lg font-bold">Kirim umpan balik beta</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Bug, ide fitur, atau hal yang membingungkan — semuanya membantu. Maksimal 5 pesan per jam.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Contoh: hasil ekstraksi kuitansi salah baca tanggal…"
            className={cn(sel, 'resize-none')}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="rounded-xl" disabled={!message.trim() || busy}>
              Kirim
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-xl border-border" onClick={onClose}>
              Batal
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

/* Onboarding (docs/08 Product): pilih zona waktu & bahasa saat pertama masuk. */
const ONBOARDING_TZ = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'UTC']

function OnboardingDialog({ token, onDone }: { token: string; onDone: () => void }) {
  const [tz, setTz] = useState('Asia/Jakarta')
  const [locale, setLocale] = useState('id-ID')
  const [notif, setNotif] = useState(true)
  const [busy, setBusy] = useState(false)
  const sel = 'w-full rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-sm outline-none focus:border-primary/50'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/users/me/onboarding', { method: 'POST', token, body: JSON.stringify({ timezone: tz, locale, notification_optin: notif }) })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl border border-border bg-panel p-6 shadow-2xl">
        <h2 className="font-display text-lg font-bold">Selamat datang di ORBIT 👋</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Hidup Anda, tersambung — mulai dengan dua preferensi kecil. Semua bisa diubah kapan saja di tab Akun.
        </p>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Zona waktu</span>
            <select value={tz} onChange={(e) => setTz(e.target.value)} className={sel}>
              {ONBOARDING_TZ.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">Bahasa</span>
            <select value={locale} onChange={(e) => setLocale(e.target.value)} className={sel}>
              <option value="id-ID">Indonesia</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="flex items-center gap-2.5 rounded-xl border border-border bg-panel-2 px-3.5 py-2.5 text-xs">
            <input type="checkbox" checked={notif} onChange={(e) => setNotif(e.target.checked)} className="accent-primary" />
            <span className="text-muted-foreground">Pengingat lewat notifikasi (saat fitur tersedia di beta)</span>
          </label>
          <Button type="submit" size="sm" className="w-full rounded-xl" disabled={busy}>
            Mulai pakai ORBIT
          </Button>
        </form>
      </section>
    </div>
  )
}

const TABS = [
  { id: 'ringkasan', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'dokumen', label: 'Dokumen', icon: Inbox },
  { id: 'memory', label: 'Memory', icon: Search },
  { id: 'assistant', label: 'Assistant', icon: BrainCircuit },
  { id: 'events', label: 'Events', icon: Wand2 },
  { id: 'tindakan', label: 'Tindakan', icon: ClipboardCheck },
  { id: 'akun', label: 'Akun', icon: Settings },
] as const

export default function Console() {
  const [auth, setAuth] = useState<{ token: string; ws: string; name: string } | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null
    try {
      return JSON.parse(localStorage.getItem(`${TOKEN_KEY}_ctx`) || 'null')
    } catch {
      return null
    }
  })
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('ringkasan')
  const [pendingCount, setPendingCount] = useState(0)

  const refreshBadges = useCallback(async () => {
    if (!auth) return
    try {
      const d = await api<{ pending_approvals: number }>(`/dashboard?workspace_id=${auth.ws}`, { token: auth.token })
      setPendingCount(d.pending_approvals)
    } catch {
      /* token kedaluwarsa → biarkan UI menangani saat aksi berikutnya */
    }
  }, [auth])

  useEffect(() => {
    refreshBadges()
  }, [refreshBadges])

  const onAuthed = ({ token, ws, name }: { token: string; ws: string; name: string }) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(`${TOKEN_KEY}_ctx`, JSON.stringify({ token, ws, name }))
    setAuth({ token, ws, name })
  }

  const logout = () => {
    api('/auth/logout', { method: 'POST', token: auth?.token }).catch(() => {})
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(`${TOKEN_KEY}_ctx`)
    setAuth(null)
  }

  // Onboarding: cek sekali per sesi — tampilkan bila pengguna belum selesai onboarding.
  const [needOnboarding, setNeedOnboarding] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  useEffect(() => {
    if (!auth) return
    api<{ onboarded_at: string | null }>('/users/me', { token: auth.token })
      .then((me) => setNeedOnboarding(!me.onboarded_at))
      .catch(() => {})
  }, [auth])

  // Pengingat lewat notifikasi browser (optin dari onboarding): polling 60s,
  // pengingat berstatus 'sent' yang belum terlihat → Notification API.
  useEffect(() => {
    if (!auth) return
    let stop = false
    const SEEN_KEY = 'orbit_notif_seen'
    const readSeen = (): string[] => {
      try {
        return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
      } catch {
        return []
      }
    }
    const tick = async () => {
      try {
        const me = await api<{ notification_optin: boolean; workspace_id?: string }>('/users/me', { token: auth.token })
        if (stop || !me.notification_optin || !me.workspace_id) return
        if (typeof Notification === 'undefined') return
        if (Notification.permission === 'default') {
          const p = await Notification.requestPermission()
          if (p !== 'granted') return
        }
        if (Notification.permission !== 'granted') return
        const rem = await api<{ data: { id: string; title: string; status: string; scheduled_at: string }[] }>(
          `/reminders?workspace_id=${me.workspace_id}`,
          { token: auth.token },
        )
        const seen = new Set(readSeen())
        const fresh = rem.data.filter(
          (r) => r.status === 'sent' && Date.now() - new Date(r.scheduled_at).getTime() < 15 * 60_000 && !seen.has(r.id),
        )
        for (const r of fresh.slice(0, 3)) {
          new Notification('ORBIT — pengingat', { body: r.title, tag: r.id })
          seen.add(r.id)
        }
        if (fresh.length) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)))
      } catch {
        /* polling ringan — abaikan kegagalan sementara */
      }
    }
    void tick()
    const t = setInterval(tick, 60_000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [auth])

  if (!auth) return <AuthScreen onAuthed={onAuthed} />

  return (
    <div className="min-h-screen bg-background">
      {needOnboarding && <OnboardingDialog token={auth.token} onDone={() => setNeedOnboarding(false)} />}
      {showFeedback && <FeedbackDialog token={auth.token} onClose={() => setShowFeedback(false)} />}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4">
          <Logo size={24} wordmarkClassName="text-foreground" />
          <span className="rounded-full border border-border bg-panel px-2.5 py-1 text-[10px] font-bold tracking-widest text-muted-foreground">
            KONSOL · API v1
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">{auth.name}</span>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => setShowFeedback(true)} aria-label="Kirim umpan balik">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={logout} aria-label="Keluar">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
                tab === t.id ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.id === 'tindakan' && pendingCount > 0 && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{pendingCount}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === 'ringkasan' && (
          <RingkasanTab
            token={auth.token}
            ws={auth.ws}
            gotoTab={(t) => setTab(t)}
          />
        )}
        {tab === 'dokumen' && <DocumentsTab token={auth.token} ws={auth.ws} onChanged={refreshBadges} />}
        {tab === 'memory' && <MemoryTab token={auth.token} ws={auth.ws} />}
        {tab === 'assistant' && <AssistantTab token={auth.token} ws={auth.ws} />}
        {tab === 'events' && <EventsTab token={auth.token} ws={auth.ws} onChanged={refreshBadges} />}
        {tab === 'tindakan' && <ActionsTab token={auth.token} ws={auth.ws} onChanged={refreshBadges} />}
        {tab === 'akun' && (
          <AccountTab
            token={auth.token}
            ws={auth.ws}
            name={auth.name}
            onLoggedOut={() => setAuth(null)}
          />
        )}
      </main>

      <footer className="border-t border-border py-6 text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Network className="h-3.5 w-3.5" /> Data nyata di SQLite lokal · provider AI lokal-deterministik
          (slot provider OCR/LLM nyata tersedia di server/ai)
        </p>
      </footer>
    </div>
  )
}

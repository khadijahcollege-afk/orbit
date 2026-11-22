import { useState, type ReactNode } from 'react'
import { Link, NavLink, useNavigate } from 'react-router'
import {
  Bell,
  BrainCircuit,
  CalendarClock,
  ClipboardCheck,
  Inbox,
  LayoutDashboard,
  Network,
  Plus,
  Search,
  Sparkles,
  History,
  Paperclip,
  Image,
  FileText,
  Mic,
  Link2,
  Type,
} from 'lucide-react'
import { Logo } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { hariIni } from '@/lib/format'
import { COMMITMENTS, USER_NAME } from '@/lib/data'
import { cn } from '@/lib/utils'

export const APP_NAV = [
  { to: '/app', label: 'Beranda', icon: LayoutDashboard, end: true },
  { to: '/app/inbox', label: 'Inbox Universal', icon: Inbox },
  { to: '/app/timeline', label: 'Life Timeline', icon: History },
  { to: '/app/commitments', label: 'Komitmen', icon: CalendarClock },
  { to: '/app/actions', label: 'Action Center', icon: ClipboardCheck },
  { to: '/app/graph', label: 'Knowledge Graph', icon: Network },
  { to: '/app/memory', label: 'Personal Memory', icon: BrainCircuit },
]

const CAPTURE_TYPES = [
  { id: 'screenshot', label: 'Screenshot', icon: Image, hint: 'Tangkapan chat & layar' },
  { id: 'foto', label: 'Foto dokumen', icon: Paperclip, hint: 'Kuitansi, kartu, dokumen' },
  { id: 'pdf', label: 'PDF & file', icon: FileText, hint: 'Kontrak, invoice, surat' },
  { id: 'suara', label: 'Pesan suara', icon: Mic, hint: 'Voice note & catatan lisan' },
  { id: 'tautan', label: 'Tautan', icon: Link2, hint: 'Artikel & halaman web' },
  { id: 'teks', label: 'Teks / catatan', icon: Type, hint: 'Tulis langsung' },
] as const

export function CaptureDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [picked, setPicked] = useState<string>('screenshot')
  const [text, setText] = useState('')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border bg-panel sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-lg">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
            Masukkan apa saja — ORBIT yang mengurusi sisanya
          </DialogTitle>
          <DialogDescription>
            Screenshot, foto, PDF, pesan suara, tautan, atau teks. AI akan membaca, mengklasifikasi,
            dan menghubungkannya ke urusan yang relevan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {CAPTURE_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setPicked(t.id)}
              className={cn(
                'group rounded-xl border p-3 text-left transition-all',
                picked === t.id
                  ? 'border-primary/60 bg-primary/10 ring-glow'
                  : 'border-line bg-panel-2 hover:border-primary/40',
              )}
            >
              <t.icon
                className={cn(
                  'mb-1.5 h-4.5 w-4.5',
                  picked === t.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
              />
              <div className="text-xs font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[10.5px] leading-tight text-muted-foreground">{t.hint}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-dashed border-line bg-panel-2 p-4 text-center text-sm text-muted-foreground">
          {picked === 'teks' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tulis catatan di sini… (contoh: ketemu Rina Kamis jam 10 di Arunika)"
              className="min-h-20 w-full resize-none bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            />
          ) : (
            <>
              <div className="font-display mb-1 text-sm font-semibold text-foreground">
                Tarik & letakkan file di sini
              </div>
              <div className="text-xs">atau tempel dari clipboard · maks 25 MB</div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">Privasi</span>{' '}
            Diproses di perangkat Anda dulu, cloud hanya bila perlu.
          </div>
          <Button
            onClick={() => {
              onOpenChange(false)
              toast.success('Masuk ke Inbox Universal', {
                description: 'ORBIT mulai membaca dan menghubungkan item Anda.',
              })
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" /> Capture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AppShell({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  const [captureOpen, setCaptureOpen] = useState(false)
  const navigate = useNavigate()
  const pendingCount = COMMITMENTS.filter((c) => c.status === 'menunggu').length

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 lg:flex">
        <Link to="/" className="mb-6 flex items-center px-2">
          <Logo size={26} wordmarkClassName="text-foreground" />
        </Link>

        <nav className="flex-1 space-y-1">
          {APP_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary/15 text-foreground shadow-[inset_0_0_0_1px_hsl(258_88%_67%/.3)]'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.label === 'Action Center' && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  6
                </span>
              )}
              {item.label === 'Komitmen' && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 to-transparent p-3.5">
          <div className="font-display text-sm font-semibold">Paket Plus · Trial</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">13 hari tersisa</div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[56%] rounded-full bg-gradient-to-r from-primary to-cyan" />
          </div>
          <Button size="sm" className="mt-3 w-full rounded-lg text-xs">
            Upgrade ke Pro
          </Button>
        </div>

        <div className="mt-3 flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-sidebar-accent">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-magenta text-xs font-bold text-white">
            {USER_NAME[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">{USER_NAME} Pratama</div>
            <div className="text-[10px] text-muted-foreground">andi@orbit.id</div>
          </div>
        </div>
      </aside>

      {/* Kolom utama */}
      <div className="flex min-h-screen w-full flex-col lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <Link to="/" className="lg:hidden">
            <Logo size={22} />
          </Link>

          <button
            onClick={() => navigate('/app/memory')}
            className="group hidden h-9.5 max-w-md flex-1 items-center gap-2.5 rounded-xl border border-border bg-panel px-3.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:flex"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">
              Tanya memori Anda… <span className="text-muted-foreground/60">(mis. pengeluaran bulan lalu)</span>
            </span>
            <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-semibold">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden text-right text-xs leading-tight text-muted-foreground xl:block">
              <div className="font-medium text-foreground">{hariIni()}</div>
              <div>Semuanya aman &amp; tersinkron</div>
            </div>
            <Button variant="ghost" size="icon" className="relative rounded-xl">
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan" />
            </Button>
            <Button onClick={() => setCaptureOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4" /> Capture
            </Button>
          </div>
        </header>

        {/* Konten */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-16 pt-6 md:px-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>

      <CaptureDialog open={captureOpen} onOpenChange={setCaptureOpen} />
    </div>
  )
}

/* Kartu panel dasar yang dipakai lintas halaman */
export function Panel({
  children,
  className,
  title,
  subtitle,
  icon,
  action,
  index,
}: {
  children: ReactNode
  className?: string
  title: string
  subtitle?: string
  icon?: ReactNode
  action?: ReactNode
  index?: number
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border bg-panel p-5 transition-colors hover:border-primary/25',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {index != null && (
            <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
              {index}
            </span>
          )}
          {icon}
          <div>
            <h2 className="font-display text-sm font-semibold tracking-wide">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

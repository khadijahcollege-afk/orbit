import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Briefcase,
  FileCheck2,
  HeartPulse,
  Home,
  Mail,
  Receipt,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { LIFE_EVENT, TIMELINE, type TimelineEvent } from '@/lib/data'
import { tanggalPanjang, tanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

const CAT_META: Record<TimelineEvent['category'], { label: string; icon: LucideIcon; color: string }> = {
  kepindahan: { label: 'Kepindahan', icon: Home, color: 'text-amber' },
  keuangan: { label: 'Keuangan', icon: Receipt, color: 'text-green' },
  sosial: { label: 'Sosial', icon: Users, color: 'text-magenta' },
  kesehatan: { label: 'Kesehatan', icon: HeartPulse, color: 'text-cyan' },
  pekerjaan: { label: 'Pekerjaan', icon: Briefcase, color: 'text-primary' },
  dokumen: { label: 'Dokumen', icon: FileCheck2, color: 'text-muted-foreground' },
}

const FILTERS = ['semua', 'kepindahan', 'keuangan', 'sosial', 'kesehatan', 'pekerjaan', 'dokumen'] as const

export default function TimelinePage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('semua')
  const events = TIMELINE.filter((e) => filter === 'semua' || e.category === filter)

  return (
    <AppShell
      title="Life Timeline"
      subtitle="Riwayat kehidupan Anda — setiap peristiwa tersambung ke orang, dokumen, dan urusannya."
    >
      {/* Life Event Engine banner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-panel to-magenta/10 p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="font-display text-[11px] font-bold tracking-widest text-primary">
              LIFE EVENT ENGINE
            </div>
            <div className="font-display mt-1 text-xl font-bold">Urusan aktif: {LIFE_EVENT.name}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Dipicu oleh satu kalimat — {LIFE_EVENT.trigger} ORBIT menyusun rencana, memantau
              tenggatnya, dan menghubungkan setiap dokumen yang masuk.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1.5 flex justify-between text-xs">
              <span className="text-muted-foreground">Progres rencana</span>
              <span className="font-semibold">{Math.round(LIFE_EVENT.progress * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-magenta to-cyan"
                style={{ width: `${Math.round(LIFE_EVENT.progress * 100)}%` }}
              />
            </div>
            <div className="mt-3 space-y-1.5">
              {LIFE_EVENT.steps.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      s.done
                        ? 'border-green bg-green/20 text-green'
                        : 'border-muted-foreground/40 text-transparent',
                    )}
                  >
                    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="none">
                      <path d="M1.5 5.5L4 8L8.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className={cn('flex-1 leading-snug', s.done ? 'text-muted-foreground line-through' : '')}>
                    {s.label}
                  </span>
                  {s.hint && <span className="text-[10px] text-amber">{s.hint}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter */}
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-all',
              filter === f
                ? 'border-primary/60 bg-primary/15 text-foreground'
                : 'border-border bg-panel text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {f === 'semua' ? 'Semua kategori' : CAT_META[f].label}
          </button>
        ))}
      </div>

      {/* Garis waktu */}
      <div className="relative pl-8 sm:pl-10">
        <div className="absolute inset-y-4 left-3 w-px bg-gradient-to-b from-primary/50 via-border to-transparent sm:left-5" />
        <div className="space-y-4">
          {events.map((e, idx) => {
            const meta = CAT_META[e.category]
            return (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.4) }}
                className="relative"
              >
                <span
                  className={cn(
                    'absolute -left-8 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-panel sm:-left-10',
                  )}
                >
                  <meta.icon className={cn('h-3.5 w-3.5', meta.color)} />
                </span>
                <article
                  className={cn(
                    'rounded-2xl border bg-panel p-4 transition-colors hover:border-primary/30',
                    e.done ? 'border-border/60 opacity-75' : 'border-border',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={cn('text-sm font-semibold', e.done && 'line-through')}>{e.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {meta.label}
                      </span>
                      <time className="text-[11px] text-muted-foreground">{tanggal(e.date)}</time>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{e.description}</p>
                  {e.refs && e.refs.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {e.refs.map((r) => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-panel-2 px-2 py-0.5 text-[10.5px] text-foreground/80"
                        >
                          <Mail className="hidden h-3 w-3" />
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              </motion.div>
            )
          })}
        </div>
      </div>

      <p className="mt-6 pl-2 text-xs text-muted-foreground">
        Baru sampai sini — peristiwa lebih lama diarsipkan otomatis dan tetap bisa dicari lewat Personal Memory.
        Terakhir diperbarui {tanggalPanjang('2026-11-22')}.
      </p>
    </AppShell>
  )
}

import { motion } from 'framer-motion'
import {
  CalendarClock,
  CircleCheck,
  Clock3,
  FileWarning,
  HandCoins,
  Handshake,
  Receipt,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { COMMITMENTS, COMMITMENT_KIND_META, type CommitmentKind } from '@/lib/data'
import { relatif, tanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<CommitmentKind, LucideIcon> = {
  janji: Handshake,
  tagihan: Receipt,
  deadline: FileWarning,
  pembayaran: HandCoins,
  pengembalian: Undo2,
  'masa-berlaku': CalendarClock,
}

function sisaHari(iso: string): number {
  return Math.round((new Date(iso).getTime() - new Date(2026, 10, 22).getTime()) / 86400000)
}

function DueChip({ due, time }: { due: string; time?: string }) {
  const d = sisaHari(due)
  const urgent = d <= 7
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold',
        urgent ? 'bg-amber/15 text-amber' : 'bg-muted text-muted-foreground',
      )}
    >
      <Clock3 className="h-3 w-3" />
      {relatif(due)}
      {time ? ` · ${time}` : ''}
    </span>
  )
}

export default function CommitmentsPage() {
  const active = COMMITMENTS.filter((c) => c.status === 'menunggu')
  // kelompokkan berdasar minggu
  const thisWeek = active.filter((c) => sisaHari(c.due) <= 6)
  const later = active.filter((c) => sisaHari(c.due) > 6)

  return (
    <AppShell
      title="Commitment Tracker"
      subtitle="Janji, tagihan, deadline, pengembalian, dan masa berlaku dokumen — terdeteksi dari informasi yang masuk."
    >
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Komiten aktif', value: String(active.length), note: 'semua terdeteksi otomatis' },
          { label: 'Dalam 7 hari', value: String(thisWeek.length), note: 'perlu perhatian' },
          { label: 'Terlambat', value: '0', note: 'bersih sejak Oktober' },
          { label: 'Diselesaikan (30 hari)', value: '11', note: '+3 vs bulan sebelumnya' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            className="rounded-2xl border border-border bg-panel p-4"
          >
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="font-display mt-1 text-2xl font-bold">{s.value}</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{s.note}</div>
          </motion.div>
        ))}
      </div>

      {[
        { title: 'MINGGU INI', items: thisWeek },
        { title: 'MINGGU DEPAN & SETERUSNYA', items: later },
      ].map((group) => (
        <section key={group.title} className="mb-6">
          <h2 className="font-display mb-3 text-xs font-bold tracking-widest text-muted-foreground">
            {group.title}
          </h2>
          <div className="space-y-3">
            {group.items.map((c, idx) => {
              const Icon = KIND_ICON[c.kind]
              return (
                <motion.article
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.04, 0.3), duration: 0.3 }}
                  className="group rounded-2xl border border-border bg-panel p-4 transition-colors hover:border-primary/30"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2">
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold">{c.title}</h3>
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {COMMITMENT_KIND_META[c.kind].label}
                        </span>
                        {c.auto && (
                          <span className="rounded-md bg-cyan/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan">
                            auto-detected
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.party ? `Dengan ${c.party} · ` : ''}
                        {c.source}
                      </p>
                      {c.note && (
                        <p className="mt-1.5 rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground/85">
                          <span className="font-semibold text-primary">Catatan ORBIT:</span> {c.note}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <DueChip due={c.due} time={c.time} />
                      <div className="text-[10px] text-muted-foreground">{tanggal(c.due, true)}</div>
                    </div>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </section>
      ))}

      <div className="rounded-2xl border border-green/25 bg-green/5 p-4 text-sm">
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 h-4.5 w-4.5 shrink-0 text-green" />
          <p className="text-xs leading-relaxed text-foreground/90">
            <b>Validasi tanggal sebelum disimpan</b> — setiap pengingat yang diusulkan ORBIT mencantumkan
            sumber asalnya (chat, invoice, foto) dan tanggalnya dicek silang sebelum masuk jadwal, sehingga
            risiko pengingat salah berkurang.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

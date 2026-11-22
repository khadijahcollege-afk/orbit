import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  CalendarPlus,
  ClipboardCheck,
  FilePen,
  HandCoins,
  ShieldCheck,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { PROPOSED_ACTIONS, type ActionKind } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const KIND_ICON: Record<ActionKind, LucideIcon> = {
  pengingat: Bell,
  agenda: CalendarPlus,
  kontak: UserPlus,
  dokumen: FilePen,
  pembayaran: HandCoins,
}

interface Resolved {
  id: string
  decision: 'setuju' | 'tolak'
}

export default function ActionsPage() {
  const [resolved, setResolved] = useState<Resolved[]>([])

  const pending = PROPOSED_ACTIONS.filter((p) => !resolved.some((r) => r.id === p.id))
  const doneCount = resolved.filter((r) => r.decision === 'setuju').length

  const decide = (id: string, decision: 'setuju' | 'tolak') => {
    setResolved((r) => [...r, { id, decision }])
    const a = PROPOSED_ACTIONS.find((p) => p.id === id)
    if (decision === 'setuju') {
      toast.success('Aksi disetujui', { description: a?.title })
    } else {
      toast('Aksi ditolak', {
        description: 'ORBIT mempelajari preferensi Anda untuk usulan serupa.',
      })
    }
  }

  return (
    <AppShell
      title="Action Center"
      subtitle="ORBIT mengubah informasi menjadi tindakan — tetapi hanya berjalan setelah Anda menyetujui."
    >
      {/* Banner persetujuan */}
      <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-panel to-transparent p-4">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <p className="min-w-64 flex-1 text-sm leading-relaxed text-foreground/90">
          <b>Prinsip agentic ORBIT:</b> mengirim pesan, melakukan pembayaran, atau membagikan dokumen
          selalu memerlukan persetujuan eksplisit. Anda selalu bisa melihat sumber dan tingkat keyakinan AI.
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1 font-semibold">{pending.length} menunggu</span>
          <span className="rounded-full bg-green/15 px-2.5 py-1 font-semibold text-green">{doneCount} disetujui</span>
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {pending.map((a) => {
            const Icon = KIND_ICON[a.kind]
            return (
              <motion.article
                key={a.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-border bg-panel p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold leading-snug">{a.title}</h3>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          a.urgency === 'tinggi'
                            ? 'bg-amber/15 text-amber'
                            : a.urgency === 'sedang'
                              ? 'bg-cyan/15 text-cyan'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {a.urgency}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{a.detail}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span>
                        Sumber: <span className="text-foreground/80">{a.source}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        Yakin AI
                        <span className="relative inline-block h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-cyan"
                            style={{ width: `${a.confidence}%` }}
                          />
                        </span>
                        <b className="text-foreground">{a.confidence}%</b>
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <Button size="sm" className="rounded-lg" onClick={() => decide(a.id, 'setuju')}>
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => decide(a.id, 'tolak')}
                    >
                      <X className="h-3.5 w-3.5" /> Tolak
                    </Button>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </AnimatePresence>

        {pending.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-green/25 bg-green/5 p-8 text-center"
          >
            <ClipboardCheck className="mx-auto h-6 w-6 text-green" />
            <div className="font-display mt-2 font-semibold">Semua aksi sudah Anda tinjau</div>
            <p className="mt-1 text-xs text-muted-foreground">
              {doneCount} aksi disetujui dan dijalankan dengan sumber yang tercatat.
            </p>
            <Button variant="outline" size="sm" className="mt-4 rounded-lg" onClick={() => setResolved([])}>
              Muat ulang demo
            </Button>
          </motion.div>
        )}
      </div>
    </AppShell>
  )
}

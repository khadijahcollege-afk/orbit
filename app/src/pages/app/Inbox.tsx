import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Inbox, Link2, Network, Plus, Sparkles } from 'lucide-react'
import { AppShell, Panel } from '@/components/app-shell'
import { CaptureIcon } from '@/components/capture-icon'
import { Button } from '@/components/ui/button'
import { INBOX_ITEMS, type CaptureType } from '@/lib/data'
import { jam, waktuLalu } from '@/lib/format'
import { cn } from '@/lib/utils'

const FILTERS: { id: CaptureType | 'semua'; label: string }[] = [
  { id: 'semua', label: 'Semua' },
  { id: 'screenshot', label: 'Screenshot' },
  { id: 'foto', label: 'Foto' },
  { id: 'pdf', label: 'PDF & File' },
  { id: 'suara', label: 'Suara' },
  { id: 'tautan', label: 'Tautan' },
  { id: 'teks', label: 'Teks' },
]

const STATUS_META = {
  baru: { label: 'Baru', cls: 'bg-cyan/15 text-cyan' },
  diproses: { label: 'Diproses AI', cls: 'bg-amber/15 text-amber' },
  terhubung: { label: 'Terhubung', cls: 'bg-green/15 text-green' },
} as const

export default function InboxPage() {
  const [filter, setFilter] = useState<CaptureType | 'semua'>('semua')
  const items = useMemo(
    () => (filter === 'semua' ? INBOX_ITEMS : INBOX_ITEMS.filter((i) => i.type === filter)),
    [filter],
  )

  return (
    <AppShell
      title="Inbox Universal"
      subtitle="Masukkan screenshot, foto, PDF, pesan suara, tautan, dan teks — semuanya dibaca, diklasifikasi, dan dihubungkan."
      actions={
        <Button className="rounded-xl">
          <Plus className="h-4 w-4" /> Capture baru
        </Button>
      }
    >
      {/* Alur capture → konteks → tindakan */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          {
            step: '1 · Capture',
            t: 'Masuk apa saja',
            d: 'Screenshot WA, kuitansi, PDF, voice note — satu pintu masuk.',
          },
          {
            step: '2 · Context Intelligence',
            t: 'Dibaca & dihubungkan',
            d: 'OCR + AI memahami isi lalu menautkannya ke orang, tempat, dan urusan.',
          },
          {
            step: '3 · Action Center',
            t: 'Jadi tindakan yang disetujui',
            d: 'Tanggal, tagihan, dan janji muncul sebagai usulan yang bisa Anda setujui.',
          },
        ].map((s) => (
          <div key={s.step} className="rounded-2xl border border-border bg-panel p-4">
            <div className="font-display text-[11px] font-bold tracking-widest text-primary">{s.step}</div>
            <div className="mt-1 text-sm font-semibold">{s.t}</div>
            <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.d}</div>
          </div>
        ))}
      </div>

      {/* Filter tipe */}
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all',
              filter === f.id
                ? 'border-primary/60 bg-primary/15 text-foreground'
                : 'border-border bg-panel text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            {f.id !== 'semua' && <CaptureIcon type={f.id} className="mr-1.5 inline h-3 w-3" />}
            {f.label}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {items.length} item · {INBOX_ITEMS.filter((i) => i.status === 'terhubung').length} terhubung ke urusan
        </span>
      </div>

      {/* Daftar item */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.map((it, idx) => (
            <motion.article
              key={it.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="group rounded-2xl border border-border bg-panel p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-2">
                  <CaptureIcon type={it.type} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold leading-snug">{it.title}</h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_META[it.status].cls)}>
                      {STATUS_META[it.status].label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{it.excerpt}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {it.aiTags.map((t) => (
                      <span
                        key={t}
                        className="rounded-md bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-foreground/80"
                      >
                        #{t.toLowerCase().replace(/\s+/g, '-')}
                      </span>
                    ))}
                    {it.urusan && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-primary">
                        <Link2 className="h-3 w-3" /> {it.urusan}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] text-muted-foreground">{waktuLalu(it.time)}</div>
                  <div className="text-[10px] text-muted-foreground/60">{jam(it.time)}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[11px] text-muted-foreground">
                <span>{it.source}</span>
                <button className="inline-flex items-center gap-1 font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Lihat konteks <Sparkles className="h-3 w-3" />
                </button>
              </div>
            </motion.article>
          ))}
        </div>

        {/* Kolom kanan: dropzone + ringkasan */}
        <div className="space-y-4">
          <Panel title="CAPTURE CEPAT" icon={<Inbox className="h-4.5 w-4.5 text-primary" />}>
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
              <div className="font-display text-sm font-semibold">Tarik file ke sini</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Screenshot · foto · PDF · audio · tautan
              </div>
              <Button size="sm" variant="outline" className="mt-3 rounded-lg border-primary/40 text-xs">
                Pilih file
              </Button>
            </div>
            <div className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <p>· OCR berjalan lokal untuk dokumen berisi data sensitif.</p>
              <p>· Tanggal & nominal divalidasi sebelum disimpan sebagai pengingat.</p>
              <p>· Semua usulan tindakan menunggu persetujuan Anda.</p>
            </div>
          </Panel>

          <Panel title="URUSAN YANG TERBENTUK">
            <div className="space-y-2.5">
              {['Pindah Rumah', 'Beli Laptop', 'Medical Check-up Papa'].map((u, i) => (
                <div key={u} className="flex items-center justify-between rounded-xl border border-line bg-panel-2 px-3.5 py-3">
                  <div>
                    <div className="text-sm font-semibold">{u}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[
                        '5 dokumen · 3 pengingat · 2 orang',
                        '2 dokumen · garansi aktif s.d. Nov 2027',
                        '1 pengingat · 2 orang · 1 lokasi',
                      ][i]}
                    </div>
                  </div>
                  <Network className="h-4 w-4 text-magenta" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  )
}

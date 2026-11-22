import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import {
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Hand,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { AppShell, Panel } from '@/components/app-shell'
import { CaptureIcon } from '@/components/capture-icon'
import { KnowledgeGraph } from '@/components/knowledge-graph'
import { Button } from '@/components/ui/button'
import {
  BILLS_DUE,
  COMMITMENTS,
  INBOX_ITEMS,
  LIFE_EVENT,
  PROPOSED_ACTIONS,
  SPENDING_6M,
  SAVINGS_FOUND,
  USER_NAME,
} from '@/lib/data'
import { hariIni, jam, relatif, rupiah, tanggal } from '@/lib/format'
import { cn } from '@/lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
}

function Container({ children, delay, className }: { children: React.ReactNode; delay: number; className?: string }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.45, delay, ease: 'easeOut' }} className={className}>
      {children}
    </motion.div>
  )
}

export default function Dashboard() {
  const urgensi = PROPOSED_ACTIONS.filter((a) => a.urgency === 'tinggi').length
  const komitmen = COMMITMENTS.slice(0, 4)

  return (
    <AppShell
      title={`Selamat pagi, ${USER_NAME} 👋`}
      subtitle={hariIni() + ' · Ini yang ORBIT siapkan untuk hari Anda.'}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* 1 — Brief Pagi */}
        <Container delay={0} className="xl:row-span-2">
          <Panel
            index={1}
            title="BRIEF PAGI"
            subtitle="3 prioritas teratas hari ini"
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary hover:text-primary">
                <Link to="/app/timeline">Buka brief <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            }
            className="flex h-full flex-col"
          >
            <ul className="flex-1 space-y-2.5">
              {[
                { t: 'Konfirmasi deposit sudah diterima Bu Wati', d: 'Urusan Pindah Rumah · kuitansi 20 Nov terhubung', c: 'bg-primary' },
                { t: 'Cek berkas SIM sebelum ke Samsat', d: 'Kadaluarsa 5 Des · saran mulai 24 Nov', c: 'bg-amber' },
                { t: 'Tulis draf proposal Studio Kata', d: 'Deadline 2 Des · brief dari email 10 Nov', c: 'bg-cyan' },
              ].map((p) => (
                <li key={p.t} className="group flex items-start gap-3 rounded-xl border border-line bg-panel-2 p-3 transition-colors hover:border-primary/35">
                  <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', p.c)} />
                  <div>
                    <div className="text-sm font-medium leading-snug">{p.t}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{p.d}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-cyan/25 bg-cyan/10 p-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
              <p className="text-xs leading-relaxed text-foreground/90">
                <span className="font-semibold">Context Intelligence:</span> IPL apartemen Rp 470.000
                terakhir berakhir 30 Nov — setelah pindah, ORBIT tidak akan menjadwalkannya lagi.
              </p>
            </div>
          </Panel>
        </Container>

        {/* 2 — Action Center */}
        <Container delay={0.06}>
          <Panel
            index={2}
            title="ACTION CENTER"
            subtitle={`${PROPOSED_ACTIONS.length} aksi menunggu persetujuan Anda`}
            icon={<ClipboardCheck className="h-4.5 w-4.5 text-primary" />}
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary hover:text-primary">
                <Link to="/app/actions">Tinjau <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {PROPOSED_ACTIONS.slice(0, 3).map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      Sumber: {a.source} · yakin {a.confidence}%
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide',
                      a.urgency === 'tinggi' ? 'bg-amber/15 text-amber' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {a.urgency}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-green" />
                {urgensi} berprioritas tinggi. Tidak ada aksi yang berjalan tanpa persetujuan Anda.
              </p>
            </div>
          </Panel>
        </Container>

        {/* 3 — Money */}
        <Container delay={0.12}>
          <Panel
            index={3}
            title="MONEY OVERVIEW"
            subtitle="Okt 2026 · semua dari kuitansi & tagihan tercatat"
            icon={<Wallet className="h-4.5 w-4.5 text-green" />}
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="font-display text-2xl font-bold tracking-tight">{rupiah(8420000)}</div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-green">
                  <ArrowUpRight className="h-3.5 w-3.5 rotate-45" /> −6% vs September
                </div>
              </div>
              <div className="h-16 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SPENDING_6M} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="spend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(152 62% 48%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(152 62% 48%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="bulan" hide />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(251 28% 9%)',
                        border: '1px solid hsl(248 20% 17%)',
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v) => [`${Number(v).toFixed(2)} jt`, 'Pengeluaran']}
                    />
                    <Area type="monotone" dataKey="nilai" stroke="hsl(152 62% 48%)" strokeWidth={2} fill="url(#spend)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 space-y-1.5">
              {BILLS_DUE.map((b) => (
                <div key={b.label} className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2 text-sm">
                  <span className="text-foreground/90">{b.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{rupiah(b.nilai)}</span>
                    <span className="text-[11px] text-amber">{tanggal(b.due)}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-green/25 bg-green/10 px-3 py-2 text-xs">
              <CircleCheck className="h-3.5 w-3.5 text-green" />
              ORBIT menemukan langganan jarang dipakai — hemat potensial <b className="ml-1">{rupiah(SAVINGS_FOUND)}/bln</b>
            </div>
          </Panel>
        </Container>

        {/* 4 — Komitmen terdekat */}
        <Container delay={0.18}>
          <Panel
            index={4}
            title="KOMITMEN TERDEKAT"
            subtitle="Terdeteksi otomatis dari chat, tagihan & dokumen"
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary hover:text-primary">
                <Link to="/app/commitments">Semua <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {komitmen.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel-2 p-3">
                  <div className="flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                    <span className="font-display text-[10px] font-bold uppercase leading-none text-muted-foreground">
                      {tanggal(c.due).split(' ')[0]}
                    </span>
                    <span className="font-display text-[13px] font-bold leading-tight text-foreground">
                      {tanggal(c.due).split(' ')[1]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {relatif(c.due)}
                      {c.time ? ` · ${c.time}` : ''}
                      {c.auto && ' · otomatis'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Container>

        {/* 5 — Capture terakhir */}
        <Container delay={0.24}>
          <Panel
            index={5}
            title="CAPTURE TERAKHIR"
            subtitle="Universal Inbox — masuk apa pun jadi terstruktur"
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary hover:text-primary">
                <Link to="/app/inbox">Inbox <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {INBOX_ITEMS.slice(0, 4).map((it) => (
                <div key={it.id} className="flex items-start gap-3 rounded-xl border border-line bg-panel-2 p-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <CaptureIcon type={it.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{it.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      <span>{waktuLaluShort(it.time)}</span>
                      {it.urusan && (
                        <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                          {it.urusan}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </Container>

        {/* 6 — Life Event aktif */}
        <Container delay={0.3}>
          <Panel
            index={6}
            title="LIFE EVENT AKTIF"
            subtitle={LIFE_EVENT.trigger}
            icon={<Lightbulb className="h-4.5 w-4.5 text-amber" />}
            className="h-full"
          >
            <div className="mb-1 flex items-baseline justify-between">
              <span className="font-display text-xl font-bold">{LIFE_EVENT.name}</span>
              <span className="text-xs text-muted-foreground">Target {tanggal(LIFE_EVENT.dueDate)}</span>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary via-magenta to-cyan"
                style={{ width: `${Math.round(LIFE_EVENT.progress * 100)}%` }}
              />
            </div>
            <div className="space-y-1.5">
              {LIFE_EVENT.steps.slice(0, 4).map((s) => (
                <div key={s.label} className="flex items-center gap-2.5 text-sm">
                  {s.done ? (
                    <CircleCheck className="h-4 w-4 shrink-0 text-green" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border-2 border-muted-foreground/40" />
                  )}
                  <span className={cn('flex-1 leading-snug', s.done ? 'text-muted-foreground line-through' : '')}>
                    {s.label}
                  </span>
                  {s.hint && <span className="shrink-0 text-[11px] text-amber">{s.hint}</span>}
                </div>
              ))}
            </div>
            <Link
              to="/app/timeline"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Lihat rencana lengkap <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>
        </Container>

        {/* 7 — Knowledge Graph preview */}
        <Container delay={0.36} className="md:col-span-2 xl:col-span-2">
          <Panel
            index={7}
            title="KNOWLEDGE GRAPH"
            subtitle="36 entitas · 30 hubungan — geser & klik node untuk menjelajah"
            icon={<BrainCircuit className="h-4.5 w-4.5 text-magenta" />}
            action={
              <Button asChild variant="ghost" size="sm" className="h-8 gap-1 text-xs text-primary hover:text-primary">
                <Link to="/app/graph">Penuhi layar <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            }
          >
            <div className="h-72 overflow-hidden rounded-xl border border-line bg-gradient-to-b from-panel-2 to-background">
              <KnowledgeGraph mini />
            </div>
          </Panel>
        </Container>

        {/* 8 — Personal Memory */}
        <Container delay={0.42} className="xl:col-span-3">
          <Panel
            index={8}
            title="PERSONAL MEMORY"
            subtitle="Jawaban dari data Anda sendiri, bukan tebakan AI"
            icon={<BrainCircuit className="h-4.5 w-4.5 text-cyan" />}
            className="h-full"
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {[
                'Berapa pengeluaran saya bulan lalu?',
                'Kapan terakhir saya perpanjang SIM?',
                'Apa pekerjaan yang belum selesai?',
              ].map((q) => (
                <Link
                  key={q}
                  to="/app/memory"
                  className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-panel-2 px-3.5 py-3 text-sm transition-colors hover:border-cyan/40 hover:bg-cyan/5"
                >
                  <span className="leading-snug">{q}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-cyan" />
                </Link>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
              <Check className="h-3.5 w-3.5 text-green" /> Setiap jawaban mencantumkan sumber dokumen.
            </div>
          </Panel>
        </Container>
      </div>

      {/* CTA strip */}
      <Container delay={0.48} className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/15 via-panel to-cyan/10 p-5">
          <div className="flex items-center gap-3">
            <Hand className="h-5 w-5 text-primary" />
            <div>
              <div className="font-display text-sm font-semibold">Semua informasi hari ini sudah terhubung.</div>
              <div className="text-xs text-muted-foreground">
                9 item baru diproses · 6 aksi menunggu persetujuan · 0 tenggat terlewat
              </div>
            </div>
          </div>
          <Button asChild variant="outline" className="rounded-xl border-primary/40">
            <Link to="/app/actions">Tinjau Action Center</Link>
          </Button>
        </div>
      </Container>
    </AppShell>
  )
}

function waktuLaluShort(iso: string): string {
  return relatif(iso) === 'Hari ini' ? `Hari ini ${jam(iso)}` : tanggal(iso)
}

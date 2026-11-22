import { type ReactNode } from 'react'
import { Link } from 'react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import {
  ArrowRight,
  Bell,
  BrainCircuit,
  CalendarClock,
  Check,
  FileText,
  Image,
  Inbox,
  Link2,
  Lock,
  Mail,
  MessageCircle,
  Mic,
  Network,
  Quote,
  ShieldCheck,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { Logo, OrbitMark } from '@/components/brand'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* helper reveal on scroll */
function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function SectionHead({
  kicker,
  title,
  desc,
}: {
  kicker: string
  title: ReactNode
  desc?: string
}) {
  return (
    <Reveal className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
      <div className="font-display text-[11px] font-bold tracking-[0.3em] text-primary">{kicker}</div>
      <h2 className="font-display mt-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
      {desc && <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">{desc}</p>}
    </Reveal>
  )
}

/* ---------------- NAV ---------------- */

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 md:px-6">
        <Link to="/" className="shrink-0">
          <Logo size={26} wordmarkClassName="text-foreground" />
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {[
            ['#fitur', 'Fitur'],
            ['#cara-kerja', 'Cara Kerja'],
            ['#life-event', 'Life Event Engine'],
            ['#harga', 'Harga'],
            ['#privasi', 'Privasi'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="rounded-xl text-sm">
            <Link to="/console">Masuk</Link>
          </Button>
          <Button asChild size="sm" className="rounded-xl text-sm">
            <Link to="/app">Buka Demo <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

/* ---------------- HERO ---------------- */

const HERO_CHIPS = [
  { icon: MessageCircle, label: 'WA Bu Wati', sub: 'deposit · kunci 30 Nov', pos: 'left-[2%] top-[16%]', color: 'text-green', delay: 0 },
  { icon: FileText, label: 'PDF kontrak sewa', sub: '12 halaman · dibaca AI', pos: 'right-[0%] top-[22%]', color: 'text-amber', delay: 0.4 },
  { icon: Image, label: 'Kuitansi laptop', sub: 'Rp 12.499.000', pos: 'left-[4%] bottom-[18%]', color: 'text-cyan', delay: 0.8 },
  { icon: Mic, label: 'Voice note Ibu', sub: 'MCU Papa · 3 Des', pos: 'right-[3%] bottom-[24%]', color: 'text-magenta', delay: 1.2 },
  { icon: Link2, label: 'Tautan artikel', sub: 'checklist pindahan', pos: 'left-[38%] top-[-2%]', color: 'text-primary', delay: 0.6 },
  { icon: Bell, label: 'Pengingat dibuat', sub: '28 Nov · 09.00', pos: 'right-[38%] bottom-[-3%]', color: 'text-amber', delay: 1 },
]

function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const yGlow = useTransform(scrollYProgress, [0, 1], [0, 120])

  return (
    <section ref={ref} className="relative overflow-hidden pt-16">
      <div className="bg-starfield pointer-events-none absolute inset-0 opacity-70" />
      <motion.div
        style={{ y: yGlow }}
        className="pointer-events-none absolute left-1/2 top-40 h-140 w-140 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-14 md:px-6 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Sistem operasi kehidupan pribadi
            </span>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
              Hidup Anda,{' '}
              <span className="bg-gradient-to-r from-primary via-magenta to-cyan bg-clip-text text-transparent text-glow">
                Tersambung.
              </span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Dokumen, aktivitas, jadwal, pengeluaran, komitmen, dan kebutuhan sehari-hari — masuk lewat
              satu pintu, dipahami AI, dan dihubungkan menjadi urusan yang tidak pernah terlewat.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="rounded-xl px-6 text-sm">
                <Link to="/app">Coba Dashboard Demo <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-xl px-6 text-sm border-border">
                <a href="#cara-kerja">Lihat cara kerjanya</a>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Gratis untuk memulai · tanpa kartu kredit · data Anda tidak dijual
            </p>
          </Reveal>
        </div>

        {/* Orbit visual */}
        <Reveal delay={0.3} className="relative mx-auto mt-12 max-w-3xl md:mt-16">
          <div className="relative mx-auto aspect-square w-full max-w-125">
            {/* lingkaran orbit */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
              <defs>
                <linearGradient id="ring1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="hsl(258 88% 67%)" stopOpacity="0.5" />
                  <stop offset="1" stopColor="hsl(304 76% 64%)" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="ring2" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="hsl(188 88% 56%)" stopOpacity="0.4" />
                  <stop offset="1" stopColor="hsl(258 88% 67%)" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ring1)" strokeWidth="0.3" strokeDasharray="1.5 2" />
              <circle cx="50" cy="50" r="33" fill="none" stroke="url(#ring2)" strokeWidth="0.3" />
              <circle cx="50" cy="50" r="20" fill="none" stroke="hsl(258 88% 67% / .25)" strokeWidth="0.3" strokeDasharray="1 1.5" />
              {/* satelit yang mengorbit */}
              <g className="origin-[50px_50px] animate-orbit-slow">
                <circle cx="96" cy="50" r="1.1" fill="hsl(188 88% 56%)" />
              </g>
              <g className="origin-[50px_50px] animate-orbit-rev">
                <circle cx="50" cy="17" r="0.9" fill="hsl(304 76% 64%)" />
              </g>
              <g className="origin-[50px_50px] animate-orbit-slower">
                <circle cx="70" cy="50" r="0.9" fill="hsl(258 88% 70%)" />
              </g>
            </svg>

            {/* inti ORBIT */}
            <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-primary/50 bg-panel shadow-[0_0_80px_hsl(258_88%_67%/.35)]">
              <OrbitMark size={38} />
              <span className="font-display mt-1 text-[10px] font-bold tracking-[0.25em]">ORBIT</span>
            </div>
            <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-glow-pulse rounded-full border border-primary/30" />

            {/* chip capture mengambang */}
            {HERO_CHIPS.map((c) => (
              <div key={c.label} className={cn('absolute z-10', c.pos)}>
                <div
                  className={cn(
                    'flex items-center gap-2.5 rounded-2xl border border-border bg-panel/95 px-3.5 py-2.5 shadow-[0_8px_32px_hsl(251_50%_4%/.8)] backdrop-blur',
                    'animate-float',
                  )}
                  style={{ animationDelay: `${c.delay}s` }}
                >
                  <c.icon className={cn('h-4 w-4 shrink-0', c.color)} />
                  <div className="leading-tight">
                    <div className="whitespace-nowrap text-xs font-semibold">{c.label}</div>
                    <div className="whitespace-nowrap text-[10px] text-muted-foreground">{c.sub}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* strip hasil */}
          <Reveal delay={0.2}>
            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-panel text-center">
              {[
                { v: '9', l: 'item masuk minggu ini' },
                { v: '3', l: 'urusan terbentuk otomatis' },
                { v: '0', l: 'tenggat terlewat' },
              ].map((s) => (
                <div key={s.l} className="px-3 py-4">
                  <div className="font-display text-2xl font-bold text-primary">{s.v}</div>
                  <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- MASALAH ---------------- */

function Problem() {
  const scattered = [
    { icon: MessageCircle, label: 'WhatsApp', note: 'janji & tagihan di chat' },
    { icon: Mail, label: 'Email', note: 'invoice & surat resmi' },
    { icon: Image, label: 'Galeri foto', note: 'kuitansi & dokumen' },
    { icon: CalendarClock, label: 'Kalender', note: 'sebagian jadwal saja' },
    { icon: FileText, label: 'PDF & file', note: 'kontrak, formulir' },
    { icon: Mic, label: 'Pesan suara', note: 'info penting tersembunyi' },
  ]
  return (
    <section className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead
          kicker="MASALAH YANG DISELESAIKAN"
          title={<>Informasi kehidupan tersebar <span className="text-muted-foreground">di mana-mana</span></>}
          desc="WhatsApp, email, galeri foto, kalender, PDF, dan berbagai aplikasi. Penting sekali, tapi tidak pernah bertemu satu sama lain."
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {scattered.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.05}>
              <div className="rounded-2xl border border-border bg-panel p-4 text-center opacity-80 transition-opacity hover:opacity-100">
                <s.icon className="mx-auto h-5 w-5 text-muted-foreground" />
                <div className="mt-2 text-xs font-semibold">{s.label}</div>
                <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{s.note}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2} className="mt-6 text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-primary/35 bg-gradient-to-r from-primary/12 via-panel to-cyan/10 px-6 py-4">
            <Wand2 className="h-5 w-5 text-primary" />
            <p className="text-sm text-foreground/90">
              ORBIT menjadikan semua itu <b>satu urusan yang tersambung</b> — dengan tanggal, orang, dan tindak lanjutnya.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- 5 KEMAMPUAN ---------------- */

const FEATURES = [
  {
    icon: Inbox,
    name: 'Universal Capture',
    tag: 'Masukkan apa saja',
    desc: 'Screenshot, foto dokumen, PDF, pesan suara, teks, dan tautan — semua lewat satu pintu masuk.',
    points: ['OCR + transkripsi suara', 'Klasifikasi otomatis', 'Tervalidasi sebelum disimpan'],
    accent: 'from-cyan/15 to-transparent',
    iconColor: 'text-cyan',
  },
  {
    icon: Network,
    name: 'Context Intelligence',
    tag: 'Memahami hubungan',
    desc: 'AI tidak sekadar membaca file — ia membangun hubungan antar-informasi hidup Anda.',
    points: ['Nama → orang → kegiatan', 'Kegiatan → tenggat', 'Tenggat → pengingat'],
    accent: 'from-primary/15 to-transparent',
    iconColor: 'text-primary',
  },
  {
    icon: Wand2,
    name: 'Life Event Engine',
    tag: 'Satu kalimat → rencana',
    desc: '"Saya mau pindah rumah bulan depan." Langsung jadi rencana: dokumen, anggaran, jadwal, dan pengingatnya.',
    points: ['Pindah rumah & kerja', 'Menikah & kuliah', 'Travel & beli kendaraan'],
    accent: 'from-magenta/15 to-transparent',
    iconColor: 'text-magenta',
  },
  {
    icon: Bell,
    name: 'Commitment Intelligence',
    tag: 'Tidak ada yang terlewat',
    desc: 'Janji bertemu, tagihan, deadline, pengembalian barang, dan masa berlaku dokumen terdeteksi otomatis.',
    points: ['Dari chat, email & dokumen', 'Validasi tanggal silang', 'Pengingat bertingkat'],
    accent: 'from-amber/15 to-transparent',
    iconColor: 'text-amber',
  },
  {
    icon: BrainCircuit,
    name: 'Personal Memory',
    tag: 'Tanya hidup Anda',
    desc: '"Berapa pengeluaran bulan lalu?" Jawaban selalu dari data tersimpan — bukan tebakan AI.',
    points: ['Cari dokumen dengan konteks', 'Ringkasan aktivitas', 'Riwayat per dokumen'],
    accent: 'from-green/15 to-transparent',
    iconColor: 'text-green',
  },
]

function Features() {
  return (
    <section id="fitur" className="relative py-16 md:py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead
          kicker="LIMA KEMAMPUAN PEMBEDA"
          title="Bukan catatan biasa. Mesin konteks kehidupan."
          desc="Semua kemampuan ini bekerja di atas satu fondasi: setiap informasi terhubung dengan yang lain."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.name} delay={i * 0.06} className={i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-panel p-6 transition-all hover:border-primary/40 hover:ring-glow">
                <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60', f.accent)} />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-panel-2">
                      <f.icon className={cn('h-5 w-5', f.iconColor)} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold">{f.name}</h3>
                      <div className="text-[11px] font-semibold text-muted-foreground">{f.tag}</div>
                    </div>
                  </div>
                  <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  <ul className="mt-4 space-y-1.5">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-foreground/85">
                        <Check className="h-3.5 w-3.5 text-green" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- CARA KERJA ---------------- */

function HowItWorks() {
  return (
    <section id="cara-kerja" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead
          kicker="CARA KERJA"
          title="Dari tiga pesan tersebar menjadi satu urusan"
          desc="Contoh nyata: pembayaran, kuitansi, dan PDF pendaftaran — ORBIT menghubungkannya, mencatat tanggal penting, lalu mengingatkan."
        />
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[1fr_auto_1.2fr]">
          {/* masukan */}
          <div className="space-y-3">
            {[
              { icon: MessageCircle, t: 'Pesan WhatsApp', d: '"Deposit maksimal 28 Nov ya, kunci diambil 30 Nov."', c: 'text-green' },
              { icon: Image, t: 'Foto kuitansi', d: 'Transfer deposit Rp 15.000.000 — 20 Nov', c: 'text-cyan' },
              { icon: FileText, t: 'PDF pendaftaran / kontrak', d: 'Kontrak sewa 12 halaman, periode Des 2026 – Nov 2027', c: 'text-amber' },
            ].map((x, i) => (
              <Reveal key={x.t} delay={i * 0.08}>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-panel p-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-panel-2">
                    <x.icon className={cn('h-4.5 w-4.5', x.c)} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{x.t}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{x.d}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* konektor */}
          <Reveal delay={0.2} className="flex justify-center">
            <div className="flex flex-col items-center gap-1 text-primary lg:px-4">
              <div className="hidden h-16 w-px bg-gradient-to-b from-transparent via-primary/60 to-transparent lg:block" />
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/50 bg-primary/15 shadow-[0_0_30px_hsl(258_88%_67%/.3)]">
                <OrbitMark size={26} />
              </div>
              <div className="hidden h-16 w-px bg-gradient-to-b from-primary/60 via-primary/60 to-transparent lg:block" />
              <span className="mt-1 text-center text-[10px] font-bold tracking-widest text-muted-foreground lg:rotate-0">
                AI CONTEXT ENGINE
              </span>
            </div>
          </Reveal>

          {/* keluaran */}
          <Reveal delay={0.15}>
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/12 to-cyan/8 p-6">
              <div className="font-display text-[11px] font-bold tracking-widest text-primary">URUSAN TERSAMBUNG · PINDAH RUMAH</div>
              <div className="mt-3 space-y-2.5">
                {[
                  { t: 'Satu urusan utuh', d: 'Bu Wati + kontrak + deposit dalam satu konteks' },
                  { t: 'Tanggal penting tercatat', d: '28 Nov deposit · 30 Nov kunci · 1 Des mulai sewa' },
                  { t: 'Pengingat siap berjalan', d: 'Diingatkan H-2, dengan sumber yang bisa Anda cek' },
                ].map((o) => (
                  <div key={o.t} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                    <div>
                      <div className="text-sm font-semibold">{o.t}</div>
                      <div className="text-xs text-muted-foreground">{o.d}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/app/graph"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Lihat graf urusan ini di demo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ---------------- LIFE EVENT ENGINE ---------------- */

function LifeEvent() {
  const steps = [
    'Persiapan dokumen (KTP, NPWP, slip gaji)',
    'Anggaran pindahan & deposit Rp 15 jt',
    'Daftar barang + tukang angkut',
    'Perubahan alamat (kurir, tagihan, layanan)',
    'Jadwal transportasi & serah terima kunci',
    'Pengingat pembayaran sewa pertama',
  ]
  return (
    <section id="life-event" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="overflow-hidden rounded-3xl border border-magenta/30 bg-gradient-to-br from-magenta/12 via-panel to-primary/10">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-7 md:p-10">
              <Reveal>
                <div className="font-display text-[11px] font-bold tracking-[0.3em] text-magenta">
                  LIFE EVENT ENGINE
                </div>
                <Quote className="mt-4 h-6 w-6 text-magenta/60" />
                <p className="font-display mt-2 text-2xl font-bold leading-snug md:text-3xl">
                  "Saya mau pindah rumah bulan depan."
                </p>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  Satu kalimat. ORBIT menyusun rencana lengkap — dan terus memantau progresnya
                  sepanjang peristiwa berlangsung.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['Pindah kerja', 'Kuliah', 'Menikah', 'Bepergian', 'Beli kendaraan'].map((e) => (
                    <span key={e} className="rounded-full border border-border bg-panel px-3 py-1.5 text-xs text-muted-foreground">
                      {e} — bisa juga
                    </span>
                  ))}
                </div>
                <Button asChild className="mt-6 rounded-xl">
                  <Link to="/app/timeline">Lihat rencananya di demo <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </Reveal>
            </div>
            <div className="border-t border-border/60 p-7 md:p-10 lg:border-l lg:border-t-0">
              <Reveal delay={0.1}>
                <div className="font-display text-xs font-bold tracking-widest text-muted-foreground">
                  RENCANA YANG TERBENTUK
                </div>
                <div className="mt-4 space-y-2.5">
                  {steps.map((s, i) => (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0, x: 16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + i * 0.08, duration: 0.4 }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-panel-2 px-4 py-3"
                    >
                      <span className="font-display flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-magenta/15 text-xs font-bold text-magenta">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-snug">{s}</span>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-magenta" />
                  ditambah daftar pekerjaan yang belum selesai — semua terhubung di graf
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- HARGA ---------------- */

const PLANS = [
  {
    name: 'Free',
    price: 'Rp0',
    period: '',
    desc: 'Mulai merapikan hidup',
    features: ['Arsip dasar', 'Pencarian teks', 'Pengingat terbatas', '1 GB penyimpanan'],
    cta: 'Mulai gratis',
    highlight: false,
  },
  {
    name: 'Plus',
    price: 'Rp39.000',
    period: '/bulan',
    desc: 'AI yang membantu setiap hari',
    features: ['Semua di Free', 'AI + OCR penuh', 'Otomatisasi pengingat', 'Commitment Tracker', 'Penyimpanan lebih besar'],
    cta: 'Pilih Plus',
    highlight: true,
  },
  {
    name: 'Pro',
    price: 'Rp89.000',
    period: '/bulan',
    desc: 'Konteks lanjutan & workflow',
    features: ['Semua di Plus', 'Konteks lanjutan', 'Integrasi aplikasi eksternal', 'Workflow otomatis', 'Knowledge Graph penuh'],
    cta: 'Pilih Pro',
    highlight: false,
  },
  {
    name: 'Family',
    price: 'Rp129.000',
    period: '/bulan',
    desc: 'Satu ruang untuk keluarga',
    features: ['Semua di Plus', 'Ruang bersama', 'Hingga 5 anggota', 'Komitmen keluarga', 'Kontrol akses per anggota'],
    cta: 'Pilih Family',
    highlight: false,
  },
  {
    name: 'Business',
    price: 'Rp299.000',
    period: '/bulan mulai',
    desc: 'Kolaborasi & administrasi tim',
    features: ['Semua di Pro', 'Ruang tim', 'Administrasi & peran', 'Kuota AI terpusat', 'Dukungan prioritas'],
    cta: 'Hubungi kami',
    highlight: false,
  },
]

function Pricing() {
  return (
    <section id="harga" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead
          kicker="HARGA"
          title="Mulai gratis, naik saat terasa berguna"
          desc="Freemium dengan langganan dan paket keluarga. Upgrade hanya jika Anda membutuhkan AI dan otomatisasi penuh."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.06}>
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border p-5',
                  p.highlight
                    ? 'border-primary/60 bg-gradient-to-b from-primary/15 to-panel ring-glow'
                    : 'border-border bg-panel',
                )}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                    PALING POPULER
                  </span>
                )}
                <div className="font-display font-bold">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-display text-xl font-bold">{p.price}</span>
                  <span className="text-[11px] text-muted-foreground">{p.period}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{p.desc}</div>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs leading-snug text-foreground/85">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.highlight ? 'default' : 'outline'}
                  size="sm"
                  className={cn('mt-5 w-full rounded-xl text-xs', !p.highlight && 'border-border')}
                >
                  {p.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-relaxed text-muted-foreground">
            Harga merupakan hipotesis awal untuk pengujian pasar Indonesia — bukan hasil survei kesediaan
            membayar. ORBIT tidak menjual data pengguna dan tidak menayangkan iklan berbasis data pribadi.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- PRIVASI ---------------- */

function Privacy() {
  const items = [
    {
      icon: Lock,
      t: 'Enkripsi & kontrol akses ketat',
      d: 'Informasi pribadi dienkripsi; akses per anggota keluarga diatur per ruang.',
    },
    {
      icon: ShieldCheck,
      t: 'AI salah? Sumber selalu tampil',
      d: 'Setiap hasil AI menampilkan sumbernya dan meminta konfirmasi untuk data penting.',
    },
    {
      icon: CalendarClock,
      t: 'Tanggal divalidasi',
      d: 'Pengingat hanya dibuat setelah tanggal dicek silang — mengurangi pengingat salah.',
    },
    {
      icon: Sparkles,
      t: 'Aksi = persetujuan',
      d: 'Mengirim pesan, membayar, atau membagikan dokumen selalu butuh persetujuan Anda.',
    },
  ]
  return (
    <section id="privasi" className="relative py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHead
          kicker="KEPERCAYAAN"
          title="ORBIT menyimpan hidup Anda. Karena itu, keamanan adalah fitur utama."
          desc="Kekuatan terbesar ORBIT sekaligus risikonya: jumlah informasi pribadi yang dititipkan. Ini prinsip yang kami pegang."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((x, i) => (
            <Reveal key={x.t} delay={i * 0.06}>
              <div className="h-full rounded-2xl border border-border bg-panel p-5">
                <x.icon className="h-5 w-5 text-primary" />
                <h3 className="font-display mt-3 text-sm font-bold leading-snug">{x.t}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{x.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.2}>
          <div className="mt-6 rounded-2xl border border-green/25 bg-green/5 px-6 py-4 text-center text-sm text-foreground/85">
            <b>Janji tanpa iklan:</b> data Anda tidak dijual, tidak diprofilkan untuk periklanan, dan bisa
            diekspor atau dihapus kapan saja.
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------------- CTA + FOOTER ---------------- */

function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24">
      <div className="bg-starfield pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-90 w-90 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
        <Reveal>
          <OrbitMark size={52} className="mx-auto" />
          <h2 className="font-display mt-6 text-3xl font-bold tracking-tight md:text-5xl">
            Tempat utama untuk <span className="text-glow text-primary">mengelola hidup Anda</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Mulai dari tiga hal: mengingat semua informasi penting, memahami hubungan antar-informasi,
            dan memastikan tidak ada urusan yang terlupakan.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl px-6">
              <Link to="/app">Buka Dashboard Demo <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-xl px-6 border-border">
              <Link to="/app/memory">Tanya memori demo</Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 md:px-6">
        <div>
          <Logo size={24} wordmarkClassName="text-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">
            Your life, connected. · Prototipe konsep 2026
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <a href="#fitur" className="hover:text-foreground">Fitur</a>
          <a href="#cara-kerja" className="hover:text-foreground">Cara Kerja</a>
          <a href="#harga" className="hover:text-foreground">Harga</a>
          <a href="#privasi" className="hover:text-foreground">Privasi</a>
          <Link to="/app" className="hover:text-foreground">Masuk</Link>
        </nav>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <Hero />
      <Problem />
      <Features />
      <HowItWorks />
      <LifeEvent />
      <Pricing />
      <Privacy />
      <FinalCTA />
      <Footer />
    </div>
  )
}

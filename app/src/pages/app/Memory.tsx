import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BrainCircuit, CornerDownLeft, FileQuestion, Inbox, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { AppShell } from '@/components/app-shell'
import { MEMORY_ANSWERS, type MemoryAnswer } from '@/lib/data'
import { cn } from '@/lib/utils'

interface Asked {
  q: string
  answer: MemoryAnswer | null
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[?.!]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

/** pencocokan kata kunci sederhana terhadap jawaban tersimpan */
function findAnswer(q: string): MemoryAnswer | null {
  const nq = norm(q)
  const words = nq.split(' ').filter((w) => w.length > 3)
  let best: { a: MemoryAnswer; score: number } | null = null
  for (const m of MEMORY_ANSWERS) {
    const nm = norm(m.q)
    let score = 0
    for (const w of words) {
      if (nm.includes(w) || norm(m.a).includes(w)) score += 1
    }
    if (norm(m.q) === nq) score += 10
    if (!best || score > best.score) best = { a: m, score }
  }
  return best && best.score >= 2 ? best.a : null
}

export default function MemoryPage() {
  const [input, setInput] = useState('')
  const [asked, setAsked] = useState<Asked[]>([])

  const ask = (q: string) => {
    const query = q.trim()
    if (!query) return
    setAsked((prev) => [{ q: query, answer: findAnswer(query) }, ...prev])
    setInput('')
  }

  return (
    <AppShell
      title="Personal Memory"
      subtitle="Tanya apa saja tentang hidup Anda — jawaban selalu berdasarkan informasi yang tersimpan, bukan tebakan AI."
    >
      {/* Kotak tanya */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-panel to-cyan/8 p-5">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/70 px-4 py-3">
          <Search className="h-4.5 w-4.5 shrink-0 text-primary" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder="Contoh: berapa pengeluaran saya bulan lalu?"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => ask(input)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95"
            aria-label="Tanya"
          >
            <CornerDownLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MEMORY_ANSWERS.map((m) => (
            <button
              key={m.q}
              onClick={() => ask(m.q)}
              className="rounded-full border border-border bg-panel px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-cyan/40 hover:text-foreground"
            >
              {m.q}
            </button>
          ))}
        </div>
      </div>

      {/* Riwayat jawaban */}
      <div className="mt-5 space-y-4">
        <AnimatePresence initial={false}>
          {asked.map((item, i) => (
            <motion.div
              key={item.q + i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              {/* pertanyaan */}
              <div className="mb-2 flex justify-end">
                <div className="max-w-lg rounded-2xl rounded-br-md bg-primary/20 px-4 py-2.5 text-sm font-medium">
                  {item.q}
                </div>
              </div>

              {item.answer ? (
                <div className="rounded-2xl border border-border bg-panel p-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-cyan">
                    <BrainCircuit className="h-3.5 w-3.5" /> JAWABAN DARI MEMORI ANDA
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed">{item.answer.a}</p>
                  {item.answer.bullets && (
                    <ul className="mt-3 space-y-1.5">
                      {item.answer.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-2.5 text-sm text-foreground/90">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-primary to-cyan" />
                          <span className="leading-snug">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {item.answer.refs?.map((r) => (
                        <span
                          key={r}
                          className="rounded-md border border-line bg-panel-2 px-2 py-0.5 text-[10.5px] text-foreground/80"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-cyan" />
                      Sumber: {item.answer.source}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-amber/40 bg-amber/5 p-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-amber">
                    <FileQuestion className="h-3.5 w-3.5" /> BELUM ADA DALAM MEMORI
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-foreground/90">
                    ORBIT tidak menjawab dengan tebakan. Informasi untuk "{item.q}" belum tersimpan.
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Masukkan dokumen, screenshot, atau catatan terkait lewat{' '}
                    <Link to="/app/inbox" className="font-semibold text-primary hover:underline">
                      Universal Inbox
                    </Link>{' '}
                    — begitu tersimpan, pertanyaan yang sama bisa dijawab dengan sumber jelas.
                  </p>
                  <Link
                    to="/app/inbox"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <Inbox className="h-3.5 w-3.5" /> Buka Inbox Universal
                  </Link>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {asked.length === 0 && (
          <div className={cn('rounded-2xl border border-border bg-panel p-8 text-center')}>
            <BrainCircuit className="mx-auto h-6 w-6 text-muted-foreground" />
            <div className="font-display mt-2 text-sm font-semibold">Mulai dengan pertanyaan di atas</div>
            <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
              Semua jawaban disusun hanya dari kuitansi, dokumen, chat, dan catatan yang pernah Anda
              masukkan — lengkap dengan rujukan sumbernya.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  )
}

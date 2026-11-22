import { useMemo, useState } from 'react'
import { Network, Sparkles, X } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { KnowledgeGraph } from '@/components/knowledge-graph'
import {
  GRAPH_LINKS,
  GRAPH_NODES,
  NODE_TYPE_META,
  type GraphNode,
  type NodeType,
} from '@/lib/data'
import { cn } from '@/lib/utils'

const ALL_TYPES = Object.keys(NODE_TYPE_META) as NodeType[]

export default function GraphPage() {
  const [selected, setSelected] = useState<GraphNode | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(new Set(ALL_TYPES))

  const toggleType = (t: NodeType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next.size === 0 ? new Set(ALL_TYPES) : next
    })
  }

  const detail = useMemo(() => {
    if (!selected) return null
    const links = GRAPH_LINKS.filter((l) => l.source === selected.id || l.target === selected.id)
    const neighbors = links.map((l) => ({
      link: l,
      node: GRAPH_NODES.find((n) => n.id === (l.source === selected.id ? l.target : l.source))!,
    }))
    return { links, neighbors }
  }, [selected])

  return (
    <AppShell
      title="Personal Knowledge Graph"
      subtitle="Orang, tempat, dokumen, dan aktivitas Anda dalam satu jaringan — geser node, klik untuk melihat hubungannya."
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        {/* Kanvas graf */}
        <div className="relative h-[560px] overflow-hidden rounded-2xl border border-border bg-panel">
          {/* filter tipe */}
          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5">
            {ALL_TYPES.map((t) => {
              const m = NODE_TYPE_META[t]
              const on = activeTypes.has(t)
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all',
                    on ? 'border-border bg-panel-2 text-foreground' : 'border-border/50 bg-background/60 text-muted-foreground',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full transition-opacity"
                    style={{ background: m.color, opacity: on ? 1 : 0.3 }}
                  />
                  {m.label}
                </button>
              )
            })}
          </div>

          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 z-10 rounded-full border border-border bg-panel-2 p-1.5 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Hapus pilihan"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <KnowledgeGraph
            selectedId={selected?.id ?? null}
            onSelect={(n) => setSelected(n)}
            activeTypes={activeTypes}
          />

          {/* hint */}
          {!selected && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-background/70 px-3.5 py-1.5 text-[11px] text-muted-foreground backdrop-blur">
              Klik node untuk detail · drag untuk menata ulang
            </div>
          )}
        </div>

        {/* Panel detail */}
        <div className="space-y-4">
          {selected && detail ? (
            <div className="rounded-2xl border border-primary/35 bg-panel p-5">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ background: `${NODE_TYPE_META[selected.type].color}22`, color: NODE_TYPE_META[selected.type].color }}
                >
                  {NODE_TYPE_META[selected.type].label}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold leading-snug">{selected.label}</h2>

              <div className="mt-4 space-y-2">
                <div className="font-display text-[11px] font-bold tracking-widest text-muted-foreground">
                  {detail.neighbors.length} HUBUNGAN
                </div>
                {detail.neighbors.map(({ link, node }) => {
                  const dir = link.source === selected.id ? '→' : '←'
                  return (
                    <button
                      key={node.id + link.label}
                      onClick={() => setSelected(node)}
                      className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-panel-2 px-3 py-2.5 text-left transition-colors hover:border-primary/40"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: NODE_TYPE_META[node.type].color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">{node.label}</div>
                        {link.label && (
                          <div className="text-[10.5px] text-muted-foreground">
                            {dir === '→' ? 'terhubung sebagai' : 'dari'} "{link.label}"
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{dir}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 rounded-xl border border-cyan/25 bg-cyan/5 p-3 text-[11px] leading-relaxed text-foreground/85">
                <Sparkles className="mb-1 h-3.5 w-3.5 text-cyan" />
                Graf ini dibangun otomatis setiap kali Anda memasukkan informasi baru — tanpa
                pengaturan manual. Semua node adalah data Anda sendiri.
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-panel p-5">
              <Network className="h-5 w-5 text-magenta" />
              <h2 className="font-display mt-2 text-sm font-semibold">Jelajahi jaringan hidup Anda</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                36 entitas dan 30 hubungan terbentuk otomatis dari 9 item inbox, 8 komitmen, dan
                urusan yang sedang berjalan.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  { a: 'Bu Wati', r: 'pemilik', b: 'Kontrak Sewa Rumah' },
                  { a: 'Kontrak Sewa', r: 'dokumen inti', b: 'Pindah Rumah' },
                  { a: 'Deposit Rp 15 jt', r: 'jatuh tempo', b: 'Pengingat 28 Nov' },
                  { a: 'Voice note Ibu', r: 'membentuk', b: 'MCU Papa 3 Des' },
                ].map((e) => (
                  <div key={e.a + e.b} className="rounded-xl border border-line bg-panel-2 px-3 py-2 text-xs">
                    <span className="font-semibold">{e.a}</span>
                    <span className="text-muted-foreground"> — {e.r} — </span>
                    <span className="font-semibold">{e.b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistik */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: '36', l: 'Entitas' },
              { v: '30', l: 'Hubungan' },
              { v: '3', l: 'Urusan aktif' },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-border bg-panel p-3.5 text-center">
                <div className="font-display text-xl font-bold">{s.v}</div>
                <div className="text-[10.5px] text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-panel p-4 text-xs leading-relaxed text-muted-foreground">
            <b className="text-foreground">Context Intelligence bekerja diam-diam:</b> nama yang muncul
            di dokumen → orang; orang → kegiatan; kegiatan → tenggat; tenggat → pengingat. Semua tanpa
            Anda mengisi formulir.
          </div>
        </div>
      </div>
    </AppShell>
  )
}

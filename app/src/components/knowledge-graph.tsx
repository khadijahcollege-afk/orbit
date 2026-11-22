import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  GRAPH_LINKS,
  GRAPH_NODES,
  NODE_TYPE_META,
  type GraphNode,
  type NodeType,
} from '@/lib/data'
import { cn } from '@/lib/utils'

/* ============================================================
   Force-directed graph ringan (tanpa dependensi eksternal).
   Repulsi + pegas tautan + gravitasi pusat, dikurung rAF sampai
   energi meluruh. Node bisa di-drag; tautan ter-highlight saat
   node disorot/dipilih.
   ============================================================ */

interface SimNode extends GraphNode {
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
  r: number
}

function radiusOf(size: number | undefined): number {
  return 7.5 * Math.sqrt(size ?? 1)
}

const neighborIndex: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>()
  for (const l of GRAPH_LINKS) {
    if (!m.has(l.source)) m.set(l.source, new Set())
    if (!m.has(l.target)) m.set(l.target, new Set())
    m.get(l.source)!.add(l.target)
    m.get(l.target)!.add(l.source)
  }
  return m
})()

export function KnowledgeGraph({
  mini = false,
  selectedId,
  onSelect,
  activeTypes,
  className,
}: {
  mini?: boolean
  selectedId?: string | null
  onSelect?: (node: GraphNode | null) => void
  activeTypes?: Set<NodeType>
  className?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [box, setBox] = useState({ w: 900, h: mini ? 320 : 560 })
  const [, setTick] = useState(0)
  const [hovered, setHovered] = useState<string | null>(null)
  const dragRef = useRef<{ id: string; moved: boolean } | null>(null)
  const alphaRef = useRef(1)
  const rafRef = useRef(0)

  const nodesRef = useRef<Map<string, SimNode>>(new Map())
  if (nodesRef.current.size === 0) {
    // posisi awal deterministik: lingkaran konsentris menurut bobot
    const sorted = [...GRAPH_NODES].sort((a, b) => (b.size ?? 1) - (a.size ?? 1))
    sorted.forEach((n, i) => {
      const ring = i < 5 ? 0.16 : i < 14 ? 0.34 : 0.62
      const angle = (i / sorted.length) * Math.PI * 2 + (i % 3) * 0.35
      nodesRef.current.set(n.id, {
        ...n,
        x: 450 + Math.cos(angle) * 450 * ring,
        y: 280 + Math.sin(angle) * 260 * ring,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        r: radiusOf(n.size),
      })
    })
  }

  const visibleNodes = useMemo(
    () => (!activeTypes ? GRAPH_NODES : GRAPH_NODES.filter((n) => activeTypes.has(n.type))),
    [activeTypes],
  )
  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes])
  const visibleLinks = useMemo(
    () =>
      activeTypes
        ? GRAPH_LINKS.filter((l) => visibleIds.has(l.source) && visibleIds.has(l.target))
        : GRAPH_LINKS,
    [activeTypes, visibleIds],
  )

  // ukuran wadah
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const e = entries[0]
      if (e.contentRect.width > 0) {
        setBox({ w: e.contentRect.width, h: e.contentRect.height || (mini ? 320 : 560) })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [mini])

  /** satu langkah simulasi; true jika masih hidup */
  const step = useCallback(() => {
    const nodes = [...nodesRef.current.values()].filter((n) => visibleIds.has(n.id))
    const alpha = alphaRef.current
    const cx = box.w / 2
    const cy = box.h / 2
    const byId = nodesRef.current
    const rest = mini ? 110 : 150

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        let d2 = dx * dx + dy * dy
        if (d2 < 1) d2 = 1
        const d = Math.sqrt(d2)
        const rep = (5800 * alpha) / d2
        const ux = dx / d
        const uy = dy / d
        a.vx -= ux * rep
        a.vy -= uy * rep
        b.vx += ux * rep
        b.vy += uy * rep
      }
    }
    for (const l of visibleLinks) {
      const a = byId.get(l.source)
      const b = byId.get(l.target)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const f = (d - rest) * 0.08 * alpha
      const ux = dx / d
      const uy = dy / d
      a.vx += ux * f
      a.vy += uy * f
      b.vx -= ux * f
      b.vy -= uy * f
    }
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.016 * alpha
      n.vy += (cy - n.y) * 0.022 * alpha
      if (n.x < 40) n.vx += (40 - n.x) * 0.05
      if (n.x > box.w - 40) n.vx -= (n.x - (box.w - 40)) * 0.05
      if (n.y < 40) n.vy += (40 - n.y) * 0.05
      if (n.y > box.h - 40) n.vy -= (n.y - (box.h - 40)) * 0.05
      n.vx *= 0.86
      n.vy *= 0.86
      if (n.fx != null) {
        n.x = n.fx
        n.vx = 0
      } else {
        n.x += Math.max(-14, Math.min(14, n.vx))
      }
      if (n.fy != null) {
        n.y = n.fy
        n.vy = 0
      } else {
        n.y += Math.max(-14, Math.min(14, n.vy))
      }
    }
    alphaRef.current = alpha * 0.985
    setTick((t) => t + 1)
    return alphaRef.current > 0.02
  }, [box.w, box.h, mini, visibleLinks, visibleIds])

  const start = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const loop = () => {
      if (!step()) return
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [step])

  const wake = useCallback(() => {
    alphaRef.current = Math.max(alphaRef.current, 0.55)
    start()
  }, [start])

  // mulai simulasi saat ukuran/daftar berubah
  useEffect(() => {
    alphaRef.current = 1
    start()
    return () => cancelAnimationFrame(rafRef.current)
  }, [start])

  const clientToSvg = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    return pt.matrixTransform(ctm.inverse())
  }

  const focus = hovered ?? selectedId ?? null
  const focusNeighbors = focus ? neighborIndex.get(focus) : null
  const focusColor =
    focus != null
      ? NODE_TYPE_META[GRAPH_NODES.find((n) => n.id === focus)?.type ?? 'orang'].color
      : null
  const labelThreshold = mini ? 1.8 : 1.55

  return (
    <div ref={wrapRef} className={cn('relative h-full w-full', className)}>
      <svg ref={svgRef} width={box.w} height={box.h} className="block select-none touch-none">
        <defs>
          {Object.entries(NODE_TYPE_META).map(([k, m]) => (
            <radialGradient key={k} id={`ng-${k}`}>
              <stop offset="0%" stopColor={m.color} stopOpacity="0.95" />
              <stop offset="70%" stopColor={m.color} stopOpacity="0.85" />
              <stop offset="100%" stopColor={m.glow} />
            </radialGradient>
          ))}
        </defs>

        {/* tautan */}
        {visibleLinks.map((l, i) => {
          const a = nodesRef.current.get(l.source)
          const b = nodesRef.current.get(l.target)
          if (!a || !b) return null
          const active = focus != null && (l.source === focus || l.target === focus)
          const dim = focus != null && !active
          return (
            <g key={i}>
              {active && focusColor && (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={focusColor}
                  strokeOpacity={0.3}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
              )}
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={active ? focusColor ?? 'hsl(258 88% 75%)' : 'hsl(248 30% 40%)'}
                strokeOpacity={dim ? 0.1 : active ? 0.9 : 0.4}
                strokeWidth={active ? 1.8 : 1}
                strokeLinecap="round"
              />
            </g>
          )
        })}

        {/* node */}
        {[...nodesRef.current.values()]
          .filter((n) => visibleIds.has(n.id))
          .map((n) => {
            const meta = NODE_TYPE_META[n.type]
            const isFocus = focus === n.id
            const isNeighbor = focusNeighbors?.has(n.id) ?? false
            const dim = focus != null && !isFocus && !isNeighbor
            const r = n.r * (isFocus ? 1.18 : 1)
            const showLabel =
              !mini && (!dim || isFocus || isNeighbor) && (n.size ?? 1) >= labelThreshold
            const showLabelMini = mini && (isFocus || isNeighbor)
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                opacity={dim ? 0.16 : 1}
                style={{ cursor: 'pointer', transition: 'opacity 200ms' }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId)
                  dragRef.current = { id: n.id, moved: false }
                  wake()
                }}
                onPointerMove={(e) => {
                  const d = dragRef.current
                  if (!d || d.id !== n.id) return
                  const p = clientToSvg(e)
                  const node = nodesRef.current.get(n.id)
                  if (node) {
                    if (Math.abs(p.x - node.x) > 2 || Math.abs(p.y - node.y) > 2) d.moved = true
                    node.fx = Math.max(18, Math.min(box.w - 18, p.x))
                    node.fy = Math.max(18, Math.min(box.h - 18, p.y))
                  }
                }}
                onPointerUp={() => {
                  const d = dragRef.current
                  dragRef.current = null
                  const node = nodesRef.current.get(n.id)
                  if (node) {
                    node.fx = null
                    node.fy = null
                  }
                  if (d && !d.moved) {
                    onSelect?.(GRAPH_NODES.find((g) => g.id === n.id) ?? null)
                  }
                  wake()
                }}
                onPointerEnter={() => setHovered(n.id)}
                onPointerLeave={() => setHovered(null)}
              >
                {isFocus && (
                  <circle
                    r={r + 9}
                    fill="none"
                    stroke={meta.color}
                    strokeOpacity={0.5}
                    strokeWidth={1.5}
                  />
                )}
                <circle r={r + 7} fill={meta.glow} opacity={isFocus ? 0.55 : 0.3} />
                <circle
                  r={r}
                  fill={`url(#ng-${n.type})`}
                  stroke="hsl(0 0% 100% / 0.35)"
                  strokeWidth={0.8}
                />
                {(showLabel || showLabelMini) && (
                  <text
                    y={r + 14}
                    textAnchor="middle"
                    fontSize={mini ? 9.5 : 10.5}
                    fontWeight={isFocus ? 600 : 500}
                    fill={isFocus || isNeighbor ? 'hsl(0 0% 96%)' : 'hsl(246 15% 78%)'}
                    paintOrder="stroke"
                    stroke="hsl(251 30% 6% / 0.9)"
                    strokeWidth={3}
                    style={{ pointerEvents: 'none' }}
                  >
                    {n.label}
                  </text>
                )}
              </g>
            )
          })}
      </svg>
    </div>
  )
}

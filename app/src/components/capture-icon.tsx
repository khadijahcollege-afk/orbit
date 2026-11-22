import { FileText, Image, Link2, MessageSquareText, Mic, NotebookText } from 'lucide-react'
import type { CaptureType } from '@/lib/data'
import { cn } from '@/lib/utils'

const META: Record<CaptureType, { icon: typeof Image; label: string; color: string }> = {
  screenshot: { icon: MessageSquareText, label: 'Screenshot', color: 'text-cyan' },
  foto: { icon: Image, label: 'Foto', color: 'text-green' },
  pdf: { icon: FileText, label: 'PDF', color: 'text-amber' },
  suara: { icon: Mic, label: 'Suara', color: 'text-magenta' },
  tautan: { icon: Link2, label: 'Tautan', color: 'text-primary' },
  teks: { icon: NotebookText, label: 'Catatan', color: 'text-muted-foreground' },
}

export function CaptureIcon({ type, className }: { type: CaptureType; className?: string }) {
  const m = META[type]
  return <m.icon className={cn('h-4 w-4', m.color, className)} aria-label={m.label} />
}

export function CaptureBadge({ type }: { type: CaptureType }) {
  const m = META[type]
  const Icon = m.icon
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel-2 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
      <Icon className={cn('h-3 w-3', m.color)} />
      {m.label}
    </span>
  )
}

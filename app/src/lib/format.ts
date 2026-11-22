import { format, formatDistanceToNowStrict, differenceInCalendarDays } from 'date-fns'
import { id } from 'date-fns/locale'
import { TODAY } from './data'

export function rupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID')
}

export function tanggal(iso: string, withYear = false): string {
  const d = new Date(iso)
  return format(d, withYear ? 'd MMM yyyy' : 'd MMM', { locale: id })
}

export function tanggalPanjang(iso: string): string {
  const d = new Date(iso)
  return format(d, 'EEEE, d MMMM yyyy', { locale: id })
}

export function jam(iso: string): string {
  return format(new Date(iso), 'HH:mm')
}

/** "3 hari lagi" / "hari ini" / "2 hari lalu" — relatif terhadap TODAY demo */
export function relatif(iso: string): string {
  const d = new Date(iso)
  const diff = differenceInCalendarDays(d, TODAY)
  if (diff === 0) return 'Hari ini'
  if (diff === 1) return 'Besok'
  if (diff === -1) return 'Kemarin'
  if (diff > 0) return `${diff} hari lagi`
  return formatDistanceToNowStrict(d, { locale: id, addSuffix: true })
}

export function waktuLalu(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { locale: id, addSuffix: true })
}

export function hariIni(): string {
  return format(TODAY, 'EEEE, d MMMM yyyy', { locale: id })
}

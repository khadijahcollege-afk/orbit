/* ============================================================
   ORBIT — pemilih & rantai provider AI (doc 04: abstraction).
   Urutan prioritas (per-panggilan, hasil null → lanjut ke bawah):
   1. openai-responses  — bila OPENAI_API_KEY + OPENAI_BASE_URL
   2. gemini            — bila GEMINI_API_KEY
   3. local             — selalu ada (paling akhir)
   AI_PROVIDER bisa memaksa: openai-responses | gemini | local
   ============================================================ */
import { LocalDeterministicProvider } from './provider.mjs'
import { GeminiProvider } from './gemini.mjs'
import { OpenAIResponsesProvider } from './openai-responses.mjs'

export const localProvider = new LocalDeterministicProvider()
export const geminiProvider = new GeminiProvider()
export const openaiProvider = new OpenAIResponsesProvider()

/** Rantai provider aktif sesuai konfigurasi env. */
export function getProviderChain() {
  const forced = (process.env.AI_PROVIDER || '').toLowerCase()
  if (forced === 'openai-responses') return [openaiProvider, geminiProvider, localProvider]
  if (forced === 'gemini') return [geminiProvider, localProvider]
  if (forced === 'local') return [localProvider]

  const chain = []
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_BASE_URL) chain.push(openaiProvider)
  if (process.env.GEMINI_API_KEY) chain.push(geminiProvider)
  chain.push(localProvider)
  return chain
}

/** Provider utama (untuk tampilan di /health). */
export function getProvider() {
  return getProviderChain()[0]
}

/** Circuit breaker sederhana: provider upstream yang gagal didinginkan sementara
 *  agar panggilan berikutnya langsung lompat ke provider bawah (latensi terkendali
 *  saat upstream mati). AI_COOLDOWN_MS = 0 menonaktifkan. */
const COOLDOWN_MS = Number(process.env.AI_COOLDOWN_MS ?? 60_000)
const downUntil = new Map() // provider.id → epoch ms
export function getCooldowns() {
  const out = {}
  for (const [id, until] of downUntil) if (until > Date.now()) out[id] = Math.ceil((until - Date.now()) / 1000)
  return out
}

/** Jalankan method di rantai provider sampai ada yang mengembalikan hasil. */
export async function withFallback(method, args) {
  let lastErr
  for (const p of getProviderChain()) {
    if (p.id === localProvider.id) continue // jangkar lokal selalu dicoba di akhir
    const until = downUntil.get(p.id) || 0
    if (until > Date.now()) continue // masih dalam cooldown → skip
    try {
      const result = await p[method](args)
      if (result) {
        downUntil.delete(p.id)
        return result
      }
      // null = provider gagal internal (ditangkap sendiri) → perlakukan seperti error.
      if (COOLDOWN_MS > 0) downUntil.set(p.id, Date.now() + COOLDOWN_MS)
      console.error(`[ai] ${p.id}.${method} null (cooldown ${COOLDOWN_MS / 1000}s)`)
    } catch (err) {
      lastErr = err
      if (COOLDOWN_MS > 0) downUntil.set(p.id, Date.now() + COOLDOWN_MS)
      console.error(`[ai] ${p.id}.${method} error (cooldown ${COOLDOWN_MS / 1000}s):`, String(err).slice(0, 140))
    }
  }
  // Tidak ada upstream yang bisa dicoba → jangkar lokal deterministik.
  try {
    const result = await localProvider[method](args)
    if (result) return result
  } catch (err) {
    lastErr = err
    console.error(`[ai] local.${method} error:`, String(err).slice(0, 140))
  }
  if (lastErr) console.error(`[ai] semua provider gagal untuk ${method}`)
  return null
}

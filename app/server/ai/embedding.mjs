/* Shared helpers AI — dipakai provider lokal & Gemini (tanpa siklus impor). */

export const DIM = 128

/** Embedding hashing bag-of-words — deterministik, tanpa jaringan. */
export function embedText(text) {
  const vec = new Array(DIM).fill(0)
  const words = String(text).toLowerCase().match(/[a-z0-9à-ÿ]{2,}/g) || []
  for (const w of words) {
    let h = 2166136261
    for (let i = 0; i < w.length; i++) {
      h ^= w.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
    vec[Math.abs(h) % DIM] += 1
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / norm)
}

export function cosine(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export function chunkText(text, target = 480) {
  const paras = String(text)
    .split(/\n{2,}|(?<=\.)\s{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
  const chunks = []
  let cur = ''
  for (const p of paras) {
    if ((cur + '\n\n' + p).length > target && cur) {
      chunks.push(cur)
      cur = p
    } else {
      cur = cur ? `${cur}\n\n${p}` : p
    }
  }
  if (cur) chunks.push(cur)
  return chunks.length ? chunks : [String(text).slice(0, target)]
}

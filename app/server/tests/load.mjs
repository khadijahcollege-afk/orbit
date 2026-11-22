/* ============================================================
   ORBIT — load test endpoint kritis (checklist docs/08).
   Server di-spawn dengan DB terisolasi + AI lokal (tanpa jaringan),
   lalu endpoint dibombardir ber-konkurensi; p50/p95/p99 dilaporkan.
   Jalankan: npm run test:load
   ============================================================ */
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const APP = path.resolve(HERE, '..', '..')
const PORT = 8972
const BASE = `http://127.0.0.1:${PORT}/api/v1`
const N = Number(process.env.LOAD_N || 120)
const CONC = Number(process.env.LOAD_CONC || 10)

let dataDir
let child

const dataDir_ = mkdtempSync(path.join(os.tmpdir(), 'orbit-load-'))
dataDir = dataDir_

async function call(pathname, opts = {}) {
  const headers = {}
  if (opts.token) headers.authorization = `Bearer ${opts.token}`
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  const res = await fetch(`${BASE}${pathname}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  await res.text()
  return res.status
}

function pct(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]
}

async function bench(label, fn, n = N, conc = CONC) {
  const lat = []
  const t0 = performance.now()
  let cursor = 0
  async function worker() {
    while (cursor < n) {
      const i = cursor++
      const s = performance.now()
      const ok = await fn(i)
      lat.push(performance.now() - s)
      if (!ok) throw new Error(`${label}: request #${i} gagal`)
    }
  }
  await Promise.all(Array.from({ length: conc }, worker))
  const total = performance.now() - t0
  lat.sort((a, b) => a - b)
  console.log(
    `${label.padEnd(28)} n=${n} conc=${conc} · p50 ${pct(lat, 50).toFixed(1)}ms · p95 ${pct(lat, 95).toFixed(1)}ms · p99 ${pct(lat, 99).toFixed(1)}ms · ${(n / (total / 1000)).toFixed(0)} req/s`,
  )
  return pct(lat, 95)
}

try {
  child = spawn(process.execPath, ['server/index.mjs'], {
    cwd: APP,
    env: { ...process.env, ORBIT_DATA_DIR: dataDir, PORT: String(PORT), AI_PROVIDER: 'local' },
    stdio: 'ignore',
  })
  const deadline = Date.now() + 20_000
  for (;;) {
    try {
      if ((await call('/health')) === 200) break
    } catch {
      /* belum siap */
    }
    if (Date.now() > deadline) throw new Error('Server load-test tidak siap')
    await new Promise((r) => setTimeout(r, 300))
  }

  // akun + data pemanasan
  const reg = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'load@orbit.test', password: 'rahasia123', full_name: 'Load Test' }),
  })
  const { token, workspace_id: ws } = await reg.json()
  for (let i = 0; i < 20; i++) {
    const content = `Dokumen load-test #${i}\nTagihan Rp ${(i + 1) * 10}.000 jatuh tempo 2026-12-${String((i % 28) + 1).padStart(2, '0')}`
    const r = await fetch(`${BASE}/documents`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ workspace_id: ws, title: `Load doc ${i}`, file_type: 'text/plain', file_size: content.length }),
    })
    const doc = await r.json()
    await fetch(`${BASE}${doc.upload.url}`, { method: 'PUT', headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain' }, body: content })
  }
  // tunggu pipeline menyelesaikan semua
  await new Promise((r) => setTimeout(r, 3000))

  console.log(`\nLoad test API v1 ORBIT (endpoint kritis) — ${N} req × ${CONC} konkurensi:\n`)
  const results = {}
  results.health = await bench('GET /health', async () => (await call('/health')) === 200)
  results.dashboard = await bench('GET /dashboard', async () => (await call(`/dashboard?workspace_id=${ws}`, { token })) === 200)
  results.documents = await bench('GET /documents', async () => (await call(`/documents?workspace_id=${ws}&limit=50`, { token })) === 200)
  // search dibatasi rate limit 60/menit per user ( perilaku benar) — benchmark di bawahnya
  results.search = await bench('POST /memory/search', async () => (await call(`/memory/search?workspace_id=${ws}&q=${encodeURIComponent('tagihan jatuh tempo')}&mode=hybrid`, { token })) === 200, Math.min(N, 50))
  results.usage = await bench('GET /account/usage', async () => (await call(`/account/usage?workspace_id=${ws}`, { token })) === 200)

  const worst = Math.max(...Object.entries(results).filter(([k]) => k !== 'health').map(([, v]) => v))
  console.log(`\n[hasil] p95 terburuk endpoint kritis: ${worst.toFixed(1)}ms — ${worst < 500 ? 'LOLOS' : 'MELEBIHI 500ms (periksa)'}`)
} finally {
  child?.kill()
  for (let i = 0; i < 5; i++) {
    try {
      rmSync(dataDir, { recursive: true, force: true })
      break
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500)
    }
  }
}

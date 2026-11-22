/* ============================================================
   ORBIT — jembatan sinkron ke worker PostgreSQL (db-worker.mjs).
   Server memakai API node:sqlite sinkron (prepare().get/all/run)
   di ~300 call site; worker PGlite/pg async. Jembatan memblokir
   thread utama via Atomics.wait per query (server satu thread,
   query berurutan — aman dan sederhana untuk MVP).
   Placeholder: '?' → $n (sadar kutip); datetime('now') → now().
   ============================================================ */
import { Worker } from 'node:worker_threads'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

const DATA_BUF = 16 * 1024 * 1024 // hasil query terbesar (chunk 20KB × rows)
const shared = {
  statusBuf: new Int32Array(new SharedArrayBuffer(4)),
  lengthBuf: new Int32Array(new SharedArrayBuffer(4)),
  dataBuf: new Uint8Array(new SharedArrayBuffer(DATA_BUF)),
}
const { statusBuf, lengthBuf, dataBuf } = shared

/** Ganti '?' → $1..$n di luar kutip tunggal/ganda. */
function toPlaceholders(sql) {
  let out = ''
  let n = 0
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]
    if (c === "'" && !inDouble) inSingle = !inSingle
    else if (c === '"' && !inSingle) inDouble = !inDouble
    if (c === '?' && !inSingle && !inDouble) out += `$${++n}`
    else out += c
  }
  return out
}
const translate = (sql) => toPlaceholders(sql.replaceAll(`datetime('now')`, 'now()'))

export function createPgBridge() {
  const worker = new Worker(path.join(HERE, 'db-worker.mjs'), {
    workerData: {
      shared,
      backend: process.env.ORBIT_DB,
      databaseUrl: process.env.DATABASE_URL || '',
      dataDir: process.env.ORBIT_DATA_DIR || path.join(HERE, 'data'),
      appDir: HERE,
    },
  })

  function send(sql, params) {
    worker.postMessage({ sql: translate(sql), params: params ?? [] })
    for (;;) {
      if (Atomics.load(statusBuf, 0) !== 0) break
      Atomics.wait(statusBuf, 0, 0) // blokir hingga worker notify
    }
    const len = lengthBuf[0]
    const payload = JSON.parse(Buffer.from(dataBuf.buffer, dataBuf.byteOffset, len).toString('utf8'))
    Atomics.store(statusBuf, 0, 0) // reset utk query berikut
    return payload
  }

  const api = {
    /** API kompatibel node:sqlite: prepare().get/all/run */
    prepare(sql) {
      return {
        get(...params) {
          const { ok, rows, error } = send(sql, params)
          if (!ok) throw new Error(`[db-pg] ${sql.slice(0, 80)}: ${error}`)
          return rows[0]
        },
        all(...params) {
          const { ok, rows, error } = send(sql, params)
          if (!ok) throw new Error(`[db-pg] ${sql.slice(0, 80)}: ${error}`)
          return rows
        },
        run(...params) {
          const { ok, changes, error } = send(sql, params)
          if (!ok) throw new Error(`[db-pg] ${sql.slice(0, 80)}: ${error}`)
          return { changes: changes ?? 0, lastInsertRowid: null }
        },
      }
    },
    exec(sql) {
      const { ok, error } = send(sql, [])
      if (!ok) throw new Error(`[db-pg] exec: ${error}`)
    },
  }
  return api
}

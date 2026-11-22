/* Server statis kecil untuk preview hasil `expo export --platform web`
   dengan fallback index.html (SPA) — tanpa dependensi.
   Jalankan: node scripts/serve.mjs [port]  (default 8090, root ./dist) */
import http from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port = Number(process.argv[2] || 8090)
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`)
  let filePath = path.join(root, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''))
  if (!filePath.startsWith(root)) filePath = path.join(root, 'index.html')
  if (!existsSync(filePath) || statSync(filePath).isDirectory()) filePath = path.join(root, 'index.html')
  res.writeHead(200, { 'content-type': types[path.extname(filePath)] || 'application/octet-stream', 'cache-control': 'no-cache' })
  createReadStream(filePath).pipe(res).on('error', () => res.end())
}).listen(port, () => console.log(`[mobile-preview] http://localhost:${port} ← ${root}`))

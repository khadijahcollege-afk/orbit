/* ORBIT service worker — app shell cache-first, API selalu jaringan.
   Dokumen & data pribadi tidak pernah di-cache. */
const CACHE = 'orbit-shell-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith('/api/') && event.request.method === 'GET') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE)
        const cached = await cache.match(event.request)
        const network = fetch(event.request)
          .then((res) => {
            if (res.ok) cache.put(event.request, res.clone())
            return res
          })
          .catch(() => cached || new Response('offline', { status: 503 }))
        return cached || network
      })(),
    )
  }
})

/* ============================================================
   ORBIT — telemetry ringan (checklist docs/08: "Error tracking").
   Reporter Sentry minimal via Envelope API tanpa SDK: no-op total
   bila SENTRY_DSN tidak di-set (mode lokal/dev), fire-and-forget
   bila ada. Format DSN: https://<key>@<host>/<projectId>
   ============================================================ */

const DSN = process.env.SENTRY_DSN || ''

function parseDsn(dsn) {
  const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(\d+)$/)
  if (!m) return null
  return { key: m[1], host: m[2], projectId: m[3] }
}

/** Rakit payload envelope Sentry (diekspor untuk test format). */
export function buildEnvelope(event, sentAt = new Date().toISOString()) {
  const envelope = JSON.stringify({ event_id: event.event_id, sent_at: sentAt, sdk: { name: 'orbit-server', version: '1.0.0' } })
  const item = JSON.stringify({ type: 'event' })
  return `${envelope}\n${item}\n${JSON.stringify(event)}\n`
}

/** Kirim error (async, tanpa pernah melempar — logging tidak boleh mengganggu request). */
export function captureError(err, context = {}) {
  const dsn = parseDsn(DSN)
  if (!dsn) return false // no-op lokal
  try {
    const eventId = globalThis.crypto.randomUUID()
    const event = {
      event_id: eventId.replace(/-/g, ''),
      timestamp: new Date().toISOString(),
      platform: 'node',
      level: 'error',
      environment: process.env.SENTRY_ENV || 'development',
      logger: 'orbit-server',
      message: String(err?.message || err).slice(0, 2000),
      extra: { stack: String(err?.stack || '').slice(0, 8000), ...context },
      tags: { component: context.component || 'server' },
    }
    const body = buildEnvelope(event)
    // fire-and-forget: kesalahan jaringan diabaikan
    void fetch(`https://${dsn.host}/api/${dsn.projectId}/envelope/?sentry_key=${dsn.key}`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
      signal: AbortSignal.timeout(5000),
    }).catch(() => {})
    return true
  } catch {
    return false
  }
}

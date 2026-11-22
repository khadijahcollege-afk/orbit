/* ============================================================
   ORBIT — gateway pembayaran (abstraksi provider).
   Mode otomatis via env:
   - MIDTRANS_SERVER_KEY + MIDTRANS_ENV (default 'sandbox') → Midtrans Snap
   - tanpa kunci → mock (checkout simulasi, untuk demo lokal)
   Kontrak pembayaran mengikuti praktik Midtrans Snap:
   - checkout → snap token/redirect URL
   - webhook → notifikasi HTTP POST, diverifikasi sha512
   Aktifasi langganan SETELAH status paid (webhook/konfirmasi), tidak
   pernah percaya status dari klien tanpa verifikasi.
   ============================================================ */
import { createHash } from 'node:crypto'

export function activeProvider() {
  if (process.env.MIDTRANS_SERVER_KEY) return 'midtrans'
  return 'mock'
}

const snapBase = () =>
  (process.env.MIDTRANS_ENV || 'sandbox') === 'production'
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

/** Buat checkout di provider. Mengembalikan { provider, checkout_url, provider_ref }. */
export async function createCheckout(order, plan, customer) {
  const provider = activeProvider()
  if (provider === 'mock') {
    // Mock: URL internal yang ditangani frontend sebagai halaman simulasi.
    return { provider, checkout_url: `mock://pay/${order.id}`, provider_ref: null }
  }
  const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64')
  const res = await fetch(snapBase(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', authorization: `Basic ${auth}` },
    body: JSON.stringify({
      transaction_details: { order_id: order.id, gross_amount: order.amount_idr },
      item_details: [{ id: plan.id, price: order.amount_idr, quantity: 1, name: `ORBIT ${plan.name}` }],
      customer_details: customer ? { first_name: customer.full_name, email: customer.email } : undefined,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Midtrans Snap HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`)
  return { provider, checkout_url: data.redirect_url || null, provider_ref: data.token || null }
}

/** Verifikasi signature Midtrans: sha512(order_id + status_code + gross_amount + server_key). */
export function verifyMidtransSignature(notif) {
  const key = process.env.MIDTRANS_SERVER_KEY
  if (!key) return false
  const expected = createHash('sha512')
    .update(`${notif.order_id}${notif.status_code}${notif.gross_amount}${key}`)
    .digest('hex')
  return expected === notif.signature_key
}

/** Map transaction_status Midtrans → status order internal. */
export function midtransStatusToOrder(transactionStatus, fraudStatus) {
  if (['settlement', 'capture'].includes(transactionStatus)) {
    return fraudStatus && fraudStatus !== 'accept' ? 'pending' : 'paid'
  }
  if (['deny', 'failure'].includes(transactionStatus)) return 'failed'
  if (['cancel', 'expire'].includes(transactionStatus)) return 'cancelled'
  return 'pending'
}

export const isMock = () => activeProvider() === 'mock'

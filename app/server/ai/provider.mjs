/* ============================================================
   ORBIT — AI provider abstraction (doc 04 blueprint).
   Implementasi MVP: LOCAL-DETERMINISTIC (heuristik tanpa jaringan).
   Slot provider nyata: set env AI_PROVIDER / AI_API_KEY dan
   tambahkan kelas lain yang mengimplementasikan interface yang
   sama tanpa mengubah domain logic.
   Semua isi dokumen diperlakukan sebagai DATA TIDAK TERPERCAYA:
   instruksi di dalam dokumen tidak pernah dieksekusi.
   ============================================================ */

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, jun: 6,
  jul: 7, agu: 8, sep: 9, okt: 10, nov: 11, des: 12,
  januari: 1, februari: 2, maret: 3, april: 4, juni: 6, juli: 7,
  agustus: 8, september: 9, oktober: 10, november: 11, desember: 12,
}

const CLASS_RULES = [
  ['receipt', ['kuitansi', 'bukti transfer', 'struk', 'nota']],
  ['bill', ['tagihan', 'invoice', 'jatuh tempo', 'ipl', 'internet', 'listrik']],
  ['contract', ['kontrak', 'perjanjian', 'sewa', 'agreement', 'mo']],
  ['registration', ['pendaftaran', 'formulir', 'registrasi', 'pembelian']],
  ['report', ['laporan', 'proposal', 'resume', 'ringkasan']],
  ['identity', ['ktp', 'sim', 'paspor', 'sertifikat', 'ijazah']],
]

function classifyText(text, title) {
  const hay = `${title} ${text}`.toLowerCase()
  let best = 'other'
  let bestScore = 0
  for (const [type, words] of CLASS_RULES) {
    let score = 0
    for (const w of words) {
      const hits = hay.split(w.toLowerCase()).length - 1
      if (hits > 0) score += hits + (title.toLowerCase().includes(w) ? 1 : 0)
    }
    if (score > bestScore) {
      bestScore = score
      best = type
    }
  }
  return best
}

function extractDates(text) {
  const found = []
  const reId = /\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|jan|feb|mar|apr|jun|jul|agu|okt|nov|des)\.?\s+(\d{4})\b/gi
  for (const m of text.matchAll(reId)) {
    const day = Number(m[1])
    const mon = MONTHS[m[2].toLowerCase()]
    const year = Number(m[3])
    if (mon && day >= 1 && day <= 31) found.push(`${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`)
  }
  const reIso = /\b(\d{4})-(\d{2})-(\d{2})\b/g
  for (const m of text.matchAll(reIso)) found.push(m[0])
  return [...new Set(found)]
}

function extractAmounts(text) {
  const found = []
  const re = /rp\.?\s?([\d.,]+)/gi
  for (const m of text.matchAll(re)) {
    const digits = m[1].replace(/\./g, '').replace(/,/g, '')
    const value = Number(digits)
    if (Number.isFinite(value) && value > 0) found.push(value)
  }
  return [...new Set(found)]
}

function extractIssuers(text) {
  // "a.n. X" / "kepada X" — sederhana dan tanpa jaringan
  const found = []
  const re = /(?:a\.?n\.?|kepada|dari)\s+([A-Z][A-Za-z .'-]{2,40})/g
  for (const m of text.matchAll(re)) {
    const name = m[1].trim().replace(/\s+(ya|aja|dengan|untuk|pada)\b.*$/i, '').trim()
    if (name.length >= 3) found.push(name)
  }
  return [...new Set(found)].slice(0, 5)
}

import { embedText, cosine, chunkText } from './embedding.mjs'

/* ---------------- Provider ---------------- */

export class LocalDeterministicProvider {
  id = 'local-deterministic'

  /** Untuk teks nyata (txt/md/csv/json). */
  extractDocument({ text, title }) {
    const documentType = classifyText(text, title)
    const dates = extractDates(text)
    const amounts = extractAmounts(text)
    const issuers = extractIssuers(text)
    const confidence = documentType === 'other' ? 0.62 : 0.86
    return {
      document_type: documentType,
      title: title || (issuers[0] ? `Dokumen dari ${issuers[0]}` : 'Dokumen tanpa judul'),
      issuer: issuers[0] || null,
      amount: amounts[0] || null,
      currency: amounts.length ? 'IDR' : null,
      due_date: dates[0] || null,
      category: documentType === 'other' ? 'umum' : documentType,
      confidence,
      requires_confirmation: confidence < 0.8,
      source: { document_id: null, page: 1 },
      _all_dates: dates.slice(0, 4),
      _all_amounts: amounts.slice(0, 4),
      _simulated: false,
    }
  }

  /**
   * Untuk file biner (pdf/gambar) tanpa provider OCR nyata: hasil
   * simulasi deterministik dari judul — SELALNya di-tandai
   * requires_confirmation sehingga masuk alur needs_review (doc 04
   * langkah 10). Inilah titik penggantian ke provider OCR nyata.
   */
  simulateExtractFromTitle(title, hint) {
    const documentType = classifyText(hint || '', title)
    const amounts = extractAmounts(title)
    const dates = extractDates(title)
    const confidence = 0.55
    return {
      document_type: documentType,
      title,
      issuer: null,
      amount: amounts[0] || null,
      currency: amounts.length ? 'IDR' : null,
      due_date: dates[0] || null,
      category: documentType === 'other' ? 'umum' : documentType,
      confidence,
      requires_confirmation: true,
      source: { document_id: null, page: 1 },
      _all_dates: dates,
      _all_amounts: amounts,
      _simulated: true,
    }
  }

  generateEmbedding(texts) {
    return texts.map(embedText)
  }

  /** Bin tanpa AI nyata: simulasi terkontrol dari judul — SELALU needs_review. */
  async extractBinary({ mime, title }) {
    const hint = title
    const extraction = this.simulateExtractFromTitle(title, hint)
    const text =
      `Dokumen "${title}" (tipe ${mime}) — hasil OCR simulasi: kategori ${extraction.category}` +
      (extraction.amount ? `, nominal Rp${extraction.amount.toLocaleString('id-ID')}` : '') +
      (extraction.due_date ? `, tanggal ${extraction.due_date}` : '') +
      `. Konfirmasi hasil ekstraksi sebelum dipakai sebagai pengingat.`
    return { extraction, text }
  }

  /**
   * RAG: jawaban HANYA dari context (retrieval workspace). Tanpa dasar
   * ATAU skor terlalu rendah → menolak menebak (insufficient_data, doc 03).
   */
  answerQuestion({ question, context }) {
    const RELEVANCE_FLOOR = 0.22
    if (!context.length || (context[0].score ?? 1) < RELEVANCE_FLOOR) {
      return {
        answer:
          'Belum ada informasi tersimpan yang menjawab pertanyaan ini. Masukkan dokumen, screenshot, atau catatan terkait lewat Inbox — begitu tersimpan, pertanyaan yang sama bisa dijawab dengan sumber jelas.',
        insufficient_data: true,
        citations: [],
        suggested_actions: [],
      }
    }
    const bullets = context.slice(0, 3).map((c) => `${c.title}: ${c.content.slice(0, 180).trim()}`)
    const answer =
      `Berdasarkan ${context.length} potongan dokumen di memori Anda:\n` +
      bullets.map((b, i) => `${i + 1}. ${b}`).join('\n')
    const citations = context.slice(0, 3).map((c) => ({
      document_id: c.document_id,
      title: c.title,
      page: 1,
      chunk_id: c.id,
    }))
    // Usulan aksi: bila konteks teratas punya due_date dari hasil ekstraksi
    // dan pertanyaan berniat tindak lanjut → usulkan pengingat (butuh approval)
    const suggested_actions = []
    const top = context[0]
    const intent = /\b(bayar|tempo|tagihan|tenggat|deadline|ingatkan|reminder|jadwal|kapan)\b/i.test(question)
    if (top?.due_date && intent) {
      suggested_actions.push({
        type: 'create_reminder',
        payload: {
          workspace_id: top.workspace_id,
          title: `Tindak lanjuti: ${top.title}`,
          scheduled_at: `${top.due_date}T09:00:00`,
        },
        requires_approval: true,
      })
    }
    return { answer, insufficient_data: false, citations, suggested_actions }
  }

  generatePlan({ goal }) {
    // Template plan Life Event Engine (P1); goal dipetakan ke resep.
    const g = String(goal).toLowerCase()
    const recipes = [
      {
        match: ['pindah', 'rumah'],
        type: 'move',
        steps: ['Kumpulkan dokumen (KTP, NPWP, slip gaji)', 'Anggaran & deposit', 'Daftar barang + tukang angkut', 'Ubah alamat kurir/tagihan', 'Serah terima kunci'],
      },
      { match: ['kuliah', 'kampus'], type: 'enrollment', steps: ['Pilih kampus & jurusan', 'Siapkan berkas pendaftaran', 'Ikut tes/seleksi', 'Daftar ulang & bayar'] },
      { match: ['nikah', 'menikah'], type: 'wedding', steps: ['Rencana anggaran', 'Tanggal & tempat', 'Undangan & vendor', 'Dokumen administrasi'] },
      { match: ['jalan', 'travel', 'liburan', 'pergi'], type: 'travel', steps: ['Tentukan destinasi & tanggal', 'Tiket & penginapan', 'Dokumen perjalanan', 'Checklist barang'] },
      { match: ['kendaraan', 'motor', 'mobil'], type: 'vehicle', steps: ['Riset & anggaran', 'Survey unit', 'Negosiasi & dokumen', 'Perpanjang asuransi/pajak'] },
    ]
    const recipe = recipes.find((r) => r.match.some((k) => g.includes(k)))
    const steps = recipe
      ? recipe.steps
      : ['Perjelas tujuan', 'Daftar kebutuhan & dokumen', 'Susun anggaran', 'Jadwal langkah', 'Tinjau hasil']
    return {
      event_type: recipe?.type || 'general',
      title: String(goal).replace(/^saya mau\s*/i, '').trim() || 'Rencana baru',
      steps,
      _simulated: true,
    }
  }
}

export const provider = new LocalDeterministicProvider()

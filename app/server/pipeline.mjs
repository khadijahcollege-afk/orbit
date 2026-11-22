/* ============================================================
   ORBIT server — pipeline pemrosesan dokumen (doc 04 blueprint):
   validate → storage → detect type → OCR/extract → classify →
   structured extraction → confidence gate → chunk → embed →
   entities. Berjalan async di proses yang sama (queue MVP).
   ============================================================ */
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { db, now, uuid, storageDir, logActivity, logUsage } from './db.mjs'
import { withFallback, getProviderChain } from './ai/index.mjs'
import { chunkText } from './ai/embedding.mjs'

const TEXTUAL = /\.(txt|md|csv|json)$/i

const setDoc = db.prepare(
  `UPDATE documents SET processing_status = ?, extracted_text = ?, extraction = ?, category = ?, processing_error = NULL, updated_at = ? WHERE id = ?`,
)
const setFailed = db.prepare(
  `UPDATE documents SET processing_status = 'failed', processing_error = ?, updated_at = ? WHERE id = ?`,
)
const insChunk = db.prepare(
  `INSERT INTO document_chunks (id, document_id, workspace_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?, ?, ?)`,
)
const insEntity = db.prepare(
  `INSERT INTO entities (id, workspace_id, entity_type, name, normalized_name) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
)
const getEntity = db.prepare(
  `SELECT id FROM entities WHERE workspace_id = ? AND normalized_name = ? AND entity_type = ?`,
)
const insDocEntity = db.prepare(
  `INSERT INTO document_entities (document_id, entity_id, relation_type, confidence) VALUES (?, ?, 'mentions', ?) ON CONFLICT DO NOTHING`,
)

function upsertEntity(workspaceId, type, name, confidence) {
  const norm = name.toLowerCase().trim()
  if (!norm || norm.length < 2) return null
  const existing = getEntity.get(workspaceId, norm, type)
  const id = existing?.id ?? uuid()
  if (!existing) {
    insEntity.run(id, workspaceId, type, name, norm)
  }
  return id
}

export function processDocument(documentId) {
  // sinkron-dipanggil async: status update langsung terlihat di UI
  queueMicrotask(async () => {
    try {
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(documentId)
      if (!doc) return
      // idempoten: bersihkan hasil proses sebelumnya
      db.prepare('DELETE FROM document_chunks WHERE document_id = ?').run(documentId)
      db.prepare('DELETE FROM document_entities WHERE document_id = ?').run(documentId)
      db.prepare(`UPDATE documents SET processing_status = 'processing', updated_at = ? WHERE id = ?`).run(now(), doc.id)

      const ext = path.extname(doc.file_path || '')
      let text = ''
      let extraction

      if (TEXTUAL.test(ext)) {
        // File teks nyata → ekstraksi dari isi asli (rantai: openai → gemini → lokal)
        text = readFileSync(path.join(storageDir, doc.file_path), 'utf8').slice(0, 20000)
        extraction = await withFallback('extractDocument', { text, title: doc.title })
      } else {
        // pdf/gambar → OCR vision (rantai provider; lokal selalu menjadi jangkar)
        const buffer = readFileSync(path.join(storageDir, doc.file_path))
        const MIME_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' }
        const mime = MIME_EXT[ext.toLowerCase()] || 'application/octet-stream'
        const result = await withFallback('extractBinary', { buffer, mime, title: doc.title })
        extraction = result.extraction
        text = result.text
      }

      // Confidence gate (doc 04 langkah 9–10)
      const needsReview = extraction.requires_confirmation === true
      const status = needsReview ? 'needs_review' : 'completed'
      setDoc.run(status, text, JSON.stringify(extraction), extraction.category, now(), doc.id)

      // Chunking + embedding (doc 04 langkah 12–13)
      const [embeddingProvider] = getProviderChain()
      const chunks = chunkText(`${doc.title}\n\n${text}`)
      chunks.forEach((content, i) => {
        const [embedding] = embeddingProvider.generateEmbedding([content])
        insChunk.run(uuid(), doc.id, doc.workspace_id, i, content, JSON.stringify(embedding))
      })

      // Entitas: issuer → organization/person, tanggal & nominal → 'other' wajar
      const links = []
      if (extraction.issuer) {
        const eid = upsertEntity(doc.workspace_id, 'organization', extraction.issuer, extraction.confidence)
        if (eid) links.push(eid)
      }
      for (const d of extraction._all_dates || []) {
        const eid = upsertEntity(doc.workspace_id, 'date', d, extraction.confidence)
        if (eid) links.push(eid)
      }
      for (const eid of [...new Set(links)]) {
        insDocEntity.run(doc.id, eid, extraction.confidence)
      }

      logUsage(doc.workspace_id, doc.uploaded_by, 'extraction', doc.id)
      logActivity(doc.workspace_id, doc.uploaded_by, needsReview ? 'document.needs_review' : 'document.completed', 'document', doc.id, { simulated: extraction._simulated === true })
    } catch (err) {
      console.error('[pipeline] gagal memproses', documentId, err && err.stack)
      const doc = db.prepare('SELECT workspace_id, uploaded_by FROM documents WHERE id = ?').get(documentId)
      if (doc) logActivity(doc.workspace_id, doc.uploaded_by, 'document.failed', 'document', documentId, { error: String(err && err.message) })
      setFailed.run(String(err && err.message), now(), documentId)
    }
  })
}

/* ---------------- Hybrid search (doc 04: keyword + vector) ---------------- */

export function hybridSearch({ workspaceId, query, mode = 'hybrid', limit = 10 }) {
  const [embeddingProvider] = getProviderChain()
  const rows = db
    .prepare(
      `SELECT c.id, c.document_id, c.content, c.embedding, d.title, d.created_at
       FROM document_chunks c JOIN documents d ON d.id = c.document_id
       WHERE c.workspace_id = ?`,
    )
    .all(workspaceId)

  const q = query.toLowerCase().trim()
  const terms = q.split(/\s+/).filter((t) => t.length > 1)
  const [qvec] = embeddingProvider.generateEmbedding([q])
  const wantKeyword = mode === 'hybrid' || mode === 'keyword'
  const wantVector = mode === 'hybrid' || mode === 'semantic'

  const scored = rows.map((r) => {
    const lower = r.content.toLowerCase()
    let kw = 0
    if (wantKeyword) {
      for (const t of terms) {
        if (lower.includes(t)) kw += 1
        if (String(r.title).toLowerCase().includes(t)) kw += 0.5
      }
      kw = terms.length ? kw / (terms.length * 1.5) : 0
    }
    let vec = 0
    if (wantVector) {
      vec = Math.max(0, cosineSafe(qvec, r.embedding))
    }
    const score = mode === 'keyword' ? kw : mode === 'semantic' ? vec : 0.55 * kw + 0.45 * vec
    return { ...r, score }
  })

  return scored
    .filter((r) => r.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function cosineSafe(qvec, json) {
  try {
    const other = JSON.parse(json)
    let s = 0
    for (let i = 0; i < qvec.length && i < other.length; i++) s += qvec[i] * other[i]
    return s
  } catch {
    return 0
  }
}

export function fileSizeOnDisk(filePath) {
  try {
    return statSync(path.join(storageDir, filePath)).size
  } catch {
    return null
  }
}

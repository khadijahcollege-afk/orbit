# 4. AI Engine Architecture

## Prinsip
Gunakan layanan AI modular, bukan satu prompt besar. Model provider harus dapat diganti tanpa mengubah domain logic.

## Document Intelligence pipeline
1. User upload.
2. Validasi ukuran, MIME type, file signature, malware scan.
3. Simpan file ke private object storage.
4. Buat background job.
5. Deteksi tipe file.
6. OCR atau text extraction.
7. Klasifikasi dokumen.
8. Ekstraksi data terstruktur.
9. Validasi confidence dan schema.
10. Minta review jika perlu.
11. Simpan hasil.
12. Chunking dan embedding.
13. Index vector.
14. Hubungkan entities dan timeline bila dikonfirmasi.

## Contoh struktur hasil ekstraksi
```json
{
  "document_type": "bill",
  "title": "Tagihan Internet",
  "issuer": "Nama Penyedia",
  "amount": 350000,
  "currency": "IDR",
  "due_date": "2026-11-25",
  "category": "utilities",
  "confidence": 0.91,
  "requires_confirmation": true,
  "source": {
    "document_id": "uuid",
    "page": 1
  }
}
```
Contoh ini hanya data ilustratif.

## Context Engine
MVP dapat memakai relational tables:
- entities
- document_entities
- tasks
- events
- document_chunks

Relasi awal:
- document mentions entity
- document has due date
- event generates task
- task has reminder
- entity related to event

Tidak perlu graph database khusus pada MVP.

## Assistant: Retrieval-Augmented Generation
1. Intent detection.
2. Query normalization.
3. Workspace-scoped retrieval.
4. Hybrid search: keyword + vector.
5. Reranking jika diperlukan.
6. Context assembly.
7. LLM answer generation.
8. Citation validation.
9. Return answer dan sources.

## Tool execution
Assistant dapat mengusulkan:
- create_task
- create_reminder
- create_event

Backend memvalidasi input. Untuk aksi yang berdampak pada pengguna, buat approval record dan tunggu persetujuan. Jangan izinkan model memanggil database secara bebas.

## Provider abstraction
```ts
export interface AIProvider {
  extractDocument(input: {
    text: string;
    documentType?: string;
  }): Promise<ExtractedDocument>;

  generateEmbedding(texts: string[]): Promise<number[][]>;

  answerQuestion(input: {
    question: string;
    context: RetrievedContext[];
  }): Promise<AIAnswer>;

  generatePlan(input: {
    goal: string;
    context: RetrievedContext[];
  }): Promise<LifePlan>;
}
```

## AI safety dan kualitas
- Treat document content as untrusted data.
- Jangan mengikuti instruksi yang ditemukan di dalam dokumen.
- Semua retrieval harus dibatasi workspace.
- Jawaban harus menyertakan sumber.
- Tanggal dan nominal perlu validasi.
- Confidence rendah harus memicu review.
- Simpan model/version dan processing timestamp.
- Terapkan rate limit dan budget per pengguna.
- Hindari menyimpan data sensitif di log.

# 6. Implementation Roadmap

Estimasi: 16 minggu untuk tim kecil 3–5 orang. Ini target perencanaan, bukan jaminan waktu.

| Fase | Waktu | Hasil |
|---|---|---|
| 1. Foundation | Minggu 1–2 | Design system, repo, auth, database |
| 2. Core app | Minggu 3–4 | Dashboard, inbox, upload, storage |
| 3. Intelligence | Minggu 5–6 | OCR, extraction, classification |
| 4. Memory | Minggu 7–8 | Chunking, embeddings, search, citations |
| 5. Life management | Minggu 9–10 | Timeline, tasks, reminders, events dasar |
| 6. Assistant | Minggu 11–12 | RAG, chat, tool proposals, approvals |
| 7. Mobile & QA | Minggu 13–15 | Expo app, capture, push, security testing |
| 8. Beta launch | Minggu 16 | Deployment, monitoring, beta cohort |

## Milestone
### M1 — Foundation
- Monorepo berjalan.
- CI checks.
- Authentication.
- Workspace authorization.
- Database migrations.

### M2 — Capture
- Upload file.
- File validation.
- Private storage.
- Job queue.

### M3 — Intelligence
- OCR.
- Structured extraction.
- User review.
- Error handling.

### M4 — Memory
- Search.
- Embedding.
- Citations.
- Workspace-scoped retrieval.

### M5 — Follow-through
- Task.
- Reminder.
- Timeline.
- Approval center.

### M6 — Beta
- Responsive web.
- Mobile capture.
- Monitoring.
- Backup.
- Security review.
- User feedback.

## Beta acceptance checklist
- Signup/login bekerja.
- Upload PDF dan gambar bekerja.
- Hasil OCR dapat diperiksa.
- Pengguna dapat mengoreksi ekstraksi.
- Search menemukan dokumen yang tepat.
- AI menjawab dengan sumber.
- Task dan reminder dapat dibuat.
- Timeline menghormati timezone.
- AI tidak mengeksekusi aksi eksternal tanpa approval.
- Workspace isolation lulus pengujian.
- Export dan deletion diuji.
- Monitoring dan backup aktif.

## Validasi pasar
- Wawancarai 30–50 calon pengguna.
- Uji prototype dengan 10–15 pengguna.
- Beta awal 100 pengguna.
- Ukur activation, weekly retention, D30 retention, search success, reminder usefulness, dan willingness to pay.
- Jangan menganggap target metrik sebagai benchmark; gunakan untuk hipotesis eksperimen.

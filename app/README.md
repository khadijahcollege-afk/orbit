# ORBIT — Prototipe + MVP Fungsional

Dua hal tinggal di sini:

| | URL | Apa itu |
|---|---|---|
| **Landing + demo konsep** | `/` → `/app` | Halaman marketing + 7 halaman konsep dengan data dummy Indonesia (visual referensi desain) |
| **Konsol (aplikasi nyata)** | `/console` | Aplikasi penuh di atas API v1: auth, upload dokumen, pipeline ekstraksi, hybrid search, assistant RAG dengan sitasi, approval workflow, tasks/reminders, export |

## Menjalankan

```bash
# 1. API server (SQLite lokal di server/data/orbit.db, port 8787)
node server/index.mjs

# 2. Web (build + preview, proxy /api → 8787)
npm run build
npx vite preview --port 4173

# atau mode dev
npm run dev
```

Deploy single-process: `npm run build && node server/index.mjs` — server menyajikan `dist/` + API sekaligus (fallback SPA, http://localhost:8787).

Akun demo: **demo@orbit.id / orbit12345** (dibuat otomatis saat pertama kali server jalan, berisi 4 dokumen hasil pipeline).

## Yang sudah jalan (peta fase blueprint docs/06)

- **F1 Foundation** — auth scrypt + session, workspace + membership, skema SQLite mirror `database/schema.sql`
- **F2 Core** — upload signed-flow (POST /documents → PUT bytes), validasi magic bytes, private storage, batas 25 MB, rate limit
- **F3 Intelligence** — pipeline: klasifikasi skoring + ekstraksi (tanggal ID, nominal Rp, penerbit a.n.), confidence gate → `needs_review`, konfirmasi/koreksi pengguna
- **F4 Memory** — chunking + embedding + hybrid search (keyword + vector) dengan skor
- **F5 Life management** — tasks, reminders (validasi tanggal), events, dashboard agregat
- **F6 Assistant** — RAG dengan sitasi, penolakan menebak (`insufficient_data`), usulan aksi → approval queue → eksekusi
- **F7 QA** — diuji end-to-end via curl + browser (registrasi, isolasi workspace lintas-akun, upload, search, assistant, approval, export)
- **F5b Life Event Engine** — POST /events/generate-plan: satu kalimat → event + tasks (resepi move/travel/wedding/enrollment/vehicle dari provider lokal)
- **F5c Freemium & kuota (doc 07)** — tabel plans/subscriptions, akun baru = Free, demo = Plus trial 13 hari; enforcement: jawaban AI, pengingat bulanan, jumlah dokumen; GET /account/usage untuk meter UI
- **F5d Scheduler & backup** — pengingat jatuh waktu → `sent`, approval kedaluwarsa → `expired` (interval 60s, pengganti BullMQ utk demo); `node server/backup.mjs` (VACUUM INTO, retensi 14 file)
- **Console 6 tab** — Ringkasan (dashboard + meter paket), Dokumen, Memory, Assistant, Events (rencana + checklist), Tindakan

- **F8 Beta** — build produksi + runbook ini. Mobile (Expo), monitoring/backup, dan OCR/LLM nyata belum — lihat "Simulasi vs nyata".

## Provider AI: rantai 3 provider (openai-responses → gemini → lokal)

Prinsip blueprint doc 04: provider modular. Rantai per-panggilan di `server/ai/index.mjs` (`withFallback`) — hasil null/error → provider berikutnya, aplikasi tidak pernah mati:

1. **`OpenAIResponsesProvider`** — gateway OpenAI-Responses milik pengguna (`OPENAI_BASE_URL`/`OPENAI_API_KEY` di `.env`). Catatan gateway ini: `/chat/completions` dinonaktifkan → memakai **`/responses` + SSE**; hanya menerima klien pemrograman (UA di daftar putih, default `ZCode/2.1.0` via `OPENAI_UA`); rantai model `gpt-6.1-sol → gpt-6-astra → gpt-5.6-sol → gpt-6`. Status saat penulisan: gateway merespons 503 *Service temporarily unavailable* untuk semua model — provider otomatis dipakai begitu pulih.
2. **`GeminiProvider`** — bila `GEMINI_API_KEY` ada (model dinamis via ListModels, alias `gemini-flash-latest`; retry + fallback antar-model). OCR vision nyata, RAG ber-sitasi, plan.
3. **`LocalDeterministicProvider`** — jangkar selalu ada: heuristik teks + OCR simulasi (`needs_review`).

Embedding tetap hashing lokal (dim 128) — reindex ke provider embedding hanya bila pindah ke pgvector produksi.

Modul blueprint yang kini punya permukaan nyata: Inbox ✓ Intelligence ✓ Memory ✓ Timeline ✓ Events ✓ Assistant ✓ Action Center ✓ **Control ✓ (profil, timezone, export JSON, hapus akun)** — plus PWA (manifest + service worker, installable).

## Struktur server

```
server/
├── index.mjs        # HTTP router, seluruh endpoint API v1, seed, static SPA
├── db.mjs           # skema SQLite + helper logging aktivitas/usage
├── auth.mjs         # scrypt, session, authorization workspace (mirror RLS)
├── pipeline.mjs     # proses dokumen + hybrid search
├── ai/index.mjs     # pemilih provider (Gemini bila ada key, fallback lokal)
├── ai/provider.mjs  # provider lokal deterministik (fallback per-panggilan)
├── ai/gemini.mjs    # provider Gemini nyata (OCR vision, RAG, plan)
├── ai/openai-responses.mjs  # provider gateway OpenAI-Responses (SSE + vision)
├── ai/embedding.mjs # helper embedding/chunking bersama
└── seed/*.txt       # dokumen demo
```

API contract: `../blueprint/ORBIT_Blueprint_v1/api/openapi-v1-complete.yaml`.
Skema referensi: `../blueprint/ORBIT_Blueprint_v1/database/schema.sql` (PostgreSQL/Supabase untuk produksi; SQLite di sini untuk MVP lokal).

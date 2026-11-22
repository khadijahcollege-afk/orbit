# ORBIT — Personal Life Operating System
**Blueprint & MVP Starter Pack — v1.0**  
Tagline: **Your Life, Connected.**

Paket ini berisi dokumen acuan produk dan engineering untuk membangun ORBIT sebagai aplikasi Web + Mobile, dimulai dari pasar Indonesia dan disiapkan untuk ekspansi global.

## Isi paket
- `docs/01-product-vision.md` — visi, positioning, target pengguna, prinsip produk.
- `docs/02-feature-specification.md` — spesifikasi modul dan prioritas MVP.
- `docs/03-ui-ux-design.md` — design system, navigasi, dan halaman.
- `docs/04-ai-engine.md` — pipeline AI, retrieval, assistant, guardrails.
- `docs/05-security-privacy.md` — keamanan, privasi, dan kontrol pengguna.
- `docs/06-roadmap.md` — fase implementasi dan kriteria beta.
- `docs/07-business-model.md` — model bisnis dan validasi.
- `architecture/system-architecture.mmd` — diagram arsitektur.
- `architecture/document-pipeline.mmd` — alur pemrosesan dokumen.
- `architecture/context-engine.mmd` — alur Context Engine.
- `database/schema.sql` — fondasi schema PostgreSQL.
- `database/migrations/002_security_and_indexes.sql` — contoh indeks dan kebijakan keamanan awal.
- `api/endpoints.md` — rancangan endpoint REST.
- `api/openapi-starter.yaml` — kerangka OpenAPI.
- `project/folder-structure.txt` — struktur monorepo.
- `project/.env.example` — contoh konfigurasi environment tanpa secret.

## Stack rekomendasi
- Web: Next.js + TypeScript
- Mobile: React Native + Expo
- Backend: NestJS + TypeScript
- Database/Auth: Supabase PostgreSQL + Supabase Auth
- Vector search: pgvector
- Queue: Redis + BullMQ
- Storage: S3-compatible private object storage
- AI: provider abstraction untuk LLM, embedding, dan OCR
- Testing: Vitest, Playwright
- Monorepo: pnpm + Turborepo

## Cara menggunakan
1. Baca dokumen product dan feature specification.
2. Tinjau diagram arsitektur.
3. Review `database/schema.sql` bersama engineer sebelum menjalankan migration.
4. Terapkan RLS dan authorization sebelum menyimpan data pengguna nyata.
5. Implementasikan modul MVP berdasarkan prioritas P0.
6. Uji dengan data dummy terlebih dahulu.

## Catatan penting
Paket ini adalah blueprint teknis, bukan aplikasi siap deploy. SQL dan OpenAPI merupakan fondasi awal yang harus ditinjau, diuji, dan disesuaikan dengan implementasi aktual. Jangan memasukkan API key atau credential ke repository. Seluruh file pribadi harus private secara default.

## Lampiran review v1.1 (hasil peninjauan atas v1)
Tambahan berikut menutup celah yang ditemukan saat review. Semua bersifat aditif — tidak mengubah file v1.

- `database/migrations/003_hybrid_search_and_metering.sql` —
  (1) kolom FTS `search_tsv` + index GIN pada `documents` & `document_chunks` untuk hybrid keyword search (doc 04) + pg_trgm untuk fuzzy nama entitas;
  (2) tabel `ai_usage` untuk metering biaya AI per workspace (doc 04/07);
  (3) tabel `device_tokens` untuk push mobile (doc 06 M7);
  (4) trigger pemeliharaan `updated_at`;
  (5) CHECK constraint `entities.entity_type`;
  (6) tabel `plans` & `subscriptions` + seed hipotesis harga (P1).
- `database/policies/rls_full.sql` — RLS lengkap untuk semua tabel dengan pola anti-rekursif (helper `orbit_can_access` SECURITY DEFINER, search_path terkunci), termasuk bootstrap workspace baru, pesan assistant yang hanya boleh ditulis service role, dan checklist pengujian isolation.
- `api/openapi-v1-complete.yaml` — kontrak lengkap 22 endpoint + tabel kode error stabil, konvensi cursor pagination & Idempotency-Key, skema `Extraction`, `AssistantAnswer` (dengan `insufficient_data` untuk penolakan menebak), dan alur export/deletion async.

Keputusan produk yang masih terbuka dari review:
1. Knowledge Graph tidak ada di 8 modul resmi — masuk sebagai P1 "visualisasi konteks" atau dikeluarkan dari UI MVP?
2. Roadmap 16 minggu: mobile capture (M7) adalah kandidat pertama yang digeser bila terpeleset.
3. Palet desain (Navy #0B1020 / Primary #6655E8) perlu uji contrast ratio sebelum production, termasuk penggantian tema prototipe yang kini violet-cyan.

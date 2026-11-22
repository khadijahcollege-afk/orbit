# 2. Feature Specification

## Modul produk

### 01 — ORBIT Inbox
Tujuan: menjadi pusat masuk informasi.
- Upload PDF, JPG, PNG.
- Input teks dan catatan manual.
- Input tautan.
- Drag and drop.
- Status pemrosesan: queued, processing, needs_review, completed, failed.
- Pengguna dapat menghapus atau mengarsipkan item.

MVP: PDF, JPG, PNG, teks, URL.

### 02 — ORBIT Intelligence
Tujuan: mengubah informasi mentah menjadi data terstruktur.
- OCR dan text extraction.
- Klasifikasi dokumen.
- Ekstraksi tanggal, nominal, nama, organisasi, alamat, dan kategori.
- Confidence score.
- Review dan koreksi oleh pengguna.
- Simpan sumber dan lokasi halaman bila tersedia.

MVP: OCR, klasifikasi dasar, ekstraksi tanggal/nominal/nama, konfirmasi pengguna.

### 03 — ORBIT Memory
Tujuan: menyimpan dan menemukan kembali informasi.
- Arsip dokumen.
- Pencarian kata kunci.
- Pencarian semantik.
- Filter kategori dan tanggal.
- Hubungan antar-entitas.
- Tautan ke sumber asli.

MVP: daftar arsip, filter, keyword search, semantic search, source citation.

### 04 — ORBIT Timeline
Tujuan: menampilkan aktivitas dan tenggat.
- Hari ini.
- Jadwal mendatang.
- Deadline dan pengingat.
- Riwayat aktivitas.
- Zona waktu pengguna.

MVP: daftar timeline dan pengingat sederhana.

### 05 — ORBIT Events
Tujuan: mengubah tujuan menjadi rencana.
Contoh: pindah rumah, perjalanan, pendaftaran kuliah.
- Event title, description, date range.
- Daftar task.
- Status dan progres.
- Dokumen terkait.

MVP: event manual dan task checklist. AI-generated plan dapat masuk P1.

### 06 — ORBIT Assistant
Tujuan: tanya jawab berbasis data pengguna.
- Natural-language search.
- Jawaban berbasis dokumen dan task.
- Sitasi sumber.
- Ringkasan.
- Usulan pembuatan task/reminder.

MVP: retrieval augmented generation dengan citations.

### 07 — ORBIT Action Center
Tujuan: mengelola tindakan yang perlu dilakukan.
- Pending tasks.
- Upcoming reminders.
- Suggested actions.
- Approval queue.
- Riwayat status.

MVP: task dan reminder, persetujuan untuk aksi yang dibuat AI.

### 08 — ORBIT Control
Tujuan: memberi kendali kepada pengguna.
- Profil, locale, timezone.
- Pengaturan notifikasi.
- Pengaturan AI.
- Export data.
- Delete account/data.
- Sesi dan keamanan.

MVP: profil, timezone, ekspor, penghapusan akun sesuai kebijakan.

## Prioritas
- P0: wajib untuk beta.
- P1: setelah alur inti stabil.
- P2: integrasi dan ekspansi.

| Modul | Fitur | Prioritas |
|---|---|---|
| Inbox | Upload PDF/image, text, URL | P0 |
| Intelligence | OCR, extraction, classification | P0 |
| Memory | Archive, search, citations | P0 |
| Timeline | Dates, reminders | P0 |
| Events | Basic event planning | P1 |
| Assistant | RAG, source citations | P0 |
| Action Center | Tasks, approval | P0 |
| Control | Privacy, export, delete | P0 |
| External integrations | Calendar, email, messaging | P2 |

## User stories inti
1. Sebagai pengguna, saya ingin mengunggah dokumen agar informasinya dapat dicari kembali.
2. Sebagai pengguna, saya ingin memeriksa hasil ekstraksi AI sebelum dijadikan pengingat.
3. Sebagai pengguna, saya ingin bertanya dengan bahasa natural dan menerima jawaban dengan sumber.
4. Sebagai pengguna, saya ingin melihat deadline di satu timeline.
5. Sebagai pengguna, saya ingin menghapus data saya dan mengendalikan aksesnya.

## Non-functional requirements
- Isolasi data per workspace.
- Semua API memerlukan autentikasi dan authorization.
- File private secara default.
- Background processing untuk OCR dan embedding.
- Idempotent job processing.
- Audit log untuk aksi sensitif.
- Observability dan error tracking.
- Responsive web dan accessible UI.

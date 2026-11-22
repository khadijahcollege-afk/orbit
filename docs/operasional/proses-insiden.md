# Proses Penanganan Insiden ORBIT (DRAFT — internal)

Terakhir diperbarui: 22 November 2026. Mengikuti prinsip docs/05 (security & privacy).

## Definisi
Insiden = gangguan atau ancaman terhadap kerahasiaan/integritas/ketersediaan
data pengguna, atau pelanggaran kebijakan privasi. Contoh: kebocoran antar
workspace, backup bocor, gateway pembayaran memberi data palsu, eksekusi
instruksi dari isi dokumen (prompt injection berhasil).

## Tingkat keparahan
| Tingkat | Definisi | Respons pertama |
|---|---|---|
| S1 | Data pengguna bocor/keluar tanpa izin, atau hilang | Segera, maks 4 jam |
| S2 | Fitur inti mati (auth, upload, assistant) untuk banyak pengguna | 1×24 jam |
| S3 | Degradasi terbatas (rate limit salah, kuota salah hitung) | 3 hari kerja |

## Alur penanganan
1. **Deteksi** — pemantauan (Sentry saat tersedia), log server, laporan pengguna (security@orbit.id), atau hasil test otomatis.
2. **Penahanan** — hentikan penuhan: cabut sesi bermasalah, matikan endpoint rentan (server tanpa state → restart aman), berhenti sejenak dari provider AI bila sumbernya di sana.
3. **Penilaian** — cakupan: berapa pengguna, jenis data, periode waktu. Gunakan activity_logs & ai_usage untuk rekonstruksi.
4. **Pemulihan** — pulihkan dari backup terverifikasi bila data rusak; perbaiki kode dengan test regresi di `npm test`.
5. **Komunikasi** — S1: pengguna terdampak diberitahu via email ≤72 jam sejak konfirmasi, apa yang terjadi, data apa, apa yang kami lakukan. S2/S3: catatan status di aplikasi.
6. **Tindak lanjut** — post-mortem tanpa menyalahkan dalam 5 hari kerja: kronologi, akar masalah, perbaikan permanen, checklist baru. Simpan di folder ini (`postmortem/YYYY-MM-DD-slug.md`).

## Peran (beta — satu operator)
- Operator tunggal menjalankan semua langkah; setelah tim terbentuk: penangani
  (on-call) & komunikator terpisah, review post-mortem oleh pemilik produk.

## Latihan & kesiapan
- **Backup restore dilatih**: `node server/backup.mjs` memverifikasi salinan dapat dibuka; latihan restore penuh 1×/bulan ke data dir terpisah.
- Test isolasi workspace & prompt injection berjalan tiap `npm test` — regresi keamanan berhenti sebelum deploy.
- Kontak darurat: security@orbit.id; laporan eksternal direspons ≤4 jam.

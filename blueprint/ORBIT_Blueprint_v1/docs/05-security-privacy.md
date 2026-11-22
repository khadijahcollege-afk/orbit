# 5. Security & Privacy

ORBIT akan memproses data pribadi. Security dan privacy harus menjadi bagian arsitektur sejak awal.

## Baseline
- HTTPS/TLS.
- Secure authentication dan session management.
- Server-side authorization.
- PostgreSQL Row Level Security.
- Private object storage.
- Encryption at rest.
- Secret manager untuk credential.
- Rate limiting.
- Audit log.
- Backup dan recovery testing.
- Data export dan deletion.
- Monitoring dan incident response.

## Workspace isolation
Setiap data milik pengguna harus memiliki workspace_id. Setiap request harus memeriksa membership dan role pada server. Jangan mengandalkan UUID yang sulit ditebak sebagai kontrol keamanan.

## File security
- Validasi extension, MIME type, dan file signature.
- Batas ukuran file.
- Malware scanning bila tersedia.
- Jangan membuat public bucket.
- Gunakan signed URL berumur pendek.
- Hapus file turunan saat data induk dihapus sesuai kebijakan retensi.

## AI privacy
- Minimalkan data yang dikirim ke provider.
- Periksa kebijakan retensi dan penggunaan data provider.
- Jangan menggunakan data untuk training tanpa dasar persetujuan yang sesuai.
- Redact informasi sensitif dari telemetry.
- Berikan kontrol pengguna atas AI features.

## Sensitive actions
Aksi seperti mengirim pesan, membagikan dokumen, atau pembayaran tidak boleh berjalan hanya berdasarkan output model. Gunakan approval workflow dan validasi server.

## Compliance
Lakukan peninjauan hukum dan privasi untuk UU Perlindungan Data Pribadi Indonesia serta regulasi negara tujuan saat ekspansi. Tetapkan dasar pemrosesan, tujuan, retensi, hak subjek data, dan prosedur insiden bersama penasihat yang kompeten.

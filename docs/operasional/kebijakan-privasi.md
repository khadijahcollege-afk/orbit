# Kebijakan Privasi ORBIT (DRAFT — perlu review pemilik)

Terakhir diperbarui: 22 November 2026. Berlaku untuk beta ORBIT (web & mobile).

## Ringkasan singkat
ORBIT adalah sistem operasi kehidupan pribadi. Anda menyimpan dokumen dan
catatan pribadi Anda; ORBIT mengelolanya, mencarinya, dan membantu menindak-
lanjutinya. **Data Anda bukan komoditas kami.**

## Data yang kami proses
- **Dokumen & catatan** yang Anda unggah/ketik (tagihan, kontrak, screenshot, catatan suara dikelola via transkrip).
- **Data hasil ekstraksi** (tanggal tempo, nominal, penerbit) untuk membuat pengingat dan jawaban.
- **Data akun**: nama, email, zona waktu, bahasa.
- **Log penggunaan teknis**: aktivitas di workspace Anda (mis. dokumen dibuat, pengingat dikirim) dan pemakaian AI per paket.

## Apa yang TIDAK kami lakukan
- **Tidak menjual atau menyewakan data Anda** — kepada siapa pun.
- **Tidak memakai dokumen Anda untuk melatih model** tanpa persetujuan eksplisit terpisah.
- **Tidak mengeksekusi aksi otomatis** tanpa persetujuan Anda (semua usulan AI masuk antrean approval).
- **Tidak berbagi data antar pengguna** — retrieval di-gabung ke workspace Anda (diuji otomatis).

## Jawaban AI
Jawaban asisten hanya dibangun dari dokumen yang tersimpan di workspace Anda,
dengan sitasi ke sumber. Bila datanya tidak ada, asisten menjawab bahwa data
belum cukup — bukan menebak. Isi dokumen Anda diproses sebagai DATA: instruksi
di dalam dokumen tidak dieksekusi.

## Penyimpanan & keamanan
- MVP beta: data disimpan di server ORBIT (SQLite lokal / Supabase saat produksi) dengan penggabungan akses per workspace.
- Password disimpan sebagai hash (scrypt); token sesi dicabut saat logout & penghapusan akun.
- Upload divalidasi (tipe & ukuran maksimal 25 MB).

## Hak Anda
- **Ekspor**: seluruh data profil & workspace Anda dalam JSON (Akun → Ekspor).
- **Penghapusan**: hapus akun menghapus workspace, dokumen, dan berkas turunan secara langsung (lihat Kebijakan Retensi Data untuk salinan backup).
- **Koreksi**: hasil ekstraksi bisa dikoreksi Anda sebelum disimpan.

## Kontak
Dukungan: support@orbit.id — keamanan: security@orbit.id (lihat README operasional).

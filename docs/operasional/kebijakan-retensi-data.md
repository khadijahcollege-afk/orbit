# Kebijakan Retensi Data ORBIT (DRAFT — perlu review pemilik)

Terakhir diperbarui: 22 November 2026. Menjelaskan berapa lama tiap jenis data disimpan.

## Data akun & konten pengguna
| Jenis data | Retensi MVP beta | Catatan |
|---|---|---|
| Dokumen, catatan, ekstraksi, chunk memori | Sampai dihapus pengguna | Hapus manual per dokumen, atau hapus akun |
| Pengingat terkirim (status `sent`) | Sampai dihapus pengguna / hapus akun | Ditampilkan di timeline |
| Riwayat percakapan assistant | Sampai dihapus pengguna / hapus akun | Termasuk sitasi |
| Antrean approval | Kedaluwarsa otomatis 7 hari bila tidak diputuskan; riwayat tetap sampai hapus akun | — |
| Log aktivitas workspace | Sampai hapus akun | Audit internal, tidak dibagikan |

## Penghapusan akun
- MVP beta: **penghapusan langsung dan permanen** — semua workspace, dokumen, berkas turunan, sesi dihapus saat itu juga (kaskade FK), tanpa masa tenggang.
- Salinan backup yang sudah terbentuk sebelum penghapusan tetap ada **maksimal 14 hari** (lihat di bawah), lalu tertimpa oleh rotasi. Inilah satu-satunya residu.

## Backup operasional
- Backup database otomatis/manual (VACUUM INTO) disimpan **14 salinan terakhir**; salinan lebih tua dihapus otomatis.
- Setiap backup diverifikasi dapat-dibuka (integritas + hitung data inti).
- Backup berisi seluruh database → berlaku proteksi sama seperti data produksi (akses terbatas, tidak keluar server).

## Data teknis
| Jenis data | Retensi |
|---|---|
| Token sesi | Dihapus saat logout/penghapusan akun; kedaluwarsa 30 hari |
| Metering pemakaian AI (per bulan) | Sampai hapus akun — dasar enforcement kuota |
| Log pesan error server | Maksimal 30 hari (berkas log server) |
| Order pembayaran (billing_orders) | Sampai hapus akun — keperluan riwayat & sengketa |

## Saat produksi (Supabase)
Migrasi ke Supabase tidak mengubah kebijakan di atas; penghapusan akun akan
menjalankan kaskade PostgreSQL yang sama, dan RLS memastikan isolasi antar
workspace. Kebijakan ini ditinjau ulang sebelum beta publik.

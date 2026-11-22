# ORBIT Mobile (M7 — skeleton)

Aplikasi mobile ORBIT: React Native + **Expo SDK 58** + expo-router, mengonsumsi
**API v1** yang sama dengan konsol web (`app/server/index.mjs`, port 8787).

## Layar (bottom nav blueprint docs/03)
Home · Inbox · **Capture** (aksi utama: catatan teks + foto) · Timeline · Assistant,
plus Masuk/Daftar dan Akun (paket & pemakaian, keluar).

## Menjalankan
```bash
# 1. Server ORBIT harus hidup:
cd ../app && node server/index.mjs            # API v1 di :8787

# 2. Mobile (dev):
npm start                                     # Expo dev server (klik "w" untuk web / "a" Android)
# atau perangkat fisik: set EXPO_PUBLIC_API_URL=http://<IP-LAN>:8787/api/v1 di .env

# 3. Preview web statis (hasil export):
npm run export:web
node scripts/serve.mjs                        # http://localhost:8090
npm run typecheck                             # tsc --noEmit
```

Akun demo: `demo@orbit.id` / `orbit12345`.

## Catatan teknis
- **Token** di `expo-secure-store` (native) / `localStorage` (web) — `src/lib/api.ts`.
- **API base** `EXPO_PUBLIC_API_URL` (default `http://localhost:8787/api/v1`).
- **node_modules adalah junction** ke disk lokal (`webapp-node-modules/nm.orbit-mobile`) —
  JANGAN hapus junction atau `npm install` tanpa junction (mesin ini: OneDrive + node_modules rusak).
- Ikon Feather (`@expo/vector-icons`) sebagai pengganti Lucide (blueprint) — tanpa react-native-svg.
- Server web ORBIT mengirim header CORS (default `*`, atur `CORS_ORIGIN` untuk produksi).
- Capture foto: `expo-image-picker`; di web via Blob, di native via FormData uri.
- Pengembangan lanjutan: push notification, biometrik, pembayaran (Snap) di mobile.

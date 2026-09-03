# KKA Mobile

Aplikasi mobile **Kertas Kerja Audit (KKA)** — Inspektorat Kabupaten Rokan Hilir.
Dibangun dengan **Expo (React Native) + TypeScript**, data **sinkron langsung dengan server KKA live**
(https://kka.arsipdigital-inspektorat.com/api) — bukan data contoh/mock.

## Fitur

- 🔐 Login dengan akun yang sama dengan web KKA (token tersimpan aman via `expo-secure-store`)
- 📊 Dashboard: total sesi, desa, pagu, realisasi, sesi terbaru, rekap per bidang
- 📄 Sesi Audit: daftar + pencarian + filter tahun + pagination
- ✍️ Buat / Edit / Hapus sesi audit (pilih kecamatan → desa → bidang → sub bidang)
- 💰 Rincian belanja: tambah/edit/hapus, otomatis hitung selisih
- 📎 Lampiran: unggah dari galeri/file (PDF, Excel, JPG, PNG), buka & hapus
- 📈 Rekapitulasi per desa & per bidang dengan filter tahun
- 👤 Profil: ubah profil, ganti password, ganti URL server, keluar

## Menjalankan di HP (Expo Go)

1. **Update dulu** aplikasi **Expo Go** dari Play Store / App Store ke versi terbaru
   (project ini memakai Expo SDK 57; Expo Go lama akan error `import.meta`).
2. Di folder ini:
   ```bash
   npm install
   npx expo start
   ```
3. HP dan komputer harus **satu jaringan WiFi** yang sama.
4. Scan QR code dengan **Expo Go** (Android: dari dalam aplikasi; iOS: kamera).
5. Tidak bisa terhubung? Pakai mode tunnel:
   ```bash
   npx expo start --tunnel
   ```

> ⚠️ Jangan pakai script `run-web.js` dari Trae/alat lain — custom proxy itulah yang
> memicu `Error: spawn EINVAL`. Cukup jalankan `npx expo start` langsung.

## Konfigurasi URL Server

Buka layar **Login → "Pengaturan server (lanjutan)"** (atau **Profil → Server**), lalu isi:

```
https://kka.arsipdigital-inspektorat.com/api
```

Tanpa garis miring di akhir. Klik **"Uji koneksi"** — harus muncul *"Server aktif"*.
URL tersimpan aman di perangkat dan bisa diubah kapan saja.

## Build APK (untuk dipakai tanpa Expo Go)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Hasil APK diunduh dari link EAS yang muncul. (Butuh akun Expo; gratis untuk build internal.)

## Server: tabel yang wajib ada

Aplikasi memakai endpoint `/auth/login` yang menyimpan token di tabel `kka_api_tokens`,
dan fitur berbagi memakai `kka_sesi_share`. Jika login dari HP gagal (HTTP 500),
jalankan dulu SQL di [`backend-notes.md`](./backend-notes.md) pada database KKA.

## Struktur

```
mobile/
├── App.tsx                     # root: AuthProvider + Navigation
├── app.json                    # konfigurasi Expo
├── eas.json                    # profil build APK
└── src/
    ├── api/                    # client HTTP + semua endpoint API
    ├── components/ui.tsx       # komponen UI (Card, Button, Input, SelectModal, ...)
    ├── config.ts               # URL API live (bisa diganti di aplikasi)
    ├── context/AuthContext.tsx # login/logout + penyimpanan token
    ├── navigation/index.tsx    # navigasi (tab + stack)
    ├── screens/                # Login, Dashboard, Sesi, Detail, Form, Rekap, Profil
    ├── theme.ts                # warna & ukuran
    ├── types.ts                # tipe data respons API
    └── utils/format.ts         # format Rupiah, tanggal, byte
```

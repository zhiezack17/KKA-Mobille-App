# Build APK KKA Mobile (EAS Build)

Aplikasi siap di-build menjadi **APK Android** sehingga bisa diinstall langsung
di HP auditor **tanpa Expo Go**. Konfigurasi sudah disiapkan di `eas.json`
(profile `preview` = APK internal) dan `app.json` (package `id.go.rohil.kka.mobile`).

> ⚠️ Jika build gagal dengan **`Received status code 429 from server: Too Many Requests`**
> (Maven Central), itu **bukan** kesalahan project — Maven sedang menolak
> permintaan sementara (rate limit). Cukup tunggu 5–15 menit lalu ulangi perintah
> `eas build` (retry biasa berhasil pada percobaan ke-2/3). Jangan ubah kode.

## Prasyarat (sekali saja)
- Akun Expo gratis: https://expo.dev/signup (atau login jika sudah punya)
- Node.js terpasang (sudah)
- `eas-cli` terpasang: `npm install -g eas-cli`

## Langkah build

```powershell
cd C:\Users\fakhr\Downloads\kka-new\mobile
npm install
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

> `eas login` akan membuka browser; login pakai akun Expo Anda. Token/email
> tidak perlu dibagikan ke siapa pun.

## Sesudah perintah build jalan
1. EAS akan meng-upload project & membangun di cloud (±5–20 menit).
2. Selesai → terminal menampilkan **link unduhan APK** (mis. `https://expo.dev/artifacts/eas/...apk`).
3. Download APK di HP → buka → install (izinkan "install dari sumber tidak dikenal").
4. Buka app → login → data langsung dari server live.

## Catatan
- Build **gratis** untuk profile `preview` internal; tidak perlu konfigurasi Google Play.
- Kalau butuh APK yang di-sign & dipublikasikan resmi (Play Store), nanti tinggal
  tambahkan keystore di EAS → saya bantu siapkan lewat `eas credentials`.
- URL server di dalam app bisa diganti kapan pun di layar Login →
  "Pengaturan server (lanjutan)" / Profil → Server (tersimpan aman di perangkat).

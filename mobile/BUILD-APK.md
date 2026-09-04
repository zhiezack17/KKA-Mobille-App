# Build APK KKA Mobile (EAS Build) — versi final v1.2.0

Aplikasi siap di-build menjadi **APK Android** sehingga bisa diinstall langsung
di HP auditor **tanpa Expo Go**. Konfigurasi sudah disiapkan di `eas.json`
(profile `preview` = APK internal) dan `app.json` (package `id.go.rohil.kka.mobile`).

Fitur di build ini:
- Tema hijau emerald + aksen emas (sama dengan web KKA)
- Logo & icon **Inspektorat** (icon APK, splash, adaptive icon)
- URL API **dikunci** ke `https://kka.arsipdigital-inspektorat.com/api`
  (pengaturan server di Login/Profil sudah dihapus)
- Penanda versi `KKA Mobile v1.2.0` di Login & Dashboard

> ⚠️ Jika build gagal dengan **`Received status code 429 from server: Too Many Requests`**
> (Maven Central), itu **bukan** kesalahan project — Maven sedang menolak
> permintaan sementara (rate limit). Cukup tunggu 5–15 menit lalu ulangi perintah
> `eas build` (retry biasa berhasil pada percobaan ke-2/3). Jangan ubah kode.
> Jika gagal `ECONNRESET` sebelum build mulai — koneksi ke api.expo.dev putus,
> tunggu sebentar lalu ulangi.

## Prasyarat (sekali saja)
- Akun Expo: https://expo.dev (sudah punya — project `kka-mobile` akun `zhie08`)
- Node.js terpasang (sudah)
- `eas-cli` terpasang: `npm install -g eas-cli`

## Langkah build

```powershell
cd C:\Users\fakhr\Downloads\kka-new\mobile

# 1) Pastikan kode terbaru
git pull
git log --oneline -1    # harus menampilkan commit terbaru (cek di GitHub)

# 2) Pastikan dependensi terpasang (sekali saja / setelah pull besar)
npm install

# 3) Pastikan eas-cli terpasang
npm install -g eas-cli

# 4) Login sekali saja (buka browser, login akun Expo)
eas login

# 5) BUILD!
eas build --platform android --profile preview
```

> `eas login` membuka browser; login pakai akun Expo Anda (akun yang sama
> dengan build APK sebelumnya — `zhie08` / project `kka-mobile`).
> Token/email tidak perlu dibagikan ke siapa pun.

## Sesudah perintah build jalan
1. EAS akan meng-upload project & membangun di cloud (±5–20 menit, bisa lebih
   lama antrean; kalau sudah pernah build kemungkinan lebih cepat).
2. Selesai → terminal menampilkan **link hasil build**
   (mis. `https://expo.dev/accounts/zhie08/projects/kka-mobile/builds/...`).
3. Buka link → **install** `.apk` di HP (izinkan "install dari sumber tidak dikenal").
4. Buka app → login → data langsung dari server live.

## Catatan
- Build **gratis** untuk profile `preview` internal; tidak perlu konfigurasi
  Google Play.
- Kalau ditanya project/slug saat `eas build`: pilih **kka-mobile** (yang sudah
  ada), jangan buat project baru.
- Kalau butuh APK yang di-sign & dipublikasikan resmi (Play Store), nanti
  tambahkan keystore di EAS → `eas credentials`.
- **URL server tidak bisa diganti dari dalam app** (sengaja dikunci ke server
  resmi). Kalau server migrasi, ubah `DEFAULT_API_URL` di `mobile/src/config.ts`
  lalu build ulang.

# Persiapan Server untuk KKA Mobile

Aplikasi mobile memanggil REST API yang sudah ada di server live
(`https://kka.arsipdigital-inspektorat.com/api`). Jika **login dari HP gagal dengan
HTTP 500**, kemungkinan tabel di bawah belum dibuat di database KKA.

Jalankan SQL ini **sekali** di phpMyAdmin (pilih database KKA → tab SQL), lalu klik Go.

## 1. Tabel token API mobile (`kka_api_tokens`)

```sql
CREATE TABLE IF NOT EXISTS `kka_api_tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `token` VARCHAR(160) NOT NULL,
  `device_name` VARCHAR(100) DEFAULT 'mobile',
  `expires_at` DATETIME DEFAULT NULL,
  `last_used_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_token` (`token`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_api_token_user` FOREIGN KEY (`user_id`)
    REFERENCES `kka_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 2. Tabel berbagi sesi (`kka_sesi_share`)

```sql
CREATE TABLE IF NOT EXISTS `kka_sesi_share` (
  `sesi_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sesi_id`, `user_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `fk_share_sesi` FOREIGN KEY (`sesi_id`)
    REFERENCES `kka_sesi`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_share_user` FOREIGN KEY (`user_id`)
    REFERENCES `kka_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 3. Migrasi Master KKA (menu baru di mobile)

Jalankan `../database/migrasi_master_kka.sql` **sekali** di phpMyAdmin.
Bila tabel `kka_master*` sudah dibuat oleh web v13 dengan skema berbeda,
**jangan** jalankan file ini — kirimkan `migration_master_kka.sql` dari server
kepada developer agar disamakan.

## 4. File API yang wajib di-update di server

Setelah pull, **unggah ulang** file berikut ke folder API di server
(lokasi file `AuthApi.php` saat ini, umumnya `src/api/`, plus `index.php` di
folder front-controller-nya):

| File | Perubahan |
|---|---|
| `RekapApi.php` | 🔴 FIX: jumlah sesi/pagu berlipat karena join rincian (ini penyebab 27 → 69, 9 → 19) + filter kecamatan/bidang/sub bidang + data `per_grup` |
| `UsersApi.php` | 🔴 FIX: `PUT /profile` & `PUT /profile/password` kini berfungsi (sebelumnya selalu 405) |
| `RincianApi.php` | 🔴 FIX: auditor penerima sesi bersama kini bisa edit/hapus rincian |
| `MasterApi.php` | ✅ Tambah: update & hapus kecamatan |
| `MasterKkaApi.php` | 🆕 ENDPOINT `/master` (list, buat, edit, hapus, foto) |
| `index.php` | 🆕 Route `/master` |

## 5. Catatan bug API yang perlu diperbaiki di backend

Aplikasi ini sudah dibuat "defensif" (pesan error jelas), tapi agar fitur berikut
berjalan penuh di backend:

| Masalah | Efek di aplikasi | Perbaikan |
|---|---|---|
| `ACCESS_TOKEN_TTL = 1800` (30 menit), tanpa refresh token | Sesi HP berakhir 30 menit, diminta login lagi | Naikkan TTL (mis. 86400) atau tambah refresh token; abaikan `.env MOBILE_API_ACCESS_TTL` |
| `PUT /profile` & `PUT /profile/password` di `UsersApi.php` dibungkus `if ($method === 'GET' || $method === 'POST')` | Edit profil & ganti password dari HP balas 405 | Pindahkan blok PUT ke luar kondisi method |
| Rumus selisih API: `dikwitansi − realisasi` | Beda angka dengan web (v13 = `realisasi − dikwitansi`) | Samakan `selisih = realisasi − dikwitansi` di `SesiApi.php`, `RekapApi.php`, `DashboardApi.php` |
| `RincianApi` hanya izinkan pembuat sesi untuk GET/PUT/DELETE | Auditor yang menerima sesi bersama dapat 403 saat edit rincian | Samakan pengecekan dengan `api_sesi_is_owned()` |

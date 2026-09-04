# Rotasi Kredensial KKA (keamanan)

## Kenapa wajib?
File `.env` (berisi `DB_PASS` + `ADMIN_PASSWORD`) dan `koneksi.php` (password DB
hardcode) pernah di-commit ke repo GitHub **publik** (`zhiezack17/KKA-Mobille-App`
pada commit awal `695ad98`). Siapa pun yang melihat history repo bisa membaca
kredensial tersebut → **dianggap bocor**. Solusi: ganti password (rotasi).

> Status: rotasi **SUDAH selesai** pada 2026-09-04 — password DB (aaPanel GUI)
> dan password admin (web Profil) sudah diganti; web & APK tetap jalan.

## Alur yang terbukti benar (urutan penting!)

**Jangan pernah menimpa `.env` sebelum password MySQL benar-benar berhasil
diganti.** (Pelajaran dari v1: script gagal `ALTER USER` karena user aaPanel
tidak punya izin, tapi `.env` sudah tertimpa → web putus koneksi.)

### 1. Diagnosa dulu — tidak menampilkan password
Jalankan dari repo ini (atau tempel baris perintahnya di Terminal aaPanel):

```bash
bash verify-db-connection-aapanel.sh
```

Hasil yang mungkin:
| [1] .env sekarang | [2] kredensial baru | [3] backup lama | Arti & aksi |
|---|---|---|---|
| ✅ | — | — | Koneksi normal, lanjut ke langkah 3 |
| ❌ | ✅ | — | MySQL sudah pakai password baru → salin `.env` dari backup |
| ❌ | ❌ | ✅ | **Kasus khas aaPanel** → lanjut langkah 2 (GUI) |

### 2. Ganti password DB via aaPanel GUI (cara resmi, selalu berhasil)
1. aaPanel → **Databases** → pilih user aplikasi → **Change Password**
2. Ambil password baru dari file kredensial (baca di server, **jangan dikirim ke chat**):
   ```bash
   cat /www/backup-kka/kka-credentials-<timestamp>.txt   # baris DB_PASS
   ```
3. Tempel ke GUI → **Confirm**. Karena `.env` sudah berisi password baru itu,
   web langsung kembali normal dan rotasi selesai.
4. Jalankan ulang `verify-db-connection-aapanel.sh` → harus `[1] ✅` **dan** `[2] ✅`.

### 3. Rotasi password ADMIN (web)
1. Login web KKA (https://kka.arsipdigital-inspektorat.com)
2. **Profil → Ganti Password** → isi password baru yang kuat → login ulang.
   (Password admin tersimpan di tabel `kka_users`, bukan di `.env`.)

## Script otomatis (opsional)
`rotate-kka-credentials-aapanel.sh` **v2** — perbaikan dari v1:
- Mencoba `ALTER USER` sebagai user aplikasi; jika gagal, mencoba root aaPanel
  (password dibaca dari `/www/server/panel/data/default.pl`).
- `.env` **hanya diperbarui setelah ALTER sukses**. Jika keduanya gagal,
  `.env` tetap utuh dan script menampilkan panduan GUI (langkah 2).
- Backup `.env` lama + kredensial baru tersimpan di `/www/backup-kka/`
  (izin 600), dan `koneksi.php` dinonaktifkan bila ada.

## Bersihkan repo Git (status sekarang)
- `.env`, `koneksi.php`, `src.zip`, `error_log` sudah **dilepas dari tracking**
  (commit `604e6e8`) + ada di `.gitignore` → tidak akan ter-commit lagi.
- Riwayat commit awal `695ad98` **masih** memuat `.env` lama — sudah tidak
  berguna karena password dirotasi, tetapi untuk pembersihan penuh diperlukan
  `git filter-repo` + force-push + clone ulang (mengubah semua hash).
  Disarankan dilakukan bila repo publik akan dipakai jangka panjang.

## Cek akhir setelah rotasi
| Cek | Status yang diharapkan |
|---|---|
| Web KKA login & menu Master KKA | ✔ tetap jalan |
| Aplikasi HP (APK) login & data sinkron | ✔ tetap jalan (login ulang) |
| `SELECT COUNT(*) FROM kka_master` | ≥ 1 (data aman) |
| File `.env` di repo | tidak ter-commit; `.env.example` saja |

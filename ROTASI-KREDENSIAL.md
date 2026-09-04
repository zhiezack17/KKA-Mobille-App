# Rotasi Kredensial KKA (keamanan)

## Kenapa wajib sekarang?
File `.env` (berisi `DB_PASS` + `ADMIN_PASSWORD`) dan `koneksi.php` (password DB
hardcode) pernah di-commit ke repo GitHub **publik** (`zhiezack17/KKA-Mobille-App`
pada commit awal `695ad98`). Siapa pun yang melihat history repo bisa membaca
kredensial tersebut → **dianggap bocor**. Solusi: ganti password (rotasi).

## Langkah 1: Rotasi password database (di server, terminal aaPanel)
Jalankan script `rotate-kka-credentials-aapanel.sh` (tersedia di repo ini):

```bash
bash rotate-kka-credentials-aapanel.sh
```

Yang dilakukan script (aman & otomatis):
- Generate password MySQL **baru** (acak 48 karakter)
- Ganti password user database aplikasi
- Update `DB_PASS` di `.env`
- Backup `.env` lama + simpan kredensial baru ke
  `/www/backup-kka/kka-credentials-<timestamp>.txt` (izin 600, **jangan dibagikan**)
- Verifikasi koneksi database dengan password baru
- Nonaktifkan `koneksi.php` di server (pindah ke `koneksi.php.disabled`)

> Tidak menampilkan password di layar. Baca file kredensial hanya bila perlu:
> `cat /www/backup-kka/kka-credentials-<timestamp>.txt`

Jika script gagal di langkah ganti-password (izin MySQL), ganti manual:
aaPanel → **Databases → MySQL** → user aplikasi → **Change Password**
(lihat password baru di file kredensial di atas).

## Langkah 2: Rotasi password ADMIN (web)
1. Login web KKA (https://kka.arsipdigital-inspektorat.com)
2. Klik **Profil** → **Ganti Password** → isi password baru yang kuat.
3. login ulang. (Password admin tersimpan di tabel `kka_users`, bukan di `.env`
   — `.env` hanya dipakai installer awal.)

## Langkah 3: Bersihkan repo Git
- `.env`, `koneksi.php`, `src.zip`, `error_log` sudah **dilepas dari track Git**
  (commit terbaru) + masuk `.gitignore` → tidak akan ter-commit lagi.
- **Opsional (lanjutan): hapus kredensial dari riwayat Git lama** — perlu
  `git filter-repo`/BFG + force-push ke cabang sesi (mengubah semua hash
  commit; clone lokal harus di-clone ulang). Tanyakan developer terlebih
  dahulu — disarankan dilakukan, tapi bisa juga dibiarkan karena password
  sudah diganti (riwayat lama tak lagi berguna bagi penyusup).

## Setelah rotasi — cek akhir
| Cek | Status yang diharapkan |
|---|---|
| Web KKA login & menu Master KKA | ✔ tetap jalan |
| Aplikasi HP (APK) login & data sinkron | ✔ tetap jalan (login ulang) |
| `SELECT COUNT(*) FROM kka_master` di phpMyAdmin | ≥ 1 (data aman) |
| File `.env` di repo | tidak ter-commit; `.env.example` saja |

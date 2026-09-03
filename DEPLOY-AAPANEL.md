# Panduan Restore Master KKA (aaPanel) — dari repo `KKA-Update`

## 1. Jawaban pertanyaan: folder apa yang di-upload?

Dari ZIP `KKA-Update-main.zip` (hasil **Code → Download ZIP** di
github.com/zhiezack17/KKA-Update), isi `main` terdiri dari:

```
KKA-Update-main/
├── .emergent/   ← folder kerja AI/alat — JANGAN di-upload
├── memory/      ← catatan AI/alat       — JANGAN di-upload
├── kka/         ← ★ APLIKASI-NYA. Cukup folder ini
├── .gitconfig
├── .gitignore
└── README.md
```

**Jadi yang relevan hanya isi folder `kka/`** (dan di dalamnya, idealnya
hanya file v13 yang berubah — lihat script). `.emergent` & `memory` bukan
bagian aplikasi; meng-uploadnya ke server tidak salah tapi tidak berguna
dan mengotori folder.

Cara paling aman & cepat: **pakai script `restore-master-kka-aapanel.sh`** —
script itu otomatis mengekstrak ZIP dan hanya menyalin 8 file v13 yang
diperlukan, plus backup dulu.

## 2. Langkah terminal aaPanel (ringkas)

```bash
# 1. Download ZIP dari GitHub (Code -> Download ZIP) di komputer Anda
# 2. Upload KKA-Update-main.zip ke /tmp/ via aaPanel -> File Manager
# 3. aaPanel -> Terminal, lalu:
cd /tmp
wget -O KKA-Update-main.zip https://github.com/zhiezack17/KKA-Update/archive/refs/heads/main.zip  # ATAU upload manual
```

Kalau sudah upload manual ke `/tmp/KKA-Update-main.zip`, cukup jalankan:

```bash
bash restore-master-kka-aapanel.sh
```

> Script tersedia di repo ini (`restore-master-kka-aapanel.sh`). Versi terbaru
> **OTOMATIS mencari folder situs KKA** di `/www/wwwroot` (tidak perlu menebak
> nama folder — di server Anda folder KKA belum tentu
> `/www/wwwroot/kka.arsipdigital-inspektorat.com`).

## 3. Yang dilakukan script (rangkuman)

| Langkah | Aksi |
|---|---|
| 1–2 | Cek folder site + **backup** seluruh folder (tar.gz ke `/www/backup-kka/`) |
| 3 | Ekstrak ZIP → lokasi `/tmp/restore-master/KKA-Update-main/kka` |
| 4 | Salin 8 file v13: `MasterKkaController.php`, `views/master/*` (4), `sidebar.php`, `public/index.php`, `migration_master_kka.sql` (+ template `.xls` bila ada) |
| 5 | Permission `uploads/` → 775 (fix bug upload 500) |
| 6 | Jalankan migrasi DB dari kredensial `.env` (fallback: phpMyAdmin) |
| 7 | Cek `COUNT(*)` tabel master (apakah data lama masih ada) |
| 8 | Verifikasi + saran langkah berikutnya |

## 4. Kalau datanya masih kosong setelah ini

Kemungkinan data di **database** sudah tidak ada (bukan sekadar file
tertimpa). Maka perlu pulihkan dari backup database:

```bash
# aaPanel -> Databases -> pilih DB -> Import (upload file .sql backup lama)
```

Setelah itu jalankan lagi langkah 6–7 script untuk memastikan tabel & data
siap. Jika masih ada masalah, kirimkan:
- output step 7 (angka `master/fisik/foto`), dan
- isi Error Log website (aaPanel → Website → Error Log).

## 5. Tidak perlu meng-upload folder ini ke server

Repo `KKA-Mobille-App` berisi **API mobile + aplikasi mobile**. File
`MasterKkaApi.php` di sini sudah DISAMAKAN dengan skema asli `KKA-Update`
(kolom `lebar_i`/`lebar_ii`, `no_kka`, `ref_pka`, `pendamping`, `ketua_tim`,
`tanggal_dok`, dst.) sehingga mobile dan web memakai tabel yang sama.
Update file API mobile di server hanya diperlukan jika ingin fitur Master
KKA di HP ikut aktif — terpisah dari perbaikan halaman web di atas.

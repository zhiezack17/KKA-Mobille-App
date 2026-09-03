# KKA - Kertas Kerja Audit
## Inspektorat Kabupaten Rokan Hilir

Aplikasi pencatatan & cetak Kertas Kerja Audit (KKA) untuk pengeluaran keuangan kepenghuluan.
Dibangun dengan PHP 8.1+ native dan MySQL/MariaDB agar **kompatibel penuh dengan shared hosting cPanel**.

---

## 🚀 Cara Deploy ke cPanel

### 1. Siapkan Database di cPanel
- Login cPanel → menu **MySQL Databases**
- Buat database baru, contoh: `nama_kka`
- Buat user MySQL baru + password
- Tambahkan user ke database dengan privilege **ALL PRIVILEGES**

### 2. Upload file ke cPanel
1. Login cPanel → buka **File Manager**
2. Masuk ke `public_html` (atau subdomain `arsipdigital-inspektorat.com`)
3. Upload **isi folder ini** (jangan folder pembungkusnya). Struktur akhir:
   ```
   public_html/
   ├── index.php          (root sebenarnya = public/)
   ├── .htaccess
   ├── assets/
   ├── uploads/
   ├── install.php
   └── ../src/  ../database/  .env
   ```
   **PENTING**: Folder `src/`, `database/`, dan file `.env` HARUS berada **di luar** `public_html` (atau dipindah satu level di atas) supaya tidak bisa diakses publik.

   **Cara mudah**: Upload SELURUH folder ini ke `~/kka/` (di home), lalu di cPanel pilih **Document Root** subdomain `arsipdigital-inspektorat.com` ke `~/kka/public`.

### 3. Konfigurasi
- Copy `.env.example` → `.env`
- Edit `.env`, isi `DB_NAME`, `DB_USER`, `DB_PASS` sesuai cPanel
- Ganti `APP_URL` ke `https://arsipdigital-inspektorat.com`
- Set `APP_DEBUG=false` untuk production
- Ganti `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dengan kredensial yang Anda inginkan

### 4. Pilih versi PHP di cPanel
- Menu **Select PHP Version** → pilih **PHP 8.1** atau **PHP 8.2**
- Ekstensi yang HARUS aktif: `pdo_mysql`, `mbstring`, `fileinfo`, `gd` (opsional, untuk thumbnail)

### 5. Jalankan Installer
Buka di browser: **https://arsipdigital-inspektorat.com/install.php**

Installer akan:
- Membuat seluruh tabel database
- Mengisi data master: **18 Kecamatan + ~180 Desa** Rokan Hilir
- Mengisi **5 Bidang + 27 Sub Bidang** sesuai data Dana Desa
- Membuat akun admin pertama

### 6. ⚠️ HAPUS file `install.php` setelah selesai!
Demi keamanan, hapus `public/install.php` dari server lewat File Manager cPanel.

### 7. Login
- URL: `https://arsipdigital-inspektorat.com/login`
- Email: `admin@inspektorat-rohil.go.id`
- Password: `Admin@2026` (sesuai `.env`)
- **Segera ganti password** lewat menu Profil.

---

## 📂 Struktur Folder
```
kka/
├── public/                  ← Document root di cPanel
│   ├── index.php           ← Front controller
│   ├── install.php         ← One-click installer (hapus setelah dipakai)
│   ├── .htaccess           ← URL rewrite & security
│   ├── assets/             ← CSS, JS, gambar/logo
│   └── uploads/            ← Lampiran (PDF/Excel/gambar)
├── src/
│   ├── config.php          ← Loader .env
│   ├── bootstrap.php       ← Init session, DB, autoload
│   ├── lib/                ← DB.php, Auth.php, Helpers.php
│   ├── controllers/        ← 8 controllers
│   └── views/              ← Template HTML/PHP
├── database/
│   ├── schema.sql          ← Skema DB
│   └── seed_data.php       ← Data master kecamatan/desa/bidang
├── .env.example
└── README.md (file ini)
```

## 🔐 Fitur Keamanan
- Password disimpan dengan **bcrypt** (`password_hash`)
- **CSRF protection** di semua form POST
- **SQL injection protection** lewat prepared statements (PDO)
- **XSS protection** lewat `htmlspecialchars` (helper `e()`)
- Validasi MIME type & ukuran untuk upload
- Folder `uploads/` diblokir dari eksekusi script PHP

## 👤 Role & Hak Akses
| Aksi                       | Admin | Auditor |
|----------------------------|:-----:|:-------:|
| Login & lihat dashboard    | ✅    | ✅      |
| CRUD sesi audit            | ✅    | ✅      |
| CRUD rincian belanja       | ✅    | ✅      |
| Upload lampiran            | ✅    | ✅      |
| Cetak & Export Excel       | ✅    | ✅      |
| Tambah/edit/hapus desa     | ✅    | ❌      |
| Tambah kecamatan baru      | ✅    | ❌      |
| Kelola pengguna            | ✅    | ❌      |

## 📞 Support
Inspektorat Kabupaten Rokan Hilir
inspektorat@rohilkab.go.id

© <?= date('Y') ?> Pemerintah Kabupaten Rokan Hilir

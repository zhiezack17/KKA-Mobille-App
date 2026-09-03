#!/bin/bash
# =====================================================================
# RESTORE MASTER KKA (update v13) - Terminal aaPanel
# Inspektorat Kabupaten Rokan Hilir
# ---------------------------------------------------------------------
# CARA PAKAI:
#   1. Download ZIP dari GitHub: github.com/zhiezack17/KKA-Update
#      (tombol Code -> Download ZIP) -> file: KKA-Update-main.zip
#   2. Upload file tsb ke folder /tmp/ lewat aaPanel -> File Manager
#      (atau: taruh di /www/wwwroot/, lalu ubah ZIP_PATH di bawah)
#   3. Buka aaPanel -> Terminal (atau SSH), salin SELURUH script ini,
#      paste, jalankan. SCRIPT INI AMAN: backup dulu & TIDAK menghapus data.
# =====================================================================

set -e  # hentikan bila ada langkah gagal (agar tidak setengah jalan)

# ------------------- KONFIGURASI (sesuaikan bila perlu) -------------------
SITE="/www/wwwroot/kka.arsipdigital-inspektorat.com"   # folder subdomain KKA
ZIP_PATH="/tmp/KKA-Update-main.zip"                    # lokasi file zip yg diupload
BACKUP_DIR="/www/backup-kka"                           # folder backup (otomatis dibuat)

echo "==> [1/8] Cek folder & file"
if [ ! -d "$SITE" ]; then
  echo "ERROR: folder $SITE tidak ditemukan. Ubah variabel SITE di script."
  exit 1
fi
if [ ! -f "$ZIP_PATH" ]; then
  echo "ERROR: file zip $ZIP_PATH tidak ada. Upload dulu via File Manager."
  exit 1
fi
echo "    OK: $SITE dan $ZIP_PATH ditemukan."

echo "==> [2/8] BACKUP dulu (penting!)"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kka-before-$STAMP.tar.gz"
# Backup seluruh folder site (kecuali folder backup lama & file besar tak perlu)
tar -czf "$BACKUP_FILE" -C "$(dirname "$SITE")" "$(basename "$SITE")" \
  --exclude="$BACKUP_DIR" 2>/dev/null || true
echo "    Backup tersimpan: $BACKUP_FILE"
echo "    (kalau nanti salah, tinggal: tar -xzf $BACKUP_FILE -C /www/wwwroot/)"

echo "==> [3/8] Ekstrak ZIP GitHub"
rm -rf /tmp/restore-master
mkdir -p /tmp/restore-master
unzip -oq "$ZIP_PATH" -d /tmp/restore-master
SRC="/tmp/restore-master/KKA-Update-main/kka"
if [ ! -d "$SRC" ]; then
  echo "ERROR: folder 'kka' tidak ada di dalam ZIP ($SRC)."
  echo "  Cek struktur: unzip -l $ZIP_PATH | head -20"
  exit 1
fi
echo "    OK: folder kka ditemukan."

echo "==> [4/8] Salin file v13 (hanya file Master KKA + menu + router)"
# Controller Manager KKA (yang hilang / tertimpa versi lama)
cp -f "$SRC/src/controllers/MasterKkaController.php" \
      "$SITE/src/controllers/MasterKkaController.php"

# Halaman web Master KKA (list, create, edit, preview)
mkdir -p "$SITE/src/views/master"
cp -f "$SRC/src/views/master/index.php"  "$SITE/src/views/master/index.php"
cp -f "$SRC/src/views/master/create.php" "$SITE/src/views/master/create.php"
cp -f "$SRC/src/views/master/edit.php"   "$SITE/src/views/master/edit.php"
cp -f "$SRC/src/views/master/preview.php" "$SITE/src/views/master/preview.php"

# Menu sidebar "Master KKA"
cp -f "$SRC/src/views/partials/sidebar.php" "$SITE/src/views/partials/sidebar.php"

# Router: tambah route /master (index.php public)
cp -f "$SRC/public/index.php" "$SITE/public/index.php"

# File migrasi database (untuk langkah 6)
mkdir -p "$SITE/database"
cp -f "$SRC/database/migration_master_kka.sql" "$SITE/database/migration_master_kka.sql"

# Opsional: template Excel KKP_MASTER.xls (bila file template hilang)
if [ -f "$SRC/public/uploads/master/KKP_MASTER.xls" ]; then
  mkdir -p "$SITE/public/uploads/master"
  cp -f "$SRC/public/uploads/master/KKP_MASTER.xls" \
        "$SITE/public/uploads/master/KKP_MASTER.xls"
  echo "    Template KKP_MASTER.xls ikut dipulihkan."
fi
echo "    OK: 8 file v13 selesai disalin."

echo "==> [5/8] Permission folder upload (fix bug 500)"
mkdir -p "$SITE/public/uploads/master"
chown -R www:www "$SITE/public/uploads" 2>/dev/null || echo "    (chown dilewati - lanjut)"
chmod -R 775 "$SITE/public/uploads" 2>/dev/null || true

echo "==> [6/8] Migrasi database (aman: CREATE TABLE IF NOT EXISTS)"
# Ambil kredensial dari .env aplikasi agar otomatis
DB_NAME=""
DB_USER=""
DB_PASS=""
if [ -f "$SITE/.env" ]; then
  DB_NAME=$(grep -E '^DB_NAME=' "$SITE/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  DB_USER=$(grep -E '^DB_USER=' "$SITE/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  DB_PASS=$(grep -E '^DB_PASS=' "$SITE/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SITE/database/migration_master_kka.sql" \
    && echo "    OK: migrasi berhasil (tabel siap)." \
    || echo "    GAGAL jalankan migrasi. Buka phpMyAdmin -> DB -> SQL -> paste isi database/migration_master_kka.sql"
else
  echo "    .env tidak terbaca. Jalankan manual via phpMyAdmin:"
  echo "    paste isi file: $SITE/database/migration_master_kka.sql -> Go"
fi

echo "==> [7/8] Cek data Master KKA (kunci: apakah data lama masih ada?)"
if [ -n "$DB_NAME" ]; then
  echo "    (bila muncul angka > 0, data MASIH ADA di database)"
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e \
    "SELECT (SELECT COUNT(*) FROM kka_master) AS master, \
            (SELECT COUNT(*) FROM kka_master_fisik) AS fisik, \
            (SELECT COUNT(*) FROM kka_master_foto) AS foto;" \
    2>/dev/null || echo "    (cek manual di phpMyAdmin: SELECT COUNT(*) FROM kka_master;)"
fi

echo "==> [8/8] Verifikasi file & selesai"
ls -la "$SITE/src/controllers/MasterKkaController.php" \
       "$SITE/src/views/master/" \
       "$SITE/public/uploads/master" 2>/dev/null || true
echo ""
echo "==============================================================="
echo " SELESAI. Silakan:"
echo "  1) Login web KKA -> menu 'Master KKA' harus muncul lagi"
echo "  2) Kalau data masih ada -> dokumen lama langsung tampil"
echo "  3) Kalau halaman kosong (padahal COUNT > 0) -> mungkin .env"
echo "     /config salah; atau minta developer cek log."
echo "  4) Tidak muncul? Buka aaPanel -> Website -> Error Log."
echo "==============================================================="

#!/bin/bash
# =====================================================================
# RESTORE MASTER KKA (update v13) - Terminal aaPanel  [VERSI AUTO-DETEKSI]
# Inspektorat Kabupaten Rokan Hilir
# ---------------------------------------------------------------------
# CARA PAKAI:
#   1. Download ZIP: github.com/zhiezack17/KKA-Update -> Code -> Download ZIP
#   2. Upload KKA-Update-main.zip ke /tmp/ (aaPanel -> File Manager)
#   3. aaPanel -> Terminal, paste SELURUH script ini, Enter
#   Script ini OTOMATIS mencari folder aplikasi KKA (tidak perlu
#   menebak nama folder). AMAN: backup dulu, tidak menghapus data.
# =====================================================================

ZIP_PATH="/tmp/KKA-Update-main.zip"

# ------------------- [1] CARI FOLDER SITUS KKA OTOMATIS -------------------
# Penanda aplikasi web KKA = file src/controllers/SesiController.php
SITE=$(find /www/wwwroot -maxdepth 4 -name "SesiController.php" \
       -path "*/src/controllers/*" 2>/dev/null | head -1 \
       | sed 's|/src/controllers/SesiController.php||')

if [ -z "$SITE" ] || [ ! -d "$SITE" ]; then
  echo "==> Folder aplikasi KKA TIDAK ditemukan di /www/wwwroot."
  echo "    Daftar folder situs yang ada:"
  ls -la /www/wwwroot/
  echo
  echo "    Kalau aplikasi berada di luar /www/wwwroot, edit baris:"
  echo "    SITE=\"/path/ke/folder-kka\""
  exit 1
fi
echo "==> [1/8] Folder situs ditemukan: $SITE"

if [ ! -f "$ZIP_PATH" ]; then
  echo "ERROR: file $ZIP_PATH tidak ada."
  echo "Upload KKA-Update-main.zip ke /tmp/ dulu (aaPanel -> File Manager)."
  exit 1
fi

# ------------------- [2] BACKUP DULU -------------------
mkdir -p /www/backup-kka
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/www/backup-kka/kka-before-$STAMP.tar.gz"
tar -czf "$BACKUP_FILE" -C "$(dirname "$SITE")" "$(basename "$SITE")"
echo "==> [2/8] Backup: $BACKUP_FILE"
echo "    (pulihkan dengan: tar -xzf $BACKUP_FILE -C /www/wwwroot/)"

# ------------------- [3] EKSTRAK ZIP -------------------
rm -rf /tmp/restore-master
mkdir -p /tmp/restore-master
unzip -oq "$ZIP_PATH" -d /tmp/restore-master
SRC="/tmp/restore-master/KKA-Update-main/kka"
if [ ! -d "$SRC" ]; then
  echo "ERROR: folder 'kka' tidak ditemukan di dalam ZIP."
  echo "  Periksa struktur: unzip -l $ZIP_PATH | head -20"
  exit 1
fi
echo "==> [3/8] ZIP OK (folder kka ditemukan)"

# ------------------- [4] SALIN 8 FILE v13 -------------------
cp -f "$SRC/src/controllers/MasterKkaController.php" \
      "$SITE/src/controllers/MasterKkaController.php"

mkdir -p "$SITE/src/views/master"
cp -f "$SRC/src/views/master/index.php"  "$SITE/src/views/master/index.php"
cp -f "$SRC/src/views/master/create.php" "$SITE/src/views/master/create.php"
cp -f "$SRC/src/views/master/edit.php"   "$SITE/src/views/master/edit.php"
cp -f "$SRC/src/views/master/preview.php" "$SITE/src/views/master/preview.php"

cp -f "$SRC/src/views/partials/sidebar.php" "$SITE/src/views/partials/sidebar.php"
cp -f "$SRC/public/index.php" "$SITE/public/index.php"

mkdir -p "$SITE/database"
cp -f "$SRC/database/migration_master_kka.sql" "$SITE/database/migration_master_kka.sql"

if [ -f "$SRC/public/uploads/master/KKP_MASTER.xls" ]; then
  mkdir -p "$SITE/public/uploads/master"
  cp -f "$SRC/public/uploads/master/KKP_MASTER.xls" \
        "$SITE/public/uploads/master/KKP_MASTER.xls"
  echo "    Template KKP_MASTER.xls ikut dipulihkan."
fi
echo "==> [4/8] 8 file v13 selesai disalin"

# ------------------- [5] PERMISSION UPLOAD -------------------
mkdir -p "$SITE/public/uploads/master"
chown -R www:www "$SITE/public/uploads" 2>/dev/null || true
chmod -R 775 "$SITE/public/uploads" 2>/dev/null || true
echo "==> [5/8] Permission upload diperbaiki (775)"

# ------------------- [6] MIGRASI DATABASE -------------------
DB_NAME=""; DB_USER=""; DB_PASS=""
if [ -f "$SITE/.env" ]; then
  DB_NAME=$(grep -E '^DB_NAME=' "$SITE/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  DB_USER=$(grep -E '^DB_USER=' "$SITE/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  DB_PASS=$(grep -E '^DB_PASS=' "$SITE/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
fi
if [ -n "$DB_NAME" ] && [ -n "$DB_USER" ]; then
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$SITE/database/migration_master_kka.sql" \
    && echo "==> [6/8] Migrasi DB BERHASIL (tabel master siap)" \
    || echo "==> [6/8] GAGAL migrasi -> jalankan manual di phpMyAdmin:"
            echo "       paste isi $SITE/database/migration_master_kka.sql -> Go"
else
  echo "==> [6/8] .env tidak terbaca -> jalankan manual di phpMyAdmin:"
  echo "       paste isi $SITE/database/migration_master_kka.sql -> Go"
fi

# ------------------- [7] CEK DATA (KUNCI!) -------------------
echo "==> [7/8] Cek data Master KKA (angka > 0 = data lama masih ada):"
if [ -n "$DB_NAME" ]; then
  mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e \
    "SELECT (SELECT COUNT(*) FROM kka_master) AS master_dokumen,
            (SELECT COUNT(*) FROM kka_master_fisik) AS baris_fisik,
            (SELECT COUNT(*) FROM kka_master_foto) AS foto;" 2>/dev/null \
    || echo "    (cek manual: SELECT COUNT(*) FROM kka_master;)"
fi

# ------------------- [8] SELESAI -------------------
echo "==> [8/8] Verifikasi file:"
ls -la "$SITE/src/controllers/MasterKkaController.php" \
       "$SITE/src/views/master/" \
       "$SITE/public/uploads/master" 2>/dev/null || true
echo ""
echo "=============================================================="
echo " SELESAI."
echo " 1) Buka web KKA -> menu 'Master KKA' harus muncul lagi"
echo " 2) Kalau menu ada tapi kosong padahal COUNT > 0 ->"
echo "    laporkan output step [7/8] ke developer"
echo " 3) Masih error? aaPanel -> Website -> Error Log"
echo "=============================================================="

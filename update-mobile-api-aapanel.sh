#!/bin/bash
# =====================================================================
# UPDATE MOBILE API - pasang endpoint /master + fix API di server
# Inspektorat Kabupaten Rokan Hilir  |  SUMBER: repo KKA-Mobille-App
# ---------------------------------------------------------------------
# CARA PAKAI (di rumah):
#   1. Login aaPanel -> Terminal (atau SSH)
#   2. Paste SELURUH script ini -> Enter
#   Script: backup file lama -> unduh 6 file terbaru dari GitHub ->
#           letakkan di folder API yang benar -> verifikasi.
#   AMAN: backup dulu, tidak menyentuh database, tidak menyentuh web.
# =====================================================================

BASE="https://raw.githubusercontent.com/zhiezack17/KKA-Mobille-App/arena/01a065e2-kka-mobille-app"
STAMP=$(date +%Y%m%d_%H%M%S)

# ------------------- [1] CARI FOLDER API MOBILE -------------------
# Folder API ditandai oleh file AuthApi.php (biasanya: /www/wwwroot/kka/src/api)
API_DIR=$(find /www/wwwroot -maxdepth 6 -name "AuthApi.php" \
          -path "*src/api*" 2>/dev/null | head -1 | xargs -r dirname)

if [ -z "$API_DIR" ] || [ ! -d "$API_DIR" ]; then
  echo "==> Folder API TIDAK ditemukan. Cari manual:"
  find /www/wwwroot -name "AuthApi.php" 2>/dev/null | head -10
  exit 1
fi
echo "==> [1/6] Folder API: $API_DIR"

# ------------------- [2] CARI FRONT-CONTROLLER API -------------------
# index.php API adalah file yang memuat api_bootstrap.php
API_INDEX=$(grep -rl "api_bootstrap" /www/wwwroot/kka --include="*.php" 2>/dev/null \
            | grep -Ei "index\.php$" | head -1)
if [ -z "$API_INDEX" ]; then
  echo "==> index.php API tidak ditemukan (grep api_bootstrap). Cek manual."
  API_INDEX=""
else
  echo "==> [2/6] Front-controller API: $API_INDEX"
fi

# ------------------- [3] BACKUP FILE LAMA -------------------
BACKUP_DIR="/www/backup-kka/api-backup-$STAMP"
mkdir -p "$BACKUP_DIR"
if [ -f "$API_DIR/AuthApi.php" ]; then cp -f "$API_DIR"/*.php "$BACKUP_DIR/" 2>/dev/null || true; fi
[ -n "$API_INDEX" ] && cp -f "$API_INDEX" "$BACKUP_DIR/index.php.bak" 2>/dev/null || true
echo "==> [3/6] Backup: $BACKUP_DIR"

# ------------------- [4] UNDUH 6 FILE TERBARU DARI GITHUB -------------------
mkdir -p /tmp/mobile-api
cd /tmp/mobile-api
for f in MasterKkaApi.php RekapApi.php UsersApi.php RincianApi.php MasterApi.php; do
  curl -fSL "$BASE/$f" -o "$f" && echo "    ✔ $f" || echo "    ✘ GAGAL $f"
done
if [ -n "$API_INDEX" ]; then
  curl -fSL "$BASE/index.php" -o "index.php" && echo "    ✔ index.php" || echo "    ✘ GAGAL index.php"
fi
echo "==> [4/6] Unduhan selesai"

# ------------------- [5] PASANG KE SERVER -------------------
for f in MasterKkaApi.php RekapApi.php UsersApi.php RincianApi.php MasterApi.php; do
  if [ -f "/tmp/mobile-api/$f" ]; then
    cp -f "/tmp/mobile-api/$f" "$API_DIR/$f"
    echo "    → $API_DIR/$f"
  fi
done
if [ -n "$API_INDEX" ] && [ -f "/tmp/mobile-api/index.php" ]; then
  cp -f "/tmp/mobile-api/index.php" "$API_INDEX"
  echo "    → $API_INDEX"
fi
echo "==> [5/6] Pemasangan selesai (perhatikan: yang dipasang adalah index.php API,"
echo "             BUKAN public/index.php web — dua-duanya berbeda!)"

# ------------------- [6] VERIFIKASI -------------------
echo "==> [6/6] Verifikasi:"
ls -la "$API_DIR/MasterKkaApi.php" "$API_DIR/RekapApi.php" 2>/dev/null || true
if [ -n "$API_INDEX" ]; then
  grep -c "require .*MasterKkaApi" "$API_INDEX" && echo "    ✔ Route /master TERDAFTAR" || echo "    ✘ route /master belum ada"
fi

echo ""
echo "=============================================================="
echo " SELESAI. Langkah di HP:"
echo " 1) Buka app KKA Mobile -> tarik ke bawah (pull to refresh)"
echo " 2) Tab Administrasi -> Master KKA -> harus load"
echo " 3) Kalau masih error, tutup & buka lagi app-nya"
echo " 4) Kalau masih 404 -> jalankan:"
echo "       find /www/wwwroot -name 'AuthApi.php'"
echo "    lalu kirim hasilnya ke developer."
echo "=============================================================="

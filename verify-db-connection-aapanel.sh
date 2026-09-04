#!/bin/bash
# =====================================================================
# DIAGNOSA KONEKSI DATABASE KKA - setelah percobaan rotasi
# Inspektorat Kabupaten Rokan Hilir
# ---------------------------------------------------------------------
# Menjawab 3 hal TANPA menampilkan password di layar:
#  1) Apakah password di .env SEKARANG cocok dengan MySQL? (web/API jalan?)
#  2) Apakah password di file kredensial (baru) cocok dengan MySQL?
#  3) Apakah password LAMA (backup) masih cocok dengan MySQL?
# =====================================================================

SITE=$(find /www/wwwroot -maxdepth 4 -name "SesiController.php" \
       -path "*/src/controllers/*" 2>/dev/null | head -1 \
       | sed 's|/src/controllers/SesiController.php||')
if [ -z "$SITE" ] || [ ! -f "$SITE/.env" ]; then
  echo "❌ Folder aplikasi / .env tidak ditemukan."
  exit 1
fi
ENV_FILE="$SITE/.env"
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_PASS=$(grep -E '^DB_PASS=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
echo "== Aplikasi : $SITE"
echo "== Database : $DB_NAME (user: $DB_USER)"

echo ""
echo "== [1] Password DI .env SEKARANG =="
if mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1; then
  echo "   ✅ COCOK - web & app seharusnya jalan"
else
  echo "   ❌ TIDAK COCOK - web/API sedang TIDAK bisa konek (layar error/gangguan)"
fi

echo ""
echo "== [2] Password BARU (file kredensial) =="
CRED=$(ls -t /www/backup-kka/kka-credentials-*.txt 2>/dev/null | head -1)
if [ -n "$CRED" ]; then
  echo "   File : $CRED"
  NEWP=$(grep '^DB_PASS:' "$CRED" | cut -d' ' -f2-)
  if mysql -u "$DB_USER" -p"$NEWP" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Password BARU COCOK dengan MySQL -> rotasi sebenarnya SUDAH berhasil"
  else
    echo "   ❌ Password BARU TIDAK cocok -> MySQL masih pakai password lama"
  fi
else
  echo "   (file kredensial tidak ditemukan)"
fi

echo ""
echo "== [3] Password LAMA (backup .env sebelum rotasi) =="
OLDBAK=$(ls -t /www/backup-kka/env-before-*.bak 2>/dev/null | head -1)
if [ -n "$OLDBAK" ]; then
  echo "   File : $OLDBAK"
  OLDP=$(grep -E '^DB_PASS=' "$OLDBAK" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
  if mysql -u "$DB_USER" -p"$OLDP" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1; then
    echo "   ✅ Password LAMA masih dipakai MySQL (inilah kondisi "Gagal")"
  else
    echo "   ❌ Password lama juga tidak cocok (aneh - butuh pengecekan manual)"
  fi
else
  echo "   (backup env-before tidak ditemukan)"
fi

echo ""
echo "=============================================================="
echo " LANGKAH SELANJUTNYA (pilih sesuai hasil di atas):"
echo ""
echo " HASIL [2]=✅ : Rotasi BERHASIL. Lanjut ganti password ADMIN web"
echo "                -> menu Profil -> Ganti Password."
echo ""
echo " HASIL [1]=❌ dan [2]=❌ tapi [3]=✅ :"
echo "   Ganti password user via aaPanel GUI (paling praktis):"
echo "   aaPanel -> Databases -> cari user '$DB_USER' ->"
echo "   tombol 'Change Password' -> tempel 'DB_PASS' dari:"
echo "   cat $CRED"
echo "   (JANGAN kirim isi file itu ke chat/WhatsApp!)"
echo "   Lalu jalankan ulang script ini -> harus [1] dan [2] ✅"
echo ""
echo " ATAU kalau mau kembali ke kondisi semula (rollback):"
echo "   cp -f $OLDBAK $ENV_FILE"
echo "   lalu jalankan ulang script ini -> harus [1] ✅"
echo "=============================================================="

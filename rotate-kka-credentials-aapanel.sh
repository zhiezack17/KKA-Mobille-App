#!/bin/bash
# =====================================================================
# ROTASI KREDENSIAL KKA v2 (perbaikan) - Terminal aaPanel
# Inspektorat Kabupaten Rokan Hilir
# ---------------------------------------------------------------------
# PERUBAHAN v1 -> v2:
#  * .env HANYA diperbarui bila password MySQL BERHASIL diganti
#    (v1 menimpa .env dulu sehingga web bisa putus koneksi)
#  * Mencoba lewat user aplikasi -> gagal? coba lewat ROOT aaPanel
#    (root password dibaca dari /www/server/panel/data/default.pl)
#  * Bila keduanya gagal -> beri panduan ganti password via GUI,
#    dan TIDAK menyentuh .env (web tetap aman).
# =====================================================================

SITE=$(find /www/wwwroot -maxdepth 4 -name "SesiController.php" \
       -path "*/src/controllers/*" 2>/dev/null | head -1 \
       | sed 's|/src/controllers/SesiController.php||')
if [ -z "$SITE" ] || [ ! -f "$SITE/.env" ]; then
  echo "ERROR: folder aplikasi / .env tidak ditemukan."
  exit 1
fi
ENV_FILE="$SITE/.env"
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_PASS=$(grep -E '^DB_PASS=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
BACKUP_DIR="/www/backup-kka"; mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
cp -f "$ENV_FILE" "$BACKUP_DIR/env-before-$STAMP.bak"
NEW_PASS=$(openssl rand -hex 24)
CRED_FILE="$BACKUP_DIR/kka-credentials-$STAMP.txt"
printf 'WAKTU : %s\nDB_NAME: %s\nDB_USER: %s\nDB_PASS: %s\n' "$STAMP" "$DB_NAME" "$DB_USER" "$NEW_PASS" > "$CRED_FILE"
chmod 600 "$CRED_FILE"
echo "Aplikasi : $SITE"
echo "Database : $DB_NAME (user: $DB_USER)"
echo "Kredensial baru: $CRED_FILE  (jangan dibagikan!)"

echo ""
echo "== [1/4] Coba ganti password sebagai user aplikasi =="
CHANGED=0
for HOST in "localhost" "127.0.0.1" "%"; do
  if mysql -u "$DB_USER" -p"$DB_PASS" -e \
     "ALTER USER '$DB_USER'@'$HOST' IDENTIFIED BY '$NEW_PASS';" 2>/dev/null; then
    echo "   ✅ Berhasil pada '$DB_USER'@'$HOST'"
    CHANGED=1; break
  fi
done
[ "$CHANGED" = "1" ] || echo "   ✗ gagal (izin user aplikasi terbatas)"

if [ "$CHANGED" = "0" ]; then
  echo ""
  echo "== [2/4] Coba sebagai ROOT aaPanel =="
  ROOT_PASS=$(cat /www/server/panel/data/default.pl 2>/dev/null)
  if [ -n "$ROOT_PASS" ]; then
    for HOST in "localhost" "127.0.0.1" "%"; do
      if mysql -u root -p"$ROOT_PASS" -e \
         "ALTER USER '$DB_USER'@'$HOST' IDENTIFIED BY '$NEW_PASS';" 2>/dev/null; then
        echo "   ✅ Berhasil lewat ROOT pada '$DB_USER'@'$HOST'"
        CHANGED=1; break
      fi
    done
    [ "$CHANGED" = "1" ] || echo "   ✗ root juga gagal/access denied"
  else
    echo "   (root password aaPanel tidak ditemukan di default.pl)"
  fi
fi

if [ "$CHANGED" = "1" ]; then
  echo ""
  echo "== [3/4] Password MySQL DIGANTI -> perbarui .env =="
  sed -i "s|^DB_PASS=.*|DB_PASS=$NEW_PASS|" "$ENV_FILE"
  echo "   ✅ .env diperbarui"
else
  echo ""
  echo "== [3/4] Password MySQL TIDAK berubah - .env TIDAK disentuh =="
  echo "   Web tetap aman (masih pakai password lama)."
fi

echo ""
echo "== [4/4] Verifikasi =="
if mysql -u "$DB_USER" -p"$NEW_PASS" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1; then
  echo "   ✅ Koneksi dengan password BARU: BERHASIL (rotasi selesai)"
else
  echo "   ✗ Koneksi dengan password BARU: GAGAL"
fi

[ -f "$SITE/koneksi.php" ] && mv -f "$SITE/koneksi.php" "$SITE/koneksi.php.disabled" 2>/dev/null || true

echo ""
echo "=============================================================="
echo " BILA GAGAL DI LANGKAH [2] (izin root juga tidak ada):"
echo "   Ganti password MANUAL via aaPanel GUI:"
echo "     aaPanel -> Databases -> user '$DB_USER' -> Change Password"
echo "     -> tempel 'DB_PASS' dari file kredensial di atas"
echo "   Lalu jalankan: bash verify-db-connection-aapanel.sh"
echo "=============================================================="

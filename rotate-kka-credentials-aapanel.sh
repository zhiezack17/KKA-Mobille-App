#!/bin/bash
# =====================================================================
# ROTASI KREDENSIAL KKA (password database) - Terminal aaPanel
# Inspektorat Kabupaten Rokan Hilir
# ---------------------------------------------------------------------
# APA YANG DILAKUKAN (AMAN):
#  1) Generate password DB BARU (acak 48 karakter hex)
#  2) Ganti password user MySQL (host localhost, 127.0.0.1, atau %)
#  3) Update DB_PASS di file .env aplikasi
#  4) Backup kredensial lama + simpan kredensial baru ke file privat
#  5) Verifikasi koneksi database
# PASSWORD BARU TIDAK DITAMPILKAN di layar - hanya disimpan di file
# /www/backup-kka/kka-credentials-<stamp>.txt (chmod 600).
# JANGAN kirim file itu ke chat/email/WhatsApp.
# =====================================================================

# ------------------- [1] CARI APLIKASI KKA -------------------
SITE=$(find /www/wwwroot -maxdepth 4 -name "SesiController.php" \
       -path "*/src/controllers/*" 2>/dev/null | head -1 \
       | sed 's|/src/controllers/SesiController.php||')
if [ -z "$SITE" ] || [ ! -d "$SITE" ]; then
  echo "ERROR: folder aplikasi KKA tidak ditemukan di /www/wwwroot."
  exit 1
fi
ENV_FILE="$SITE/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE tidak ada."
  exit 1
fi
echo "==> [1/6] Aplikasi: $SITE"

# ------------------- [2] BACA KREDENSIAL LAMA -------------------
DB_NAME=$(grep -E '^DB_NAME=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_USER=$(grep -E '^DB_USER=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
DB_PASS=$(grep -E '^DB_PASS=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASS" ]; then
  echo "ERROR: DB_NAME/DB_USER/DB_PASS tidak lengkap di .env."
  exit 1
fi
echo "==> [2/6] Database: $DB_NAME (user: $DB_USER)"

# ------------------- [3] BACKUP + GENERATE PASSWORD BARU -------------------
BACKUP_DIR="/www/backup-kka"
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
cp -f "$ENV_FILE" "$BACKUP_DIR/env-before-$STAMP.bak"
NEW_PASS=$(openssl rand -hex 24)   # 48 karakter, aman untuk MySQL & .env
echo "==> [3/6] Password baru dibuat (tersimpan di file privat)"

# ------------------- [4] GANTI PASSWORD USER MYSQL -------------------
# Coba beberapa host umum; user bisa mengganti password dirinya sendiri.
CHANGED=0
for HOST in localhost 127.0.0.1 "%"; do
  if mysql -u "$DB_USER" -p"$DB_PASS" -e \
     "ALTER USER '$DB_USER'@'$HOST' IDENTIFIED BY '$NEW_PASS';" 2>/dev/null; then
    echo "==> [4/6] Password user '$DB_USER'@'$HOST' berhasil diganti"
    CHANGED=1
    break
  fi
done
if [ "$CHANGED" = "0" ]; then
  echo "==> [4/6] TIDAK bisa ganti password lewat CLI (kemungkinan hak akses)."
  echo "        Ganti manual: aaPanel -> Databases -> MySQL -> user $DB_USER"
  echo "        -> Change Password -> tempel password baru dari file:"
  echo "        $BACKUP_DIR/kka-credentials-$STAMP.txt"
  echo "        Lalu lanjutkan ke langkah [5]."
fi

# ------------------- [5] UPDATE .env -------------------
if command -v python3 >/dev/null 2>&1; then
  python3 - "$ENV_FILE" "$NEW_PASS" <<'EOF'
import sys
path, new = sys.argv[1], sys.argv[2]
lines = open(path, encoding='utf-8').read().splitlines()
out = []
for line in lines:
    if line.startswith('DB_PASS='):
        out.append('DB_PASS=' + new)
    else:
        out.append(line)
open(path, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
EOF
else
  sed -i "s|^DB_PASS=.*|DB_PASS=$NEW_PASS|" "$ENV_FILE"
fi
echo "==> [5/6] DB_PASS di .env diperbarui"

# ------------------- [6] SIMPAN + VERIFIKASI -------------------
CRED_FILE="$BACKUP_DIR/kka-credentials-$STAMP.txt"
printf 'WAKTU : %s\nDB_NAME: %s\nDB_USER: %s\nDB_PASS: %s\n' "$STAMP" "$DB_NAME" "$DB_USER" "$NEW_PASS" > "$CRED_FILE"
chmod 600 "$CRED_FILE"
echo "==> [6/6] Kredensial baru disimpan di:"
echo "        $CRED_FILE   (baca: cat $CRED_FILE  - JANGAN bagikan!)"

# Verifikasi koneksi dengan password baru
if mysql -u "$DB_USER" -p"$NEW_PASS" "$DB_NAME" -e "SELECT 1;" >/dev/null 2>&1; then
  echo "        ✔ Koneksi database dengan password BARU: BERHASIL"
else
  echo "        ✗ Koneksi baru gagal -> periksa host user di phpMyAdmin"
fi

# Nonaktifkan file koneksi.php (hardcode kredensial) di server
if [ -f "$SITE/koneksi.php" ]; then
  mv -f "$SITE/koneksi.php" "$SITE/koneksi.php.disabled" 2>/dev/null || true
  echo "        → koneksi.php dinonaktifkan (dipindah ke koneksi.php.disabled)"
fi

echo ""
echo "=============================================================="
echo " SELESAI. LANGKAH BERIKUTNYA (WAJIB):"
echo " 1) Buka web KKA -> Profil -> Ganti Password ADMIN (password"
echo "    baru, jangan pakai yang lama)."
echo " 2) Cek web KKA & aplikasi HP tetap jalan (login ulang bila perlu)."
echo " 3) Simpan file $CRED_FILE di tempat aman"
echo "    (mis. password manager / catatan pribadi, BUKAN di chat)."
echo "=============================================================="

#!/bin/bash
# =====================================================================
# PREPARE BRAND KKA MOBILE - icon APK / splash / favicon
# ---------------------------------------------------------------------
# Input : mobile/assets/logo-inspektorat.png  (logo resmi, PNG transparan)
# Output: semua aset brand mobile (icon, adaptive, favicon, splash)
# Alat  : ImageMagick (convert) - sudah terpasang di aaPanel & bisa
#         dipasang via: sudo apt install -y imagemagick
# Aman  : idempotent, bisa dijalankan berulang.
# =====================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS="$SCRIPT_DIR/../assets"
LOGO_IN="$ASSETS/logo-inspektorat.png"

if [ ! -f "$LOGO_IN" ]; then
  echo "ERROR: $LOGO_IN tidak ditemukan."
  echo "Letakkan file logo resmi di sana (PNG transparan), lalu jalankan lagi."
  exit 1
fi

WORK="/tmp/kka-brand"; rm -rf "$WORK"; mkdir -p "$WORK"

# ---- 1. Logo persegi terpusat (trim tepi transparan) -----------------------
convert "$LOGO_IN" -trim +repage -resize 512x512 -background none \
        -gravity center -extent 512x512 "$WORK/logo-512.png"
cp "$WORK/logo-512.png" "$ASSETS/logo-512.png"

# ---- 2. Icon utama 1024px: latar gradien hijau + logo 78% ------------------
convert -size 1024x1024 gradient:'#065F46-#022C22' \
        \( "$WORK/logo-512.png" -resize 800x800 \) \
        -gravity center -composite "$ASSETS/icon.png"

# ---- 3. Adaptive icon foreground (zona aman Android = 66%) ----------------
convert -size 1024x1024 xc:none \
        \( "$WORK/logo-512.png" -resize 580x580 \) \
        -gravity center -composite "$ASSETS/android-icon-foreground.png"

# ---- 4. Adaptive icon background ------------------------------------------
convert -size 1024x1024 xc:'#064E3B' "$ASSETS/android-icon-background.png"

# ---- 5. Monochrome icon (siluet putih) -------------------------------------
convert "$WORK/logo-512.png" -alpha extract -threshold 20% -transparent black \
        -resize 1024x1024 -background none -gravity center -extent 1024x1024 \
        "$ASSETS/android-icon-monochrome.png"

# ---- 6. Favicon web 64px ----------------------------------------------------
convert -size 64x64 xc:'#064E3B' \
        \( "$WORK/logo-512.png" -resize 52x52 \) \
        -gravity center -composite "$ASSETS/favicon.png"

# ---- 7. Splash icon (siap dipakai konfigurasi splash) ----------------------
convert "$WORK/logo-512.png" -resize 512x512 -background none \
        -gravity center -extent 512x512 "$ASSETS/splash-icon.png"

echo ""
echo "✅ Brand assets selesai dibuat:"
for f in icon.png android-icon-foreground.png android-icon-background.png \
         android-icon-monochrome.png favicon.png splash-icon.png logo-512.png; do
  identify -format "   %f  %wx%h  %b\n" "$ASSETS/$f" 2>/dev/null \
    || echo "   $f  (gagal dibaca)"
done
echo ""
echo "Jangan lupa: app.json -> android.adaptiveIcon.backgroundColor = #064E3B"
echo "Selesai. Jalankan ulang kapan pun dengan logo baru."

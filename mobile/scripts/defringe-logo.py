#!/usr/bin/env python3
"""Defringe logo: bersihkan halo putih di tepi luar PNG transparan.

Masalah: file logo punya tepi anti-aliased terhadap latar putih, dan
sebagian piksel tepi justru OPAK (alpha=255) dengan RGB hampir putih,
sehingga manipulasi alpha biasa tidak menghilangkannya.

Solusi:
  1. Buat mask area logo (alpha > 0).
  2. Erode mask beberapa piksel -> "inti"; selisih mask - inti = pita tepi.
  3. Di pita tepi, piksel yang sangat terang (semua channel > threshold)
     dianggap fringe -> dibuat transparan.
  4. Haluskan tepi baru dengan blur tipis pada alpha.

Dependensi: Pillow + numpy (pip install pillow numpy).
"""
import sys

import numpy as np
from PIL import Image, ImageFilter


def defringe(src, dst, erode_px=2, bright=185, feather=1.2):
    im = Image.open(src).convert("RGBA")
    mask = im.split()[3].point(lambda a: 255 if a > 20 else 0)
    inner = mask.filter(ImageFilter.MinFilter(erode_px * 2 + 1))
    band = np.clip(
        np.array(mask, dtype=np.int16) - np.array(inner, dtype=np.int16), 0, 255
    ).astype("uint8")

    arr = np.array(im)
    band_arr = band > 0
    bright_arr = (arr[:, :, 0] > bright) & (arr[:, :, 1] > bright) & (arr[:, :, 2] > bright)
    arr[:, :, 3][band_arr & bright_arr] = 0

    out = Image.fromarray(arr, "RGBA")
    if feather:
        out.putalpha(out.split()[3].filter(ImageFilter.GaussianBlur(feather)))
    out.save(dst)
    print(f"OK defringe: {dst} ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "logo.png"
    dst = sys.argv[2] if len(sys.argv) > 2 else "logo-defringed.png"
    defringe(src, dst)

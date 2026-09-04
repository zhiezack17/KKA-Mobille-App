/**
 * Base URL REST API KKA — DIKUNCI ke server produksi.
 * Tidak bisa diubah dari aplikasi (pengaturan server di Login/Profil
 * sudah dihapus) supaya APK selalu terhubung ke server resmi.
 */
export const DEFAULT_API_URL = 'https://kka.arsipdigital-inspektorat.com/api';

let cached: string | null = null;

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export async function loadApiUrl(): Promise<string> {
  cached = normalize(DEFAULT_API_URL);
  return cached;
}

export async function setApiUrl(url: string): Promise<string> {
  // Diterima untuk kompatibilitas, tapi selalu dipaksa ke server produksi.
  cached = normalize(DEFAULT_API_URL);
  return cached;
}

export function getApiUrl(): string {
  return cached ?? DEFAULT_API_URL;
}

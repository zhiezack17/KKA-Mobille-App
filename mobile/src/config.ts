import * as SecureStore from 'expo-secure-store';

/**
 * Base URL REST API KKA (sinkron dengan server live).
 * Bisa diganti dari layar Login / Profil, tersimpan aman di perangkat.
 */
export const DEFAULT_API_URL = 'https://kka.arsipdigital-inspektorat.com/api';

const KEY = 'kka_api_url_v1';

let cached: string | null = null;

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export async function loadApiUrl(): Promise<string> {
  if (cached) return cached;
  try {
    const saved = await SecureStore.getItemAsync(KEY);
    cached = normalize(saved || DEFAULT_API_URL) || DEFAULT_API_URL;
  } catch {
    cached = DEFAULT_API_URL;
  }
  return cached;
}

export async function setApiUrl(url: string): Promise<string> {
  cached = normalize(url) || DEFAULT_API_URL;
  try {
    await SecureStore.setItemAsync(KEY, cached);
  } catch {
    // tetap pakai nilai di memori bila storage gagal
  }
  return cached;
}

export function getApiUrl(): string {
  return cached ?? DEFAULT_API_URL;
}

import { api } from './client';
import type {
  ApiUser,
  Bidang,
  DashboardData,
  Desa,
  Kecamatan,
  Lampiran,
  LoginResult,
  Pagination,
  RekapData,
  Rincian,
  RincianPayload,
  Sesi,
  SesiDetail,
  SesiListResponse,
  SesiPayload,
  SubBidang,
} from '../types';

function qs(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? '?' + parts.join('&') : '';
}

export const AuthApi = {
  login: (email: string, password: string, deviceName = 'KKA Mobile') =>
    api<LoginResult>('/auth/login', { method: 'POST', json: { email, password, device_name: deviceName } }),
  logout: () => api<null>('/auth/logout', { method: 'POST' }),
  me: () => api<ApiUser>('/auth/me'),
};

export const MasterApi = {
  kecamatan: () => api<Kecamatan[]>('/kecamatan'),
  desa: (kecamatan_id?: number, q?: string) =>
    api<Desa[]>('/desa' + qs({ kecamatan_id, q })),
  bidang: () => api<Bidang[]>('/bidang'),
  subBidang: (bidangId: number) => api<SubBidang[]>(`/bidang/${bidangId}/sub-bidang`),
};

export const SesiApi = {
  list: (params: { q?: string; tahun?: number; page?: number; per_page?: number } = {}) =>
    api<SesiListResponse>('/sesi' + qs(params)),
  detail: (id: number) => api<SesiDetail>(`/sesi/${id}`),
  create: (payload: SesiPayload) => api<{ id: number }>('/sesi', { method: 'POST', json: payload }),
  update: (id: number, payload: SesiPayload) => api<{ id: number }>(`/sesi/${id}`, { method: 'PUT', json: payload }),
  remove: (id: number) => api<null>(`/sesi/${id}`, { method: 'DELETE' }),
};

export const RincianApi = {
  list: (sesiId: number) => api<Rincian[]>(`/sesi/${sesiId}/rincian`),
  create: (sesiId: number, payload: RincianPayload) =>
    api<{ id: number }>(`/sesi/${sesiId}/rincian`, { method: 'POST', json: payload }),
  update: (id: number, payload: RincianPayload) =>
    api<null>(`/rincian/${id}`, { method: 'PUT', json: payload }),
  remove: (id: number) => api<null>(`/rincian/${id}`, { method: 'DELETE' }),
};

export const LampiranApi = {
  list: (sesiId: number) => api<Lampiran[]>(`/sesi/${sesiId}/lampiran`),
  upload: (sesiId: number, file: { uri: string; name: string; type: string }, keterangan?: string) => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'application/octet-stream',
    } as unknown as Blob);
    form.append('keterangan', keterangan ?? '');
    return api<Lampiran>(`/sesi/${sesiId}/lampiran`, { method: 'POST', formData: form });
  },
  remove: (id: number) => api<null>(`/lampiran/${id}`, { method: 'DELETE' }),
};

export const RekapApi = {
  get: (tahun?: number) => api<RekapData>('/rekap' + qs({ tahun })),
};

export const DashboardApi = {
  get: () => api<DashboardData>('/dashboard'),
};

export const UserApi = {
  profile: () => api<ApiUser>('/profile'),
  updateProfile: (payload: { nama: string; nip?: string; jabatan?: string }) =>
    api<ApiUser>('/profile', { method: 'PUT', json: payload }),
  changePassword: (old_password: string, new_password: string) =>
    api<null>('/profile/password', { method: 'PUT', json: { old_password, new_password } }),
};



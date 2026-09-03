import { api } from './client';
import type {
  ApiUser,
  Bidang,
  DashboardData,
  Desa,
  Kecamatan,
  Lampiran,
  LoginResult,
  MasterFoto,
  MasterKka,
  MasterKkaDetail,
  MasterPayload,
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
  createKecamatan: (nama: string) => api<{ id: number }>('/kecamatan', { method: 'POST', json: { nama } }),
  updateKecamatan: (id: number, nama: string) =>
    api<null>(`/kecamatan/${id}`, { method: 'PUT', json: { nama } }),
  removeKecamatan: (id: number) => api<null>(`/kecamatan/${id}`, { method: 'DELETE' }),
  desa: (kecamatan_id?: number, q?: string) =>
    api<Desa[]>('/desa' + qs({ kecamatan_id, q })),
  createDesa: (kecamatan_id: number, nama: string) =>
    api<{ id: number }>('/desa', { method: 'POST', json: { kecamatan_id, nama } }),
  updateDesa: (id: number, kecamatan_id: number, nama: string) =>
    api<null>(`/desa/${id}`, { method: 'PUT', json: { kecamatan_id, nama } }),
  removeDesa: (id: number) => api<null>(`/desa/${id}`, { method: 'DELETE' }),
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
  get: (params: { tahun?: number; kecamatan_id?: number; bidang_id?: number; sub_bidang_id?: number } = {}) =>
    api<RekapData>('/rekap' + qs(params)),
};

export const DashboardApi = {
  get: () => api<DashboardData>('/dashboard'),
};

export const UserApi = {
  list: () => api<ApiUser[]>('/users'),
  create: (payload: {
    nama: string;
    email: string;
    password: string;
    role?: string;
    nip?: string;
    jabatan?: string;
  }) => api<{ id: number }>('/users', { method: 'POST', json: payload }),
  update: (
    id: number,
    payload: {
      nama?: string;
      role?: string;
      nip?: string;
      jabatan?: string;
      is_active?: number;
      password?: string;
    }
  ) => api<null>(`/users/${id}`, { method: 'PUT', json: payload }),
  remove: (id: number) => api<null>(`/users/${id}`, { method: 'DELETE' }),
  profile: () => api<ApiUser>('/profile'),
  updateProfile: (payload: { nama: string; nip?: string; jabatan?: string }) =>
    api<ApiUser>('/profile', { method: 'PUT', json: payload }),
  changePassword: (old_password: string, new_password: string) =>
    api<null>('/profile/password', { method: 'PUT', json: { old_password, new_password } }),
};

export const MasterKkaApi = {
  list: (params: { tipe?: string; sesi_id?: number; q?: string } = {}) =>
    api<MasterKka[]>('/master' + qs(params)),
  detail: (id: number) => api<MasterKkaDetail>(`/master/${id}`),
  create: (payload: MasterPayload) => api<{ id: number }>('/master', { method: 'POST', json: payload }),
  update: (id: number, payload: Partial<MasterPayload>) =>
    api<null>(`/master/${id}`, { method: 'PUT', json: payload }),
  remove: (id: number) => api<null>(`/master/${id}`, { method: 'DELETE' }),
  uploadFoto: (id: number, file: { uri: string; name: string; type: string }, keterangan?: string) => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type || 'image/jpeg',
    } as unknown as Blob);
    form.append('keterangan', keterangan ?? '');
    return api<MasterFoto>(`/master/${id}/foto`, { method: 'POST', formData: form });
  },
  removeFoto: (masterId: number, fotoId: number) =>
    api<null>(`/master/${masterId}/foto/${fotoId}`, { method: 'DELETE' }),
};



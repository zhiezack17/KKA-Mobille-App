export type Role = 'admin' | 'auditor';

export interface ApiUser {
  id: number;
  nama: string;
  email: string;
  role: Role;
  nip?: string | null;
  jabatan?: string | null;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LoginResult {
  token: string;
  user: ApiUser;
  expires_at?: string | null;
}

export interface Kecamatan {
  id: number;
  nama: string;
}

export interface Desa {
  id: number;
  nama: string;
  kecamatan_id?: number;
  kecamatan?: string;
}

export interface Bidang {
  id: number;
  nama: string;
  urutan?: number;
}

export interface SubBidang {
  id: number;
  nama: string;
}

export interface Sesi {
  id: number;
  desa_id: number;
  desa?: string;
  desa_nama?: string;
  kecamatan?: string;
  kecamatan_nama?: string;
  bidang_id: number;
  bidang?: string;
  bidang_nama?: string;
  sub_bidang_id?: number | null;
  sub_bidang?: string | null;
  sub_bidang_nama?: string | null;
  objek_audit: string;
  kegiatan?: string | null;
  semester?: number;
  tahun_anggaran: number;
  no_kka?: string | null;
  ref_kka?: string | null;
  pagu_anggaran?: number | string | null;
  tanggal_dibuat?: string | null;
  dibuat_oleh?: string | null;
  tanggal_review?: string | null;
  direview_oleh?: string | null;
  tanggal_evaluasi?: string | null;
  dievaluasi_oleh?: string | null;
  kesimpulan?: string | null;
  sumber_data?: string | null;
  creator_nama?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
  jumlah_rincian?: number;
  jumlah_lampiran?: number;
}

export interface Rincian {
  id: number;
  sesi_id?: number;
  urutan?: number;
  uraian: string;
  pagu_anggaran?: number | string | null;
  biaya_dikwitansi?: number | string | null;
  realisasi?: number | string | null;
  penerima?: string | null;
  keterangan?: string | null;
}

export interface Lampiran {
  id: number;
  nama_asli: string;
  nama_file: string;
  mime_type: string;
  ukuran: number;
  keterangan?: string | null;
  created_at?: string;
  uploader_nama?: string | null;
  file_url?: string;
  ukuran_formatted?: string;
}

export interface Totals {
  pagu: number;
  dikwitansi: number;
  realisasi: number;
  selisih: number;
  persentase_realisasi: number;
}

export interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface SesiListResponse {
  data: Sesi[];
  pagination: Pagination;
}

export interface DashboardStats {
  total_desa: number;
  total_kecamatan: number;
  total_sesi: number;
  sesi_tahun_ini: number;
  total_anggaran: number;
  total_dikwitansi: number;
  total_realisasi: number;
  selisih: number;
  persentase_realisasi: number;
}

export interface PerDesa {
  id: number;
  desa: string;
  kecamatan: string;
  jumlah_sesi: number;
  pagu: number;
  dikwitansi: number;
  realisasi: number;
  tahun_terakhir?: number;
  selisih: number;
  persentase_realisasi: number;
}

export interface PerBidang {
  id: number;
  bidang: string;
  urutan?: number;
  jumlah_sesi: number;
  pagu: number;
  dikwitansi: number;
  realisasi: number;
  selisih: number;
  persentase_realisasi: number;
}

export interface RekapRingkasan {
  total_desa: number;
  total_sesi: number;
  total_pagu: number;
  total_dikwitansi: number;
  total_realisasi: number;
  selisih: number;
  persentase_realisasi: number;
}

export interface DashboardData {
  stats: DashboardStats;
  per_desa: PerDesa[];
  per_bidang: PerBidang[];
  recent_sesi: Sesi[];
}

export interface PerGrup {
  sub_bidang: string;
  kecamatan: string;
  tahun: number;
  jumlah_sesi: number;
  pagu: number;
  dikwitansi: number;
  realisasi: number;
  selisih: number;
  persentase_realisasi: number;
}

export interface RekapData {
  tahun: number;
  ringkasan: RekapRingkasan;
  per_desa: PerDesa[];
  per_bidang: PerBidang[];
  per_grup: PerGrup[];
}

export interface SesiDetail {
  sesi: Sesi;
  rincian: Rincian[];
  lampiran: Lampiran[];
  shared_with: ApiUser[];
  totals: Totals;
}

export interface SesiPayload {
  desa_id: number;
  bidang_id: number;
  sub_bidang_id?: number | null;
  objek_audit: string;
  kegiatan?: string | null;
  pagu_anggaran?: number;
  semester?: number;
  tahun_anggaran: number;
  no_kka?: string | null;
  ref_kka?: string | null;
  dibuat_oleh?: string | null;
  tanggal_dibuat?: string | null;
  direview_oleh?: string | null;
  tanggal_review?: string | null;
  dievaluasi_oleh?: string | null;
  tanggal_evaluasi?: string | null;
  kesimpulan?: string | null;
  sumber_data?: string | null;
}

export interface RincianPayload {
  urutan?: number;
  uraian: string;
  pagu_anggaran?: number;
  biaya_dikwitansi?: number;
  realisasi?: number;
  penerima?: string | null;
  keterangan?: string | null;
}

/* ------------------------------ Master KKA ------------------------------ */

export type MasterKkaTipe = 'standar' | 'fisik' | 'sketsa';

export interface MasterFisikRow {
  id?: number;
  sta?: string | null;
  jarak?: number | string | null;
  lebar1?: number | string | null;
  lebar2?: number | string | null;
  tebal?: number | string | null;
  volume?: number | string | null;
  keterangan?: string | null;
  urutan?: number;
}

export interface MasterFoto {
  id: number;
  master_id?: number;
  nama_file: string;
  nama_asli?: string | null;
  mime_type?: string | null;
  ukuran?: number;
  keterangan?: string | null;
  created_at?: string;
  file_url?: string;
}

export interface MasterKka {
  id: number;
  tipe: MasterKkaTipe;
  judul: string;
  narasi?: string | null;
  sesi_id: number;
  sesi?: Sesi | null;
  objek_audit?: string;
  desa?: string;
  kecamatan?: string;
  bidang?: string;
  jumlah_fisik?: number;
  jumlah_foto?: number;
  created_at?: string;
  created_by?: number | null;
}

export interface MasterKkaDetail extends Omit<MasterKka, 'sesi'> {
  fisik: MasterFisikRow[];
  foto: MasterFoto[];
  sesi: {
    id: number;
    objek_audit?: string;
    no_kka?: string | null;
    tahun_anggaran?: number;
  } | null;
}

export interface MasterPayload {
  sesi_id: number;
  tipe: MasterKkaTipe;
  judul: string;
  narasi?: string | null;
  fisik?: MasterFisikRow[];
}

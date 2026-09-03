const BULAN = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function toNum(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function fmtIDR(v: unknown): string {
  return 'Rp ' + Math.round(toNum(v)).toLocaleString('id-ID');
}

export function fmtRupiahShort(v: unknown): string {
  const n = toNum(v);
  if (Math.abs(n) >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(2).replace('.', ',') + ' M';
  if (Math.abs(n) >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1).replace('.', ',') + ' jt';
  if (Math.abs(n) >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + ' rb';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

export function fmtNum(v: unknown): string {
  return Math.round(toNum(v)).toLocaleString('id-ID');
}

export function fmtPercent(v: unknown): string {
  return toNum(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + '%';
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(s?: string | null): string {
  if (!s) return '-';
  const d = parseDate(s);
  if (!d) return s;
  return `${d.getDate()} ${BULAN[d.getMonth() + 1]} ${d.getFullYear()}`;
}

export function fmtDateTime(s?: string | null): string {
  if (!s) return '-';
  const d = parseDate(s);
  if (!d) return s;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${BULAN[d.getMonth() + 1]} ${d.getFullYear()} ${hh}:${mm}`;
}

export function fmtDayName(s?: string | null): string {
  if (!s) return '';
  const d = parseDate(s);
  if (!d) return '';
  return HARI[d.getDay()];
}

export function fmtBytes(n: unknown): string {
  const v = toNum(n);
  if (v < 1024) return `${Math.round(v)} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

export function todayInput(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

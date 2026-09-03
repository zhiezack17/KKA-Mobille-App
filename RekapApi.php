<?php
declare(strict_types=1);

global $apiAuth, $method, $subRes1;

$user = $apiAuth->require();
$input = api_input();

[$ow, $op] = api_owner_where($apiAuth);

if ($method !== 'GET') {
    api_response(405, false, 'Method harus GET');
}

$tahun        = (int)($input['tahun'] ?? 0);
$kecamatanId  = (int)($input['kecamatan_id'] ?? 0);
$bidangId     = (int)($input['bidang_id'] ?? 0);
$subBidangId  = (int)($input['sub_bidang_id'] ?? 0);

// Filter sesi yang sama dipakai oleh semua agregasi. Penting:
// agregasi dilakukan pada SUBQUERY per-sesi, BUKAN join langsung ke rincian,
// supaya COUNT/SUM sesi tidak berlipat karena banyaknya baris rincian.
$filters = '1=1'; $fp = [];
if ($tahun > 0)       { $filters .= ' AND s.tahun_anggaran = ?'; $fp[] = $tahun; }
if ($kecamatanId > 0) { $filters .= ' AND d.kecamatan_id = ?';   $fp[] = $kecamatanId; }
if ($bidangId > 0)    { $filters .= ' AND s.bidang_id = ?';      $fp[] = $bidangId; }
if ($subBidangId > 0) { $filters .= ' AND s.sub_bidang_id = ?';  $fp[] = $subBidangId; }

$params = array_merge($fp, $op);

// Subquery: satu baris per sesi audit + total rinciannya
$sesiAgg = "
    SELECT s.id, s.desa_id, s.bidang_id, s.sub_bidang_id,
           s.pagu_anggaran, s.tahun_anggaran, s.created_by,
           COALESCE(SUM(r.biaya_dikwitansi), 0) AS dikwitansi,
           COALESCE(SUM(r.realisasi), 0)        AS realisasi
    FROM kka_sesi s
    LEFT JOIN kka_rincian r ON r.sesi_id = s.id
    WHERE $filters $ow
    GROUP BY s.id, s.desa_id, s.bidang_id, s.sub_bidang_id,
             s.pagu_anggaran, s.tahun_anggaran, s.created_by
";

$perDesa = DB::all("
    SELECT d.id, d.nama AS desa, k.nama AS kecamatan,
           COUNT(s.id)                          AS jumlah_sesi,
           COALESCE(SUM(s.pagu_anggaran), 0)    AS pagu,
           COALESCE(SUM(s.dikwitansi), 0)       AS dikwitansi,
           COALESCE(SUM(s.realisasi), 0)        AS realisasi,
           MAX(s.tahun_anggaran)                AS tahun_terakhir
    FROM kka_desa d
    JOIN kka_kecamatan k ON k.id = d.kecamatan_id
    JOIN ($sesiAgg) s ON s.desa_id = d.id
    GROUP BY d.id, d.nama, k.nama
    ORDER BY jumlah_sesi DESC, d.nama ASC
", $params);

foreach ($perDesa as &$row) {
    $row['selisih'] = $row['dikwitansi'] - $row['realisasi'];
    $row['persentase_realisasi'] = $row['dikwitansi'] > 0
        ? round(($row['realisasi'] / $row['dikwitansi']) * 100, 2) : 0;
}
unset($row);

$perBidang = DB::all("
    SELECT b.id, b.nama AS bidang, b.urutan,
           COUNT(s.id)                          AS jumlah_sesi,
           COALESCE(SUM(s.pagu_anggaran), 0)    AS pagu,
           COALESCE(SUM(s.dikwitansi), 0)       AS dikwitansi,
           COALESCE(SUM(s.realisasi), 0)        AS realisasi
    FROM kka_bidang b
    LEFT JOIN ($sesiAgg) s ON s.bidang_id = b.id
    GROUP BY b.id, b.nama, b.urutan
    ORDER BY b.urutan
", $params);

foreach ($perBidang as &$row) {
    $row['selisih'] = $row['dikwitansi'] - $row['realisasi'];
    $row['persentase_realisasi'] = $row['dikwitansi'] > 0
        ? round(($row['realisasi'] / $row['dikwitansi']) * 100, 2) : 0;
}
unset($row);

// Grup per Sub Bidang · Kecamatan · Tahun (menyusul tampilan web v13)
$perGrup = DB::all("
    SELECT COALESCE(sb.nama, 'Tanpa Sub Bidang') AS sub_bidang,
           k.nama AS kecamatan,
           s.tahun_anggaran AS tahun,
           COUNT(s.id)                          AS jumlah_sesi,
           COALESCE(SUM(s.pagu_anggaran), 0)    AS pagu,
           COALESCE(SUM(s.dikwitansi), 0)       AS dikwitansi,
           COALESCE(SUM(s.realisasi), 0)        AS realisasi
    FROM ($sesiAgg) s
    JOIN kka_desa d ON d.id = s.desa_id
    JOIN kka_kecamatan k ON k.id = d.kecamatan_id
    LEFT JOIN kka_sub_bidang sb ON sb.id = s.sub_bidang_id
    GROUP BY sb.id, sb.nama, k.id, k.nama, s.tahun_anggaran
    ORDER BY sb.nama, k.nama, s.tahun_anggaran
", $params);

foreach ($perGrup as &$row) {
    $row['selisih'] = $row['dikwitansi'] - $row['realisasi'];
    $row['persentase_realisasi'] = $row['dikwitansi'] > 0
        ? round(($row['realisasi'] / $row['dikwitansi']) * 100, 2) : 0;
}
unset($row);

$ringkasan = [
    'total_desa'       => count(array_unique(array_column($perDesa, 'id'))),
    'total_sesi'       => array_sum(array_column($perDesa, 'jumlah_sesi')),
    'total_pagu'       => array_sum(array_column($perDesa, 'pagu')),
    'total_dikwitansi' => array_sum(array_column($perDesa, 'dikwitansi')),
    'total_realisasi'  => array_sum(array_column($perDesa, 'realisasi')),
];
$ringkasan['selisih'] = $ringkasan['total_dikwitansi'] - $ringkasan['total_realisasi'];
$ringkasan['persentase_realisasi'] = $ringkasan['total_dikwitansi'] > 0
    ? round(($ringkasan['total_realisasi'] / $ringkasan['total_dikwitansi']) * 100, 2) : 0;

api_response(200, true, 'Data rekapitulasi', [
    'tahun'        => $tahun,
    'ringkasan'    => $ringkasan,
    'per_desa'     => $perDesa,
    'per_bidang'   => $perBidang,
    'per_grup'     => $perGrup,
]);

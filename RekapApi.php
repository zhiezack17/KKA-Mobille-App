<?php
declare(strict_types=1);

global $apiAuth, $method, $subRes1;

$user = $apiAuth->require();
$input = api_input();

[$ow, $op] = api_owner_where($apiAuth);

if ($method !== 'GET') {
    api_response(405, false, 'Method harus GET');
}

$tahun = (int)($input['tahun'] ?? 0);
$whereTahun = $tahun > 0 ? ' AND s.tahun_anggaran = ?' : '';
$pTahun = $tahun > 0 ? [$tahun] : [];

$perDesa = DB::all("
    SELECT d.id, d.nama AS desa, k.nama AS kecamatan,
           COUNT(s.id)                         AS jumlah_sesi,
           COALESCE(SUM(s.pagu_anggaran),0)    AS pagu,
           COALESCE(SUM(r.biaya_dikwitansi),0) AS dikwitansi,
           COALESCE(SUM(r.realisasi),0)        AS realisasi,
           MAX(s.tahun_anggaran)               AS tahun_terakhir
    FROM kka_desa d
    JOIN kka_kecamatan k ON k.id = d.kecamatan_id
    JOIN kka_sesi s ON s.desa_id = d.id
    LEFT JOIN kka_rincian r ON r.sesi_id = s.id
    WHERE 1=1 $ow $whereTahun
    GROUP BY d.id, d.nama, k.nama
    ORDER BY jumlah_sesi DESC, d.nama ASC
", array_merge($op, $pTahun));

foreach ($perDesa as &$row) {
    $row['selisih'] = $row['dikwitansi'] - $row['realisasi'];
    $row['persentase_realisasi'] = $row['dikwitansi'] > 0
        ? round(($row['realisasi'] / $row['dikwitansi']) * 100, 2) : 0;
}

$perBidang = DB::all("
    SELECT b.id, b.nama AS bidang, b.urutan,
           COUNT(s.id)                         AS jumlah_sesi,
           COALESCE(SUM(s.pagu_anggaran),0)    AS pagu,
           COALESCE(SUM(r.biaya_dikwitansi),0) AS dikwitansi,
           COALESCE(SUM(r.realisasi),0)        AS realisasi
    FROM kka_bidang b
    LEFT JOIN kka_sesi s ON s.bidang_id = b.id $ow $whereTahun
    LEFT JOIN kka_rincian r ON r.sesi_id = s.id
    GROUP BY b.id, b.nama, b.urutan
    ORDER BY b.urutan
", array_merge($op, $pTahun));

foreach ($perBidang as &$row) {
    $row['selisih'] = $row['dikwitansi'] - $row['realisasi'];
    $row['persentase_realisasi'] = $row['dikwitansi'] > 0
        ? round(($row['realisasi'] / $row['dikwitansi']) * 100, 2) : 0;
}

$ringkasan = [
    'total_desa'     => count(array_unique(array_column($perDesa, 'id'))),
    'total_sesi'     => array_sum(array_column($perDesa, 'jumlah_sesi')),
    'total_pagu'     => array_sum(array_column($perDesa, 'pagu')),
    'total_dikwitansi' => array_sum(array_column($perDesa, 'dikwitansi')),
    'total_realisasi'  => array_sum(array_column($perDesa, 'realisasi')),
];
$ringkasan['selisih'] = $ringkasan['total_dikwitansi'] - $ringkasan['total_realisasi'];
$ringkasan['persentase_realisasi'] = $ringkasan['total_dikwitansi'] > 0
    ? round(($ringkasan['total_realisasi'] / $ringkasan['total_dikwitansi']) * 100, 2) : 0;

api_response(200, true, 'Data rekapitulasi', [
    'tahun'      => $tahun,
    'ringkasan'  => $ringkasan,
    'per_desa'   => $perDesa,
    'per_bidang' => $perBidang,
]);

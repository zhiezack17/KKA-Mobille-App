<?php
declare(strict_types=1);

global $apiAuth, $method;

$user = $apiAuth->require();

if ($method !== 'GET') {
    api_response(405, false, 'Method tidak diizinkan');
}

[$ow, $op] = api_owner_where($apiAuth);

$stats = [
    'total_desa'     => (int)DB::scalar('SELECT COUNT(*) FROM kka_desa'),
    'total_kecamatan'=> (int)DB::scalar('SELECT COUNT(*) FROM kka_kecamatan'),
    'total_sesi'     => (int)DB::scalar("SELECT COUNT(*) FROM kka_sesi s WHERE 1=1 $ow", $op),
    'sesi_tahun_ini' => (int)DB::scalar(
        "SELECT COUNT(*) FROM kka_sesi s WHERE s.tahun_anggaran = ? $ow",
        array_merge([(int)date('Y')], $op)
    ),
    'total_anggaran' => (float)DB::scalar(
        "SELECT COALESCE(SUM(s.pagu_anggaran),0) FROM kka_sesi s WHERE 1=1 $ow", $op
    ),
    'total_dikwitansi' => (float)DB::scalar(
        "SELECT COALESCE(SUM(r.biaya_dikwitansi),0) FROM kka_rincian r
         JOIN kka_sesi s ON s.id = r.sesi_id WHERE 1=1 $ow", $op
    ),
    'total_realisasi' => (float)DB::scalar(
        "SELECT COALESCE(SUM(r.realisasi),0) FROM kka_rincian r
         JOIN kka_sesi s ON s.id = r.sesi_id WHERE 1=1 $ow", $op
    ),
];
$stats['selisih'] = $stats['total_dikwitansi'] - $stats['total_realisasi'];
$stats['persentase_realisasi'] = $stats['total_dikwitansi'] > 0
    ? round(($stats['total_realisasi'] / $stats['total_dikwitansi']) * 100, 2)
    : 0;

$perDesa = DB::all("
    SELECT d.id, d.nama AS desa, k.nama AS kecamatan,
           COUNT(s.id)                      AS jumlah_sesi,
           COALESCE(SUM(s.pagu_anggaran),0) AS pagu_total,
           MAX(s.tahun_anggaran)            AS tahun_terakhir
    FROM kka_desa d
    JOIN kka_kecamatan k ON k.id = d.kecamatan_id
    JOIN kka_sesi s ON s.desa_id = d.id
    WHERE 1=1 $ow
    GROUP BY d.id, d.nama, k.nama
    ORDER BY jumlah_sesi DESC, d.nama ASC
    LIMIT 10
", $op);

$perBidang = DB::all("
    SELECT b.id, b.nama AS bidang, b.urutan,
           COUNT(s.id) AS jumlah_sesi
    FROM kka_bidang b
    LEFT JOIN kka_sesi s ON s.bidang_id = b.id $ow
    GROUP BY b.id, b.nama, b.urutan
    ORDER BY b.urutan
", $op);

$recentSesi = DB::all("
    SELECT s.id, s.objek_audit, s.no_kka, s.tahun_anggaran, s.semester,
           s.created_at, s.tanggal_dibuat,
           d.nama AS desa, b.nama AS bidang
    FROM kka_sesi s
    JOIN kka_desa d ON d.id = s.desa_id
    JOIN kka_bidang b ON b.id = s.bidang_id
    WHERE 1=1 $ow
    ORDER BY s.created_at DESC
    LIMIT 5
", $op);

api_response(200, true, 'Data dashboard', [
    'stats'       => $stats,
    'per_desa'    => $perDesa,
    'per_bidang'  => $perBidang,
    'recent_sesi' => $recentSesi,
]);

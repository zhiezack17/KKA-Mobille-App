<?php
declare(strict_types=1);

global $apiAuth, $method, $subRes1, $subRes2, $subRes3;

$user = $apiAuth->require();
$input = api_input();

[$ow, $op] = api_owner_where($apiAuth);

if ($subRes1 === null && $method === 'GET') {
    $q      = trim((string)($input['q'] ?? ''));
    $tahun  = (int)($input['tahun'] ?? 0);
    $desaId = (int)($input['desa_id'] ?? 0);
    $bidId  = (int)($input['bidang_id'] ?? 0);
    $page   = max(1, (int)($input['page'] ?? 1));
    $perPage= min(100, max(5, (int)($input['per_page'] ?? 20)));

    $where = '1=1'; $p = [];
    if ($q !== '')   { $where .= ' AND (s.objek_audit LIKE ? OR s.no_kka LIKE ?)'; $p[] = "%$q%"; $p[] = "%$q%"; }
    if ($tahun > 0)  { $where .= ' AND s.tahun_anggaran = ?'; $p[] = $tahun; }
    if ($desaId > 0) { $where .= ' AND s.desa_id = ?'; $p[] = $desaId; }
    if ($bidId > 0)  { $where .= ' AND s.bidang_id = ?'; $p[] = $bidId; }
    $where .= $ow; $p = array_merge($p, $op);

    $total = (int)DB::scalar("SELECT COUNT(*) FROM kka_sesi s WHERE $where", $p);
    $offset = ($page - 1) * $perPage;

    $sesi = DB::all("
        SELECT s.id, s.objek_audit, s.kegiatan, s.semester, s.tahun_anggaran,
               s.no_kka, s.ref_kka, s.pagu_anggaran, s.tanggal_dibuat,
               s.dibuat_oleh, s.direview_oleh, s.dievaluasi_oleh,
               s.created_at, s.updated_at, s.created_by,
               d.id AS desa_id, d.nama AS desa, k.nama AS kecamatan,
               b.id AS bidang_id, b.nama AS bidang,
               sb.id AS sub_bidang_id, sb.nama AS sub_bidang,
               (SELECT COUNT(*) FROM kka_rincian r WHERE r.sesi_id = s.id) AS jumlah_rincian,
               (SELECT COUNT(*) FROM kka_lampiran l WHERE l.sesi_id = s.id) AS jumlah_lampiran
        FROM kka_sesi s
        JOIN kka_desa d ON d.id = s.desa_id
        JOIN kka_kecamatan k ON k.id = d.kecamatan_id
        JOIN kka_bidang b ON b.id = s.bidang_id
        LEFT JOIN kka_sub_bidang sb ON sb.id = s.sub_bidang_id
        WHERE $where
        ORDER BY s.created_at DESC
        LIMIT $perPage OFFSET $offset
    ", $p);

    api_response(200, true, 'Daftar sesi audit', [
        'data'      => $sesi,
        'pagination'=> [
            'page'      => $page,
            'per_page'  => $perPage,
            'total'     => $total,
            'total_pages' => ceil($total / $perPage),
        ],
    ]);
}

if ($subRes1 !== null && ctype_digit((string)$subRes1) && $subRes2 === null) {
    $id = (int)$subRes1;
    if ($method === 'GET') {
        $sesi = DB::one("
            SELECT s.*, d.nama AS desa_nama, k.nama AS kecamatan_nama,
                   b.nama AS bidang_nama, sb.nama AS sub_bidang_nama,
                   u.nama AS creator_nama
            FROM kka_sesi s
            JOIN kka_desa d ON d.id = s.desa_id
            JOIN kka_kecamatan k ON k.id = d.kecamatan_id
            JOIN kka_bidang b ON b.id = s.bidang_id
            LEFT JOIN kka_sub_bidang sb ON sb.id = s.sub_bidang_id
            LEFT JOIN kka_users u ON u.id = s.created_by
            WHERE s.id = ?
        ", [$id]);
        if (!$sesi || !api_sesi_is_owned($apiAuth, $sesi)) {
            api_response(403, false, 'Anda tidak memiliki akses ke sesi ini');
        }

        $rincian = DB::all('SELECT * FROM kka_rincian WHERE sesi_id = ? ORDER BY urutan, id', [$id]);
        $lampiran = DB::all("
            SELECT l.id, l.nama_asli, l.nama_file, l.mime_type, l.ukuran,
                   l.keterangan, l.created_at, u.nama AS uploader_nama
            FROM kka_lampiran l
            LEFT JOIN kka_users u ON u.id = l.uploaded_by
            WHERE l.sesi_id = ? ORDER BY l.created_at DESC
        ", [$id]);
        $sharedWith = DB::all("
            SELECT u.id, u.nama, u.jabatan
            FROM kka_sesi_share sh
            JOIN kka_users u ON u.id = sh.user_id
            WHERE sh.sesi_id = ? ORDER BY u.nama
        ", [$id]);

        $totals = [
            'pagu'       => (float)$sesi['pagu_anggaran'],
            'dikwitansi' => array_sum(array_column($rincian, 'biaya_dikwitansi')),
            'realisasi'  => array_sum(array_column($rincian, 'realisasi')),
        ];
        $totals['selisih'] = $totals['dikwitansi'] - $totals['realisasi'];
        $totals['persentase_realisasi'] = $totals['dikwitansi'] > 0
            ? round(($totals['realisasi'] / $totals['dikwitansi']) * 100, 2) : 0;

        api_response(200, true, 'Detail sesi audit', [
            'sesi'       => $sesi,
            'rincian'    => $rincian,
            'lampiran'   => $lampiran,
            'shared_with'=> $sharedWith,
            'totals'     => $totals,
        ]);
    }

    if ($method === 'PUT') {
        $sesi = DB::one('SELECT * FROM kka_sesi WHERE id = ?', [$id]);
        if (!$sesi) api_response(404, false, 'Sesi tidak ditemukan');
        if (!$apiAuth->isAdmin() && (int)$sesi['created_by'] !== (int)$apiAuth->id()) {
            $isShared = (bool)DB::scalar('SELECT 1 FROM kka_sesi_share WHERE sesi_id = ? AND user_id = ? LIMIT 1', [$id, $apiAuth->id()]);
            if (!$isShared) api_response(403, false, 'Akses ditolak');
        }

        $data = [
            'desa_id'          => (int)($input['desa_id'] ?? $sesi['desa_id']),
            'bidang_id'        => (int)($input['bidang_id'] ?? $sesi['bidang_id']),
            'sub_bidang_id'    => !empty($input['sub_bidang_id']) ? (int)$input['sub_bidang_id'] : null,
            'objek_audit'      => trim((string)($input['objek_audit'] ?? $sesi['objek_audit'])),
            'kegiatan'         => !empty($input['kegiatan']) ? trim((string)$input['kegiatan']) : null,
            'pagu_anggaran'    => parse_money($input['pagu_anggaran'] ?? $sesi['pagu_anggaran']),
            'semester'         => (int)($input['semester'] ?? $sesi['semester']),
            'tahun_anggaran'   => (int)($input['tahun_anggaran'] ?? $sesi['tahun_anggaran']),
            'no_kka'           => !empty($input['no_kka']) ? trim((string)$input['no_kka']) : null,
            'ref_kka'          => !empty($input['ref_kka']) ? trim((string)$input['ref_kka']) : null,
            'dibuat_oleh'      => !empty($input['dibuat_oleh']) ? trim((string)$input['dibuat_oleh']) : null,
            'tanggal_dibuat'   => !empty($input['tanggal_dibuat']) ? $input['tanggal_dibuat'] : null,
            'direview_oleh'    => !empty($input['direview_oleh']) ? trim((string)$input['direview_oleh']) : null,
            'tanggal_review'   => !empty($input['tanggal_review']) ? $input['tanggal_review'] : null,
            'dievaluasi_oleh'  => !empty($input['dievaluasi_oleh']) ? trim((string)$input['dievaluasi_oleh']) : null,
            'tanggal_evaluasi' => !empty($input['tanggal_evaluasi']) ? $input['tanggal_evaluasi'] : null,
            'kesimpulan'       => !empty($input['kesimpulan']) ? trim((string)$input['kesimpulan']) : null,
            'sumber_data'      => !empty($input['sumber_data']) ? trim((string)$input['sumber_data']) : null,
        ];
        if (!$data['desa_id'] || !$data['bidang_id'] || $data['objek_audit'] === '') {
            api_response(422, false, 'Desa, Bidang, dan Objek Audit wajib diisi');
        }
        DB::update('kka_sesi', $data, ['id' => $id]);

        if (isset($input['shared_users']) && is_array($input['shared_users'])) {
            DB::q('DELETE FROM kka_sesi_share WHERE sesi_id = ?', [$id]);
            $selfId = (int)$apiAuth->id();
            foreach (array_unique(array_filter(array_map('intval', $input['shared_users']))) as $uid) {
                if ($uid === $selfId) continue;
                $ok = DB::scalar("SELECT 1 FROM kka_users WHERE id = ? AND is_active = 1 AND role = 'auditor' LIMIT 1", [$uid]);
                if ($ok) DB::q('INSERT INTO kka_sesi_share (sesi_id, user_id) VALUES (?, ?)', [$id, $uid]);
            }
        }
        api_response(200, true, 'Sesi audit diperbarui', ['id' => $id]);
    }

    if ($method === 'DELETE') {
        $sesi = DB::one('SELECT * FROM kka_sesi WHERE id = ?', [$id]);
        if (!$sesi) api_response(404, false, 'Sesi tidak ditemukan');
        if (!$apiAuth->isAdmin() && (int)$sesi['created_by'] !== (int)$apiAuth->id()) {
            api_response(403, false, 'Hanya admin atau pembuat yang dapat menghapus');
        }
        $lamps = DB::all('SELECT nama_file FROM kka_lampiran WHERE sesi_id = ?', [$id]);
        foreach ($lamps as $l) {
            $p = $GLOBALS['cfg']['upload_dir'] . '/' . $l['nama_file'];
            if (is_file($p)) @unlink($p);
        }
        DB::delete('kka_sesi', ['id' => $id]);
        api_response(200, true, 'Sesi audit dihapus');
    }
}

if ($subRes1 === null && $method === 'POST') {
    $err = api_validate($input, [
        'desa_id'        => 'required|numeric',
        'bidang_id'      => 'required|numeric',
        'objek_audit'    => 'required',
        'tahun_anggaran' => 'required|numeric',
    ]);
    if ($err) api_response(422, false, $err);

    $data = [
        'desa_id'          => (int)$input['desa_id'],
        'bidang_id'        => (int)$input['bidang_id'],
        'sub_bidang_id'    => !empty($input['sub_bidang_id']) ? (int)$input['sub_bidang_id'] : null,
        'objek_audit'      => trim((string)$input['objek_audit']),
        'kegiatan'         => !empty($input['kegiatan']) ? trim((string)$input['kegiatan']) : null,
        'pagu_anggaran'    => parse_money($input['pagu_anggaran'] ?? 0),
        'semester'         => (int)($input['semester'] ?? 1),
        'tahun_anggaran'   => (int)$input['tahun_anggaran'],
        'no_kka'           => !empty($input['no_kka']) ? trim((string)$input['no_kka']) : null,
        'ref_kka'          => !empty($input['ref_kka']) ? trim((string)$input['ref_kka']) : null,
        'dibuat_oleh'      => !empty($input['dibuat_oleh']) ? trim((string)$input['dibuat_oleh']) : null,
        'tanggal_dibuat'   => !empty($input['tanggal_dibuat']) ? $input['tanggal_dibuat'] : null,
        'direview_oleh'    => !empty($input['direview_oleh']) ? trim((string)$input['direview_oleh']) : null,
        'tanggal_review'   => !empty($input['tanggal_review']) ? $input['tanggal_review'] : null,
        'dievaluasi_oleh'  => !empty($input['dievaluasi_oleh']) ? trim((string)$input['dievaluasi_oleh']) : null,
        'tanggal_evaluasi' => !empty($input['tanggal_evaluasi']) ? $input['tanggal_evaluasi'] : null,
        'kesimpulan'       => !empty($input['kesimpulan']) ? trim((string)$input['kesimpulan']) : null,
        'sumber_data'      => !empty($input['sumber_data']) ? trim((string)$input['sumber_data']) : null,
        'created_by'       => (int)$apiAuth->id(),
    ];
    $id = DB::insert('kka_sesi', $data);

    if (isset($input['shared_users']) && is_array($input['shared_users'])) {
        $selfId = (int)$apiAuth->id();
        foreach (array_unique(array_filter(array_map('intval', $input['shared_users']))) as $uid) {
            if ($uid === $selfId) continue;
            $ok = DB::scalar("SELECT 1 FROM kka_users WHERE id = ? AND is_active = 1 AND role = 'auditor' LIMIT 1", [$uid]);
            if ($ok) DB::q('INSERT INTO kka_sesi_share (sesi_id, user_id) VALUES (?, ?)', [$id, $uid]);
        }
    }
    api_response(201, true, 'Sesi audit dibuat', ['id' => $id]);
}

if (ctype_digit((string)$subRes1) && $subRes2 === 'rincian') {
    require __DIR__ . '/RincianApi.php';
    exit;
}

if (ctype_digit((string)$subRes1) && $subRes2 === 'lampiran') {
    require __DIR__ . '/LampiranApi.php';
    exit;
}

api_response(405, false, 'Method tidak diizinkan');

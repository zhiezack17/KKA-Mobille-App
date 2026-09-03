<?php
declare(strict_types=1);

global $apiAuth, $method, $subRes1, $subRes2, $subRes3;

$user = $apiAuth->require();
$input = api_input();

if ($subRes2 === null && $subRes1 !== null && ctype_digit((string)$subRes1)) {
    $sesiId = (int)$subRes1;
    $sesi = DB::one('SELECT * FROM kka_sesi WHERE id = ?', [$sesiId]);
    if (!$sesi || !api_sesi_is_owned($apiAuth, $sesi)) {
        api_response(403, false, 'Anda tidak memiliki akses ke sesi ini');
    }

    if ($method === 'GET') {
        $rincian = DB::all('
            SELECT * FROM kka_rincian WHERE sesi_id = ? ORDER BY urutan, id
        ', [$sesiId]);
        api_response(200, true, 'Daftar rincian belanja', $rincian);
    }

    if ($method === 'POST') {
        if (isset($input['items']) && is_array($input['items'])) {
            $ids = [];
            foreach ($input['items'] as $idx => $item) {
                $err = api_validate($item, [
                    'uraian' => 'required',
                ]);
                if ($err) api_response(422, false, "Rincian #" . ($idx+1) . ": $err");
                $data = [
                    'sesi_id'         => $sesiId,
                    'urutan'          => (int)($item['urutan'] ?? ($idx+1)),
                    'uraian'          => trim((string)$item['uraian']),
                    'pagu_anggaran'   => parse_money($item['pagu_anggaran'] ?? 0),
                    'biaya_dikwitansi'=> parse_money($item['biaya_dikwitansi'] ?? 0),
                    'realisasi'       => parse_money($item['realisasi'] ?? 0),
                    'penerima'        => !empty($item['penerima']) ? trim((string)$item['penerima']) : null,
                    'keterangan'      => !empty($item['keterangan']) ? trim((string)$item['keterangan']) : null,
                ];
                $ids[] = DB::insert('kka_rincian', $data);
            }
            api_response(201, true, count($ids) . ' rincian ditambahkan', ['ids' => $ids]);
        } else {
            $err = api_validate($input, ['uraian' => 'required']);
            if ($err) api_response(422, false, $err);
            $data = [
                'sesi_id'         => $sesiId,
                'urutan'          => (int)($input['urutan'] ?? 1),
                'uraian'          => trim((string)$input['uraian']),
                'pagu_anggaran'   => parse_money($input['pagu_anggaran'] ?? 0),
                'biaya_dikwitansi'=> parse_money($input['biaya_dikwitansi'] ?? 0),
                'realisasi'       => parse_money($input['realisasi'] ?? 0),
                'penerima'        => !empty($input['penerima']) ? trim((string)$input['penerima']) : null,
                'keterangan'      => !empty($input['keterangan']) ? trim((string)$input['keterangan']) : null,
            ];
            $id = DB::insert('kka_rincian', $data);
            api_response(201, true, 'Rincian ditambahkan', ['id' => $id]);
        }
    }
}

if ($subRes1 !== null && ctype_digit((string)$subRes1) && $subRes2 === null) {
    $rincianId = (int)$subRes1;
    $rincian = DB::one('SELECT * FROM kka_rincian WHERE id = ?', [$rincianId]);
    if (!$rincian) api_response(404, false, 'Rincian tidak ditemukan');
    $sesiOwn = DB::one('SELECT * FROM kka_sesi WHERE id = ?', [(int)$rincian['sesi_id']]);
    if (!$sesiOwn || !api_sesi_is_owned($apiAuth, $sesiOwn)) {
        api_response(403, false, 'Akses ditolak');
    }

    if ($method === 'GET') {
        api_response(200, true, 'Detail rincian', $rincian);
    }
    if ($method === 'PUT') {
        $data = [
            'urutan'          => (int)($input['urutan'] ?? $rincian['urutan']),
            'uraian'          => trim((string)($input['uraian'] ?? $rincian['uraian'])),
            'pagu_anggaran'   => parse_money($input['pagu_anggaran'] ?? $rincian['pagu_anggaran']),
            'biaya_dikwitansi'=> parse_money($input['biaya_dikwitansi'] ?? $rincian['biaya_dikwitansi']),
            'realisasi'       => parse_money($input['realisasi'] ?? $rincian['realisasi']),
            'penerima'        => !empty($input['penerima']) ? trim((string)$input['penerima']) : null,
            'keterangan'      => !empty($input['keterangan']) ? trim((string)$input['keterangan']) : null,
        ];
        if ($data['uraian'] === '') api_response(422, false, 'Uraian wajib diisi');
        DB::update('kka_rincian', $data, ['id' => $rincianId]);
        api_response(200, true, 'Rincian diperbarui');
    }
    if ($method === 'DELETE') {
        DB::delete('kka_rincian', ['id' => $rincianId]);
        api_response(200, true, 'Rincian dihapus');
    }
}

api_response(405, false, 'Method tidak diizinkan');

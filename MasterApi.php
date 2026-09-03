<?php
declare(strict_types=1);

global $apiAuth, $method, $subRes1, $subRes2, $resource;

$user = $apiAuth->require();
$input = api_input();

if ($resource === 'kecamatan') {
    if ($method === 'GET') {
        $kec = DB::all('SELECT id, nama FROM kka_kecamatan ORDER BY nama');
        api_response(200, true, 'Daftar kecamatan', $kec);
    }
    if ($method === 'POST') {
        $apiAuth->requireAdmin();
        $nama = trim((string)($input['nama'] ?? ''));
        if ($nama === '') api_response(422, false, 'Nama kecamatan wajib diisi');
        try {
            $id = DB::insert('kka_kecamatan', ['nama' => $nama]);
            api_response(201, true, 'Kecamatan ditambahkan', ['id' => $id]);
        } catch (Throwable $e) {
            api_response(422, false, 'Kecamatan sudah ada atau gagal disimpan');
        }
    }
}

if ($resource === 'desa') {
    if ($method === 'GET') {
        $q   = trim((string)($input['q'] ?? ''));
        $kec = (int)($input['kecamatan_id'] ?? 0);
        $where = '1=1'; $p = [];
        if ($q !== '')   { $where .= ' AND d.nama LIKE ?'; $p[] = "%$q%"; }
        if ($kec > 0)    { $where .= ' AND d.kecamatan_id = ?'; $p[] = $kec; }
        $desa = DB::all("
            SELECT d.id, d.nama, k.id AS kecamatan_id, k.nama AS kecamatan
            FROM kka_desa d JOIN kka_kecamatan k ON k.id = d.kecamatan_id
            WHERE $where ORDER BY d.nama ASC
        ", $p);
        api_response(200, true, 'Daftar desa', $desa);
    }
    if ($method === 'POST') {
        $apiAuth->requireAdmin();
        $kec = (int)($input['kecamatan_id'] ?? 0);
        $nama = trim((string)($input['nama'] ?? ''));
        if (!$kec || $nama === '') api_response(422, false, 'Kecamatan dan nama desa wajib diisi');
        try {
            $id = DB::insert('kka_desa', ['kecamatan_id' => $kec, 'nama' => $nama]);
            api_response(201, true, 'Desa ditambahkan', ['id' => $id]);
        } catch (Throwable $e) {
            api_response(422, false, 'Gagal menyimpan: ' . $e->getMessage());
        }
    }
    if ($subRes1 !== null && ctype_digit((string)$subRes1)) {
        $id = (int)$subRes1;
        if ($method === 'PUT') {
            $apiAuth->requireAdmin();
            $kec = (int)($input['kecamatan_id'] ?? 0);
            $nama = trim((string)($input['nama'] ?? ''));
            if (!$id || !$kec || $nama === '') api_response(422, false, 'Data tidak valid');
            DB::update('kka_desa', ['kecamatan_id' => $kec, 'nama' => $nama], ['id' => $id]);
            api_response(200, true, 'Data desa diperbarui');
        }
        if ($method === 'DELETE') {
            $apiAuth->requireAdmin();
            $used = (int)DB::scalar('SELECT COUNT(*) FROM kka_sesi WHERE desa_id = ?', [$id]);
            if ($used > 0) api_response(422, false, 'Desa ini sudah dipakai pada ' . $used . ' sesi audit');
            DB::delete('kka_desa', ['id' => $id]);
            api_response(200, true, 'Desa dihapus');
        }
    }
}

if ($resource === 'bidang') {
    if ($subRes1 === null && $method === 'GET') {
        $bidang = DB::all('SELECT id, nama, urutan FROM kka_bidang ORDER BY urutan');
        api_response(200, true, 'Daftar bidang', $bidang);
    }
    if ($subRes1 !== null && ctype_digit((string)$subRes1) && $subRes2 === 'sub-bidang' && $method === 'GET') {
        $bid = (int)$subRes1;
        $sub = DB::all('SELECT id, nama FROM kka_sub_bidang WHERE bidang_id = ? ORDER BY nama', [$bid]);
        api_response(200, true, 'Daftar sub bidang', $sub);
    }
    if ($subRes1 !== null && $subRes2 === null && $method === 'GET') {
        $bid = (int)$subRes1;
        $bidang = DB::one('SELECT id, nama, urutan FROM kka_bidang WHERE id = ?', [$bid]);
        if (!$bidang) api_response(404, false, 'Bidang tidak ditemukan');
        $sub = DB::all('SELECT id, nama FROM kka_sub_bidang WHERE bidang_id = ? ORDER BY nama', [$bid]);
        api_response(200, true, 'Detail bidang', array_merge($bidang, ['sub_bidang' => $sub]));
    }
}

api_response(405, false, 'Method tidak diizinkan');

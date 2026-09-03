<?php
declare(strict_types=1);

global $apiAuth, $method, $resource, $subRes1, $subRes2, $subRes3;

$user = $apiAuth->require();
$input = api_input();

function mka_tables_ok(): bool {
    try {
        DB::one('SELECT id, sesi_id, tipe, judul FROM kka_master LIMIT 0');
        DB::one('SELECT id, master_id FROM kka_master_fisik LIMIT 0');
        DB::one('SELECT id, master_id FROM kka_master_foto LIMIT 0');
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

function mka_require_tables(): void {
    if (!mka_tables_ok()) {
        api_response(501, false,
            'Tabel Master KKA belum tersedia. Jalankan database/migrasi_master_kka.sql di phpMyAdmin '
            . '(bila tabel sudah ada dari web v13 dengan kolom berbeda, kirim skema ke developer).');
    }
}

function mka_volume(array $r): float {
    $lebar = (float)($r['lebar1'] ?? 0) + (float)($r['lebar2'] ?? 0);
    $jarak = (float)($r['jarak'] ?? 0);
    $tebal = (float)($r['tebal'] ?? 0);
    if ($jarak <= 0) return 0;
    return round(($lebar / 2) * $jarak * $tebal, 3);
}

function mka_sesi(bool $owned = true): ?array {
    global $apiAuth;
    $sesiId = (int)($GLOBALS['_mka_sesi_id'] ?? 0);
    $sesi = DB::one('SELECT * FROM kka_sesi WHERE id = ?', [$sesiId]);
    if (!$sesi) api_response(404, false, 'Sesi audit tidak ditemukan');
    if ($owned && !api_sesi_is_owned($apiAuth, $sesi)) {
        api_response(403, false, 'Anda tidak memiliki akses ke sesi ini');
    }
    return $sesi;
}

if ($resource !== 'master') {
    api_response(404, false, 'Endpoint tidak ditemukan');
}

// ============================ LIST ============================
if ($subRes1 === null && $method === 'GET') {
    mka_require_tables();
    [$ow, $op] = api_owner_where($apiAuth);
    $filters = '1=1'; $fp = [];
    $tipe = trim((string)($input['tipe'] ?? ''));
    $sesiId = (int)($input['sesi_id'] ?? 0);
    $q = trim((string)($input['q'] ?? ''));
    if ($tipe !== '' && in_array($tipe, ['standar', 'fisik', 'sketsa'], true)) {
        $filters .= ' AND m.tipe = ?'; $fp[] = $tipe;
    }
    if ($sesiId > 0) { $filters .= ' AND m.sesi_id = ?'; $fp[] = $sesiId; }
    if ($q !== '')   { $filters .= ' AND m.judul LIKE ?'; $fp[] = "%$q%"; }

    $rows = DB::all("
        SELECT m.id, m.tipe, m.judul, m.narasi, m.created_at, m.created_by,
               s.id AS sesi_id, s.objek_audit,
               d.nama AS desa, k.nama AS kecamatan, b.nama AS bidang,
               (SELECT COUNT(*) FROM kka_master_fisik f WHERE f.master_id = m.id) AS jumlah_fisik,
               (SELECT COUNT(*) FROM kka_master_foto p WHERE p.master_id = m.id) AS jumlah_foto
        FROM kka_master m
        JOIN kka_sesi s ON s.id = m.sesi_id
        JOIN kka_desa d ON d.id = s.desa_id
        JOIN kka_kecamatan k ON k.id = d.kecamatan_id
        JOIN kka_bidang b ON b.id = s.bidang_id
        WHERE $filters $ow
        ORDER BY m.created_at DESC
    ", array_merge($fp, $op));
    api_response(200, true, 'Daftar Master KKA', $rows);
}

// ============================ CREATE ============================
if ($subRes1 === null && $method === 'POST') {
    mka_require_tables();
    $err = api_validate($input, [
        'sesi_id' => 'required|numeric',
        'tipe'    => 'required',
        'judul'   => 'required',
    ]);
    if ($err) api_response(422, false, $err);
    $tipe = trim((string)$input['tipe']);
    if (!in_array($tipe, ['standar', 'fisik', 'sketsa'], true)) {
        api_response(422, false, 'Tipe harus standar, fisik, atau sketsa');
    }
    $GLOBALS['_mka_sesi_id'] = (int)$input['sesi_id'];
    mka_sesi(true);

    $masterId = DB::insert('kka_master', [
        'sesi_id'    => (int)$input['sesi_id'],
        'tipe'       => $tipe,
        'judul'      => trim((string)$input['judul']),
        'narasi'     => !empty($input['narasi']) ? trim((string)$input['narasi']) : null,
        'created_by' => (int)$apiAuth->id(),
    ]);

    if ($tipe === 'fisik' && !empty($input['fisik']) && is_array($input['fisik'])) {
        $urutan = 1;
        foreach ($input['fisik'] as $row) {
            if (!is_array($row)) continue;
            $row['jarak']  = (float)($row['jarak'] ?? 0);
            $row['lebar1'] = (float)($row['lebar1'] ?? 0);
            $row['lebar2'] = (float)($row['lebar2'] ?? 0);
            $row['tebal']  = (float)($row['tebal'] ?? 0);
            DB::insert('kka_master_fisik', [
                'master_id'  => $masterId,
                'sta'        => !empty($row['sta']) ? trim((string)$row['sta']) : null,
                'jarak'      => $row['jarak'],
                'lebar1'     => $row['lebar1'],
                'lebar2'     => $row['lebar2'],
                'tebal'      => $row['tebal'],
                'volume'     => mka_volume($row),
                'keterangan' => !empty($row['keterangan']) ? trim((string)$row['keterangan']) : null,
                'urutan'     => $urutan++,
            ]);
        }
    }

    api_response(201, true, 'Master KKA dibuat', ['id' => $masterId]);
}

// ============================ DETAIL / UPDATE / DELETE ============================
if ($subRes1 !== null && ctype_digit((string)$subRes1) && $subRes2 === null) {
    $id = (int)$subRes1;
    mka_require_tables();
    $master = DB::one('SELECT * FROM kka_master WHERE id = ?', [$id]);
    if (!$master) api_response(404, false, 'Master KKA tidak ditemukan');
    $GLOBALS['_mka_sesi_id'] = (int)$master['sesi_id'];
    $sesi = mka_sesi(true);

    if ($method === 'GET') {
        $fisik = DB::all('SELECT * FROM kka_master_fisik WHERE master_id = ? ORDER BY urutan, id', [$id]);
        $foto = DB::all("
            SELECT p.*,
                   CONCAT(?, '/uploads/master/', p.nama_file) AS file_url
            FROM kka_master_foto p
            WHERE p.master_id = ? ORDER BY p.created_at DESC
        ", [rtrim($GLOBALS['cfg']['app_url'], '/'), $id]);
        $detail = $master;
        $detail += [
            'sesi' => [
                'id' => (int)$sesi['id'],
                'objek_audit' => $sesi['objek_audit'],
                'no_kka'      => $sesi['no_kka'],
                'tahun_anggaran' => (int)$sesi['tahun_anggaran'],
            ],
            'fisik' => $fisik,
            'foto'  => $foto,
        ];
        api_response(200, true, 'Detail Master KKA', $detail);
    }

    if ($method === 'PUT') {
        $data = [
            'judul'  => !empty($input['judul']) ? trim((string)$input['judul']) : $master['judul'],
            'narasi' => array_key_exists('narasi', $input) ? (trim((string)$input['narasi']) ?: null) : $master['narasi'],
        ];
        DB::update('kka_master', $data, ['id' => $id]);

        if ($master['tipe'] === 'fisik' && isset($input['fisik']) && is_array($input['fisik'])) {
            DB::q('DELETE FROM kka_master_fisik WHERE master_id = ?', [$id]);
            $urutan = 1;
            foreach ($input['fisik'] as $row) {
                if (!is_array($row)) continue;
                $row['jarak']  = (float)($row['jarak'] ?? 0);
                $row['lebar1'] = (float)($row['lebar1'] ?? 0);
                $row['lebar2'] = (float)($row['lebar2'] ?? 0);
                $row['tebal']  = (float)($row['tebal'] ?? 0);
                DB::insert('kka_master_fisik', [
                    'master_id'  => $id,
                    'sta'        => !empty($row['sta']) ? trim((string)$row['sta']) : null,
                    'jarak'      => $row['jarak'],
                    'lebar1'     => $row['lebar1'],
                    'lebar2'     => $row['lebar2'],
                    'tebal'      => $row['tebal'],
                    'volume'     => mka_volume($row),
                    'keterangan' => !empty($row['keterangan']) ? trim((string)$row['keterangan']) : null,
                    'urutan'     => $urutan++,
                ]);
            }
        }
        api_response(200, true, 'Master KKA diperbarui');
    }

    if ($method === 'DELETE') {
        $fotos = DB::all('SELECT nama_file FROM kka_master_foto WHERE master_id = ?', [$id]);
        $dir = $GLOBALS['cfg']['upload_dir'] . '/master';
        foreach ($fotos as $f) {
            $p = $dir . '/' . $f['nama_file'];
            if (is_file($p)) @unlink($p);
        }
        DB::delete('kka_master', ['id' => $id]);
        api_response(200, true, 'Master KKA dihapus');
    }
}

// ============================ FOTO UPLOAD ============================
if ($subRes1 !== null && ctype_digit((string)$subRes1) && $subRes2 === 'foto' && $subRes3 === null && $method === 'POST') {
    $id = (int)$subRes1;
    mka_require_tables();
    $master = DB::one('SELECT * FROM kka_master WHERE id = ?', [$id]);
    if (!$master) api_response(404, false, 'Master KKA tidak ditemukan');
    $GLOBALS['_mka_sesi_id'] = (int)$master['sesi_id'];
    mka_sesi(true);

    if (empty($_FILES['file']) && empty($input['file_base64'])) {
        api_response(422, false, 'File foto wajib diupload');
    }
    $dir = $GLOBALS['cfg']['upload_dir'] . '/master';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);

    $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $maxSize = $GLOBALS['cfg']['max_upload_mb'] * 1024 * 1024;

    if (!empty($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
        $f = $_FILES['file'];
        if ($f['error'] !== UPLOAD_ERR_OK) api_response(422, false, 'Gagal upload foto (kode ' . $f['error'] . ')');
        $namaAsli = $f['name'];
        $mime = mime_content_type($f['tmp_name']) ?: $f['type'];
        $content = file_get_contents($f['tmp_name']);
    } else {
        $namaAsli = $input['nama_asli'] ?? 'foto_' . time();
        $b64 = (string)$input['file_base64'];
        if (str_contains($b64, ',')) $b64 = explode(',', $b64, 2)[1];
        $content = base64_decode($b64, true);
        if ($content === false) api_response(422, false, 'Base64 tidak valid');
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->buffer($content);
    }

    if (strlen($content) > $maxSize) {
        api_response(422, false, 'Ukuran foto maksimal ' . $GLOBALS['cfg']['max_upload_mb'] . ' MB');
    }
    if (!in_array($mime, $allowed, true)) {
        api_response(422, false, 'Hanya foto JPG, PNG, WebP, atau GIF yang diizinkan');
    }

    $ext = str_replace('image/', '', $mime);
    $namaFile = 'mka_' . $id . '_' . substr(bin2hex(random_bytes(8)), 0, 10) . '.' . $ext;
    $target = $dir . '/' . $namaFile;
    file_put_contents($target, $content);

    $fotoId = DB::insert('kka_master_foto', [
        'master_id'  => $id,
        'nama_file'  => $namaFile,
        'nama_asli'  => $namaAsli,
        'mime_type'  => $mime,
        'ukuran'     => strlen($content),
        'keterangan' => !empty($input['keterangan']) ? trim((string)$input['keterangan']) : null,
    ]);

    api_response(201, true, 'Foto diunggah', [
        'id'        => $fotoId,
        'nama_file' => $namaFile,
        'file_url'  => rtrim($GLOBALS['cfg']['app_url'], '/') . '/uploads/master/' . $namaFile,
    ]);
}

// ============================ FOTO DELETE ============================
if ($subRes1 !== null && ctype_digit((string)$subRes1) && $subRes2 === 'foto' && $subRes3 !== null && ctype_digit((string)$subRes3) && $method === 'DELETE') {
    $id = (int)$subRes1;
    $fotoId = (int)$subRes3;
    mka_require_tables();
    $master = DB::one('SELECT * FROM kka_master WHERE id = ?', [$id]);
    if (!$master) api_response(404, false, 'Master KKA tidak ditemukan');
    $GLOBALS['_mka_sesi_id'] = (int)$master['sesi_id'];
    mka_sesi(true);

    $foto = DB::one('SELECT * FROM kka_master_foto WHERE id = ? AND master_id = ?', [$fotoId, $id]);
    if (!$foto) api_response(404, false, 'Foto tidak ditemukan');
    $p = $GLOBALS['cfg']['upload_dir'] . '/master/' . $foto['nama_file'];
    if (is_file($p)) @unlink($p);
    DB::delete('kka_master_foto', ['id' => $fotoId]);
    api_response(200, true, 'Foto dihapus');
}

api_response(405, false, 'Method tidak diizinkan');

<?php
declare(strict_types=1);

global $apiAuth, $method, $subRes1, $subRes2, $subRes3;

$user = $apiAuth->require();
$input = api_input();

$fromSesiRoute = (isset($GLOBALS['_sesi_route'])) ? true : false;

if ($subRes2 === null && $subRes1 !== null && ctype_digit((string)$subRes1)) {
    $sesiId = (int)$subRes1;
    $sesi = DB::one('SELECT * FROM kka_sesi WHERE id = ?', [$sesiId]);
    if (!$sesi || !api_sesi_is_owned($apiAuth, $sesi)) {
        api_response(403, false, 'Anda tidak memiliki akses ke sesi ini');
    }

    if ($method === 'GET') {
        $lampiran = DB::all("
            SELECT l.id, l.nama_asli, l.nama_file, l.mime_type, l.ukuran,
                   l.keterangan, l.created_at, u.nama AS uploader_nama,
                   CONCAT(?, '/', l.nama_file) AS file_url
            FROM kka_lampiran l
            LEFT JOIN kka_users u ON u.id = l.uploaded_by
            WHERE l.sesi_id = ? ORDER BY l.created_at DESC
        ", [rtrim($GLOBALS['cfg']['app_url'], '/') . '/uploads', $sesiId]);
        foreach ($lampiran as &$l) {
            $l['ukuran_formatted'] = $l['ukuran'] < 1024 ? $l['ukuran'] . ' B' :
                ($l['ukuran'] < 1048576 ? round($l['ukuran']/1024, 1) . ' KB' :
                round($l['ukuran']/1048576, 2) . ' MB');
        }
        api_response(200, true, 'Daftar lampiran', $lampiran);
    }

    if ($method === 'POST') {
        if (empty($_FILES['file']) && empty($input['file_base64'])) {
            api_response(422, false, 'File lampiran wajib diupload');
        }
        $uploadDir = $GLOBALS['cfg']['upload_dir'];
        if (!is_dir($uploadDir)) @mkdir($uploadDir, 0755, true);

        $allowedMimes = $GLOBALS['cfg']['allowed_mimes'];
        $maxSize = $GLOBALS['cfg']['max_upload_mb'] * 1024 * 1024;

        $namaAsli = '';
        $mime = '';
        $ukuran = 0;
        $fileContent = '';

        if (!empty($_FILES['file']) && is_uploaded_file($_FILES['file']['tmp_name'])) {
            $f = $_FILES['file'];
            if ($f['error'] !== UPLOAD_ERR_OK) {
                api_response(422, false, 'Gagal upload file (error code: ' . $f['error'] . ')');
            }
            $namaAsli = $f['name'];
            $mime = mime_content_type($f['tmp_name']) ?: $f['type'];
            $ukuran = $f['size'];
            if ($ukuran > $maxSize) {
                api_response(422, false, 'Ukuran file maksimal ' . $GLOBALS['cfg']['max_upload_mb'] . ' MB');
            }
            if (!in_array($mime, $allowedMimes)) {
                api_response(422, false, 'Tipe file tidak diizinkan. Diizinkan: PDF, Excel, JPG, PNG, GIF, WebP');
            }
            $fileContent = file_get_contents($f['tmp_name']);
        } elseif (!empty($input['file_base64'])) {
            $namaAsli = $input['nama_asli'] ?? 'upload_' . time();
            $b64 = $input['file_base64'];
            if (str_contains($b64, ',')) { $b64 = explode(',', $b64, 2)[1]; }
            $fileContent = base64_decode($b64, true);
            if ($fileContent === false) api_response(422, false, 'Base64 tidak valid');
            $ukuran = strlen($fileContent);
            if ($ukuran > $maxSize) {
                api_response(422, false, 'Ukuran file maksimal ' . $GLOBALS['cfg']['max_upload_mb'] . ' MB');
            }
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->buffer($fileContent);
            if (!in_array($mime, $allowedMimes)) {
                api_response(422, false, 'Tipe file tidak diizinkan: ' . $mime);
            }
        } else {
            api_response(422, false, 'Tidak ada file yang diupload');
        }

        $ext = $mime === 'application/pdf' ? 'pdf' :
            ($mime === 'application/vnd.ms-excel' ? 'xls' :
            ($mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? 'xlsx' :
            (str_starts_with($mime, 'image/') ? str_replace('image/', '', $mime) : 'bin')));
        $namaFile = 'lamp_' . $sesiId . '_' . substr(bin2hex(random_bytes(8)), 0, 10) . '.' . $ext;
        $target = $uploadDir . '/' . $namaFile;
        file_put_contents($target, $fileContent);

        $id = DB::insert('kka_lampiran', [
            'sesi_id'     => $sesiId,
            'nama_asli'   => $namaAsli,
            'nama_file'   => $namaFile,
            'mime_type'   => $mime,
            'ukuran'      => $ukuran,
            'keterangan'  => !empty($input['keterangan']) ? trim((string)$input['keterangan']) : null,
            'uploaded_by' => (int)$apiAuth->id(),
        ]);

        api_response(201, true, 'Lampiran diupload', [
            'id'        => $id,
            'nama_file' => $namaFile,
            'file_url'  => rtrim($GLOBALS['cfg']['app_url'], '/') . '/uploads/' . $namaFile,
        ]);
    }
}

if ($subRes1 !== null && ctype_digit((string)$subRes1) && !isset($subRes2)) {
    $lampId = (int)$subRes1;
    $lamp = DB::one('SELECT l.*, s.created_by AS sesi_creator FROM kka_lampiran l
                     JOIN kka_sesi s ON s.id = l.sesi_id WHERE l.id = ?', [$lampId]);
    if (!$lamp) api_response(404, false, 'Lampiran tidak ditemukan');
    if (!$apiAuth->isAdmin() && (int)$lamp['sesi_creator'] !== (int)$apiAuth->id() && (int)$lamp['uploaded_by'] !== (int)$apiAuth->id()) {
        api_response(403, false, 'Akses ditolak');
    }
    if ($method === 'DELETE') {
        $target = $GLOBALS['cfg']['upload_dir'] . '/' . $lamp['nama_file'];
        if (is_file($target)) @unlink($target);
        DB::delete('kka_lampiran', ['id' => $lampId]);
        api_response(200, true, 'Lampiran dihapus');
    }
    if ($method === 'GET') {
        api_response(200, true, 'Detail lampiran', $lamp);
    }
}

api_response(405, false, 'Method tidak diizinkan');

<?php
declare(strict_types=1);

global $apiAuth, $method, $resource, $subRes1;

$user = $apiAuth->require();
$input = api_input();

if ($resource === 'users') {
    if ($method === 'GET') {
        $apiAuth->requireAdmin();
        $users = DB::all('
            SELECT id, nama, email, role, nip, jabatan, is_active, created_at, updated_at
            FROM kka_users ORDER BY created_at DESC
        ');
        api_response(200, true, 'Daftar pengguna', $users);
    }
    if ($method === 'POST') {
        $apiAuth->requireAdmin();
        $err = api_validate($input, [
            'nama'     => 'required',
            'email'    => 'required|email',
            'password' => 'required|min:6',
        ]);
        if ($err) api_response(422, false, $err);
        try {
            $id = DB::insert('kka_users', [
                'nama'          => trim((string)$input['nama']),
                'email'         => strtolower(trim((string)$input['email'])),
                'password_hash' => password_hash((string)$input['password'], PASSWORD_BCRYPT),
                'role'          => ($input['role'] ?? '') === 'admin' ? 'admin' : 'auditor',
                'nip'           => !empty($input['nip']) ? trim((string)$input['nip']) : null,
                'jabatan'       => !empty($input['jabatan']) ? trim((string)$input['jabatan']) : null,
                'is_active'     => 1,
            ]);
            api_response(201, true, 'Pengguna dibuat', ['id' => $id]);
        } catch (Throwable $e) {
            api_response(422, false, 'Email sudah dipakai atau gagal disimpan');
        }
    }
    if ($subRes1 !== null && ctype_digit((string)$subRes1)) {
        $id = (int)$subRes1;
        if ($method === 'PUT') {
            $apiAuth->requireAdmin();
            $u = DB::one('SELECT * FROM kka_users WHERE id = ?', [$id]);
            if (!$u) api_response(404, false, 'Pengguna tidak ditemukan');
            $data = [
                'nama'      => trim((string)($input['nama'] ?? $u['nama'])),
                'role'      => ($input['role'] ?? $u['role']) === 'admin' ? 'admin' : 'auditor',
                'nip'       => !empty($input['nip']) ? trim((string)$input['nip']) : null,
                'jabatan'   => !empty($input['jabatan']) ? trim((string)$input['jabatan']) : null,
                'is_active' => (int)($input['is_active'] ?? $u['is_active']) === 1 ? 1 : 0,
            ];
            if (!empty($input['password'])) {
                if (strlen((string)$input['password']) < 6) {
                    api_response(422, false, 'Password minimal 6 karakter');
                }
                $data['password_hash'] = password_hash((string)$input['password'], PASSWORD_BCRYPT);
            }
            DB::update('kka_users', $data, ['id' => $id]);
            api_response(200, true, 'Pengguna diperbarui');
        }
        if ($method === 'DELETE') {
            $apiAuth->requireAdmin();
            if ($id === (int)$apiAuth->id()) {
                api_response(422, false, 'Tidak bisa menghapus akun sendiri');
            }
            DB::delete('kka_users', ['id' => $id]);
            api_response(200, true, 'Pengguna dihapus');
        }
    }
}

if ($resource === 'profile') {
    if ($method === 'GET' || $method === 'POST') {
        $profile = DB::one('
            SELECT id, nama, email, role, nip, jabatan, is_active, created_at
            FROM kka_users WHERE id = ?
        ', [(int)$apiAuth->id()]);
        if ($subRes1 === 'password') {
            if ($method !== 'PUT') api_response(405, false, 'Method harus PUT');
            $oldPass = (string)($input['old_password'] ?? '');
            $newPass = (string)($input['new_password'] ?? '');
            if ($newPass === '' || strlen($newPass) < 6) {
                api_response(422, false, 'Password baru minimal 6 karakter');
            }
            $u = DB::one('SELECT password_hash FROM kka_users WHERE id = ?', [(int)$apiAuth->id()]);
            if (!password_verify($oldPass, $u['password_hash'])) {
                api_response(422, false, 'Password lama salah');
            }
            DB::update('kka_users', [
                'password_hash' => password_hash($newPass, PASSWORD_BCRYPT),
            ], ['id' => (int)$apiAuth->id()]);
            api_response(200, true, 'Password diperbarui');
        }
        if ($method === 'PUT' && $subRes1 === null) {
            $data = [
                'nama'    => trim((string)($input['nama'] ?? $profile['nama'])),
                'nip'     => !empty($input['nip']) ? trim((string)$input['nip']) : null,
                'jabatan' => !empty($input['jabatan']) ? trim((string)$input['jabatan']) : null,
            ];
            DB::update('kka_users', $data, ['id' => (int)$apiAuth->id()]);
            $profile = DB::one('
                SELECT id, nama, email, role, nip, jabatan, is_active, created_at
                FROM kka_users WHERE id = ?
            ', [(int)$apiAuth->id()]);
        }
        api_response(200, true, 'Data profil', $profile);
    }
}

api_response(405, false, 'Method tidak diizinkan');

<?php
declare(strict_types=1);

global $apiAuth, $method;

$input = api_input();

if ($subRes1 === null) {
    api_response(404, false, 'Endpoint auth tidak valid');
}

if ($subRes1 === 'login' && $method === 'POST') {
    $err = api_validate($input, [
        'email'    => 'required|email',
        'password' => 'required|min:6',
    ]);
    if ($err) api_response(422, false, $err);

    $device = $input['device_name'] ?? 'Mobile App';
    $result = $apiAuth->attempt($input['email'], $input['password'], $device);
    if (!$result) {
        api_response(401, false, 'Email atau password salah, atau akun dinonaktifkan');
    }
    api_response(200, true, 'Login berhasil', $result);
}

if ($subRes1 === 'logout' && $method === 'POST') {
    $apiAuth->require();
    $token = $apiAuth->token();
    if ($token) $apiAuth->revokeToken($token);
    api_response(200, true, 'Logout berhasil');
}

if ($subRes1 === 'me' && $method === 'GET') {
    $user = $apiAuth->require();
    api_response(200, true, 'Data profil', $user);
}

api_response(405, false, 'Method tidak diizinkan untuk endpoint ini');

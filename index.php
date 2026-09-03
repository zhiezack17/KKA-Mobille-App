<?php
declare(strict_types=1);

require __DIR__ . '/../../src/api_bootstrap.php';

$apiAuth = $GLOBALS['apiAuth'];

$method = $_SERVER['REQUEST_METHOD'];
$uri    = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '')), '/');
if ($basePath === '.' || $basePath === '/') $basePath = '';

$path = substr($uri, strlen($basePath));
if ($path === false || $path === '') $path = '/';
$path = rtrim($path, '/') ?: '/';

$segments = array_values(array_filter(explode('/', $path), fn($s) => $s !== ''));

function api_segments(): array { global $segments; return $segments; }
function api_segment(int $n, $default = null) {
    global $segments;
    return $segments[$n] ?? $default;
}

function api_owner_where($apiAuth, string $col = 's.created_by'): array {
    if ($apiAuth && $apiAuth->isAdmin()) return ['', []];
    $uid = $apiAuth ? (int)$apiAuth->id() : 0;
    $alias = strpos($col, '.') !== false ? substr($col, 0, strpos($col, '.')) : $col;
    return [
        " AND ($col = ? OR $alias.id IN (SELECT sesi_id FROM kka_sesi_share WHERE user_id = ?))",
        [$uid, $uid],
    ];
}

function api_sesi_is_owned($apiAuth, ?array $sesi): bool {
    if (!$sesi || !$apiAuth) return false;
    if ($apiAuth->isAdmin()) return true;
    $uid = (int)$apiAuth->id();
    if ((int)($sesi['created_by'] ?? 0) === $uid) return true;
    $sid = (int)($sesi['sesi_id'] ?? $sesi['id'] ?? 0);
    if ($sid > 0) {
        return (bool)DB::scalar(
            'SELECT 1 FROM kka_sesi_share WHERE sesi_id = ? AND user_id = ? LIMIT 1',
            [$sid, $uid]
        );
    }
    return false;
}

try {
    if ($segments === [] || $segments[0] === 'index.php') {
        api_response(200, true, 'KKA Mobile API v1.0 - Service berjalan', [
            'name' => 'KKA Mobile API',
            'version' => '1.0.0',
            'timestamp' => date('Y-m-d H:i:s'),
            'endpoints' => [
                'auth' => ['POST /auth/login', 'POST /auth/logout', 'GET /auth/me'],
                'dashboard' => ['GET /dashboard'],
                'sesi' => ['GET /sesi', 'GET /sesi/{id}', 'POST /sesi', 'PUT /sesi/{id}', 'DELETE /sesi/{id}'],
                'rincian' => ['GET /sesi/{id}/rincian', 'POST /sesi/{id}/rincian', 'PUT /rincian/{id}', 'DELETE /rincian/{id}'],
                'lampiran' => ['GET /sesi/{id}/lampiran', 'POST /sesi/{id}/lampiran', 'DELETE /lampiran/{id}'],
                'master' => ['GET /kecamatan', 'GET /desa', 'GET /bidang', 'GET /bidang/{id}/sub-bidang'],
                'users' => ['GET /users', 'GET /profile', 'PUT /profile', 'PUT /profile/password'],
            ]
        ]);
    }

    $resource = $segments[0] ?? '';
    $subRes1  = $segments[1] ?? null;
    $subRes2  = $segments[2] ?? null;
    $subRes3  = $segments[3] ?? null;

    if ($resource === 'auth') {
        require __DIR__ . '/../../src/api/AuthApi.php';
        exit;
    }

    if ($resource === 'dashboard') {
        require __DIR__ . '/../../src/api/DashboardApi.php';
        exit;
    }

    if ($resource === 'sesi') {
        require __DIR__ . '/../../src/api/SesiApi.php';
        exit;
    }

    if ($resource === 'rincian') {
        require __DIR__ . '/../../src/api/RincianApi.php';
        exit;
    }

    if ($resource === 'lampiran') {
        require __DIR__ . '/../../src/api/LampiranApi.php';
        exit;
    }

    if ($resource === 'kecamatan' || $resource === 'desa' || $resource === 'bidang') {
        require __DIR__ . '/../../src/api/MasterApi.php';
        exit;
    }

    if ($resource === 'users' || $resource === 'profile') {
        require __DIR__ . '/../../src/api/UsersApi.php';
        exit;
    }

    if ($resource === 'rekap') {
        require __DIR__ . '/../../src/api/RekapApi.php';
        exit;
    }

    api_response(404, false, 'Endpoint tidak ditemukan: ' . $path);

} catch (Throwable $e) {
    global $cfg;
    $detail = $cfg['app_debug'] ? $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine() : '';
    api_response(500, false, 'Internal server error' . ($detail ? " - $detail" : ''));
}

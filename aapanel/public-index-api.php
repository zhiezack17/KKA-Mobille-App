<?php
/**
 * KKA - Front controller / router (WEB) + PENERUSAN API MOBILE
 * Inspektorat Kabupaten Rokan Hilir
 *
 * PENTING: blok /api HARUS di atas sebelum bootstrap web,
 * supaya request API mobile tidak masuk ke session web.
 */

// ============================================================
// ROUTING API MOBILE (endpoint /api/* -> public/api/index.php)
// ============================================================
$reqPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($reqPath === '/api' || str_starts_with($reqPath, '/api/')) {
    // Set SCRIPT_NAME agar api/index.php menghitung basePath dengan benar
    $_SERVER['SCRIPT_NAME'] = '/api/index.php';
    require __DIR__ . '/api/index.php';
    exit;
}
// ============================================================

require_once __DIR__ . '/../src/bootstrap.php';

// Tentukan route dari path setelah base
$reqUri  = strtok($_SERVER['REQUEST_URI'] ?? '/', '?');
$basePath = $GLOBALS['app_base_url'];
$route   = '/' . ltrim(substr($reqUri, strlen($basePath)), '/');
$route   = rtrim($route, '/');
if ($route === '') $route = '/';

// Routing manual sederhana
// Format: [Controller, action]
$routes = [
    '/'                       => ['AuthController', 'home'],
    '/login'                  => ['AuthController', 'login'],
    '/logout'                 => ['AuthController', 'logout'],

    '/dashboard'              => ['DashboardController', 'index'],

    '/desa'                   => ['DesaController', 'index'],
    '/desa/store'             => ['DesaController', 'store'],
    '/desa/update'            => ['DesaController', 'update'],
    '/desa/delete'            => ['DesaController', 'delete'],
    '/kecamatan/store'        => ['DesaController', 'storeKec'],

    '/sesi'                   => ['SesiController', 'index'],
    '/sesi/create'            => ['SesiController', 'create'],
    '/sesi/store'             => ['SesiController', 'store'],
    '/sesi/show'              => ['SesiController', 'show'],
    '/sesi/edit'              => ['SesiController', 'edit'],
    '/sesi/update'            => ['SesiController', 'update'],
    '/sesi/delete'            => ['SesiController', 'delete'],
    '/sesi/sub-bidang'        => ['SesiController', 'subBidangJson'],

    '/rincian/store'          => ['RincianController', 'store'],
    '/rincian/update'         => ['RincianController', 'update'],
    '/rincian/delete'         => ['RincianController', 'delete'],

    '/lampiran/upload'        => ['LampiranController', 'upload'],
    '/lampiran/delete'        => ['LampiranController', 'delete'],
    '/lampiran/download'      => ['LampiranController', 'download'],

    '/rekap'                  => ['RekapController', 'index'],
    '/rekap/data'             => ['RekapController', 'data'],

    '/master'                    => ['MasterKkaController', 'index'],
    '/master/create'             => ['MasterKkaController', 'create'],
    '/master/store'              => ['MasterKkaController', 'store'],
    '/master/edit'               => ['MasterKkaController', 'edit'],
    '/master/update'             => ['MasterKkaController', 'update'],
    '/master/delete'             => ['MasterKkaController', 'delete'],
    '/master/preview'            => ['MasterKkaController', 'preview'],
    '/master/export'             => ['MasterKkaController', 'export'],
    '/master/upload-foto'        => ['MasterKkaController', 'uploadFoto'],
    '/master/delete-foto'        => ['MasterKkaController', 'deleteFoto'],
    '/master/foto'               => ['MasterKkaController', 'foto'],
    '/master/download-template'  => ['MasterKkaController', 'downloadTemplate'],

    '/print/sesi'             => ['PrintController', 'sesi'],
    '/export/sesi'            => ['PrintController', 'exportExcel'],
    '/export/rekap'           => ['PrintController', 'exportRekap'],

    '/users'                  => ['UserController', 'index'],
    '/users/store'            => ['UserController', 'store'],
    '/users/update'           => ['UserController', 'update'],
    '/users/delete'           => ['UserController', 'delete'],
    '/profile'                => ['UserController', 'profile'],
    '/profile/update'         => ['UserController', 'updateProfile'],
];

if (!isset($routes[$route])) {
    http_response_code(404);
    view('errors/404');
    exit;
}

[$controllerName, $action] = $routes[$route];
$controllerClass = $controllerName;
$controller = new $controllerClass($auth);
$controller->$action();

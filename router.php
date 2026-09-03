<?php
/**
 * PHP built-in dev server router.
 * Memforward semua request ke /index.php kecuali file static yg ada di public/.
 */
$publicDir = __DIR__ . '/public';
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Serve file static langsung
$path = $publicDir . $uri;
if ($uri !== '/' && is_file($path)) {
    return false;
}

// Selain itu, route melalui index.php
$_SERVER['SCRIPT_NAME'] = '/index.php';
require $publicDir . '/index.php';

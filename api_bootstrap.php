<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Jakarta');

$cfg = require __DIR__ . '/config.php';
$GLOBALS['cfg'] = $cfg;

// CORS: jangan gunakan wildcard untuk API data audit internal.
$allowedOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string)($cfg['mobile_api_allowed_origins'] ?? ''))
)));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Jangan pernah menampilkan detail error ke client API production.
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ini_set('display_errors', '0');

spl_autoload_register(function (string $class): void {
    foreach (['lib', 'controllers', 'models'] as $dir) {
        $file = __DIR__ . '/' . $dir . '/' . $class . '.php';
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
});

require_once __DIR__ . '/lib/Helpers.php';

try {
    DB::init($cfg);
} catch (Throwable $e) {
    error_log('[KKA API] Database initialization failed: ' . $e->getMessage());
    api_response(500, false, 'Layanan KKA sedang mengalami gangguan.');
}

function api_response(int $code, bool $success, string $message = '', $data = null): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo json_encode([
        'success' => $success,
        'code' => $code,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function api_input(): array {
    $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method === 'GET') {
        return is_array($_GET) ? $_GET : [];
    }

    $contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($contentLength > 2 * 1024 * 1024) {
        api_response(413, false, 'Ukuran request terlalu besar.');
    }

    $contentType = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return is_array($_POST) ? $_POST : [];
    }

    if (str_contains($contentType, 'application/json')) {
        try {
            $json = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $e) {
            api_response(400, false, 'Body JSON tidak valid.');
        }
        if (!is_array($json)) {
            api_response(400, false, 'Body JSON harus berupa object.');
        }
        return $json;
    }

    if (str_contains($contentType, 'application/x-www-form-urlencoded') || str_contains($contentType, 'multipart/form-data')) {
        return is_array($_POST) ? $_POST : [];
    }

    api_response(415, false, 'Content-Type harus application/json.');
}

function api_validate(array $data, array $rules): ?string {
    foreach ($rules as $field => $rule) {
        foreach (explode('|', $rule) as $part) {
            if ($part === 'required' && (!isset($data[$field]) || trim((string)$data[$field]) === '')) {
                return "Kolom $field wajib diisi";
            }
            if ($part === 'email' && isset($data[$field]) && !filter_var($data[$field], FILTER_VALIDATE_EMAIL)) {
                return "Format email $field tidak valid";
            }
            if (str_starts_with($part, 'min:')) {
                $min = (int)explode(':', $part, 2)[1];
                if (isset($data[$field]) && strlen((string)$data[$field]) < $min) return "Kolom $field minimal $min karakter";
            }
            if ($part === 'numeric' && isset($data[$field]) && !is_numeric($data[$field])) {
                return "Kolom $field harus berupa angka";
            }
        }
    }
    return null;
}

final class ApiAuth {
    private const ACCESS_TOKEN_TTL = 1800; // 30 menit
    private ?array $user = null;
    private ?string $token = null;

    public function authenticate(): ?array {
        $header = trim((string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? ''));
        if (!preg_match('/^Bearer[[:space:]]+([A-Za-z0-9]{40,160})$/D', $header, $match)) return null;
        $token = $match[1];
        $this->token = $token;

        $row = DB::one(
            'SELECT t.*, u.id AS user_id, u.nama, u.email, u.role, u.nip, u.jabatan, u.is_active
             FROM kka_api_tokens t
             JOIN kka_users u ON u.id = t.user_id
             WHERE t.token = ? LIMIT 1',
            [$token]
        );
        if (!$row || !(bool)$row['is_active']) return null;
        if ($row['expires_at'] !== null && strtotime((string)$row['expires_at']) <= time()) {
            DB::delete('kka_api_tokens', ['id' => (int)$row['id']]);
            return null;
        }

        // Tidak mencatat token mentah. Hanya waktu pemakaian dan ID record yang diperbarui.
        DB::update('kka_api_tokens', ['last_used_at' => date('Y-m-d H:i:s')], ['id' => (int)$row['id']]);
        $this->user = [
            'id' => (int)$row['user_id'],
            'nama' => $row['nama'],
            'email' => $row['email'],
            'role' => $row['role'],
            'nip' => $row['nip'],
            'jabatan' => $row['jabatan'],
            'is_active' => true,
        ];
        return $this->user;
    }

    public function user(): ?array { return $this->user; }
    public function id(): ?int { return $this->user['id'] ?? null; }
    public function isAdmin(): bool { return ($this->user['role'] ?? '') === 'admin'; }
    public function token(): ?string { return $this->token; }
    public function require(): array { if (!$this->user) api_response(401, false, 'Autentikasi diperlukan. Silakan login.'); return $this->user; }
    public function requireAdmin(): void { $this->require(); if (!$this->isAdmin()) api_response(403, false, 'Akses ditolak. Hanya Administrator.'); }

    public function createToken(int $userId, string $deviceName = 'mobile'): string {
        $token = bin2hex(random_bytes(40));
        DB::insert('kka_api_tokens', [
            'user_id' => $userId,
            'token' => $token,
            'device_name' => substr(trim($deviceName) ?: 'mobile', 0, 100),
            'expires_at' => date('Y-m-d H:i:s', time() + self::ACCESS_TOKEN_TTL),
        ]);
        return $token;
    }

    public function tokenExpiresAt(): string { return date('Y-m-d H:i:s', time() + self::ACCESS_TOKEN_TTL); }
    public function revokeToken(string $token): void { if ($token !== '') DB::delete('kka_api_tokens', ['token' => $token]); }
    public function revokeAllTokens(int $userId): void { DB::delete('kka_api_tokens', ['user_id' => $userId]); }

    public function attempt(string $email, string $password, string $deviceName = 'mobile'): ?array {
        $u = DB::one('SELECT * FROM kka_users WHERE email = ? LIMIT 1', [strtolower(trim($email))]);
        if (!$u || !(bool)$u['is_active'] || !password_verify($password, (string)$u['password_hash'])) return null;
        $token = $this->createToken((int)$u['id'], $deviceName);
        return [
            'token' => $token,
            'user' => [
                'id' => (int)$u['id'], 'nama' => $u['nama'], 'email' => $u['email'],
                'role' => $u['role'], 'nip' => $u['nip'], 'jabatan' => $u['jabatan'],
            ],
            'expires_at' => $this->tokenExpiresAt(),
        ];
    }
}

$apiAuth = new ApiAuth();
$apiAuth->authenticate();
$GLOBALS['apiAuth'] = $apiAuth;

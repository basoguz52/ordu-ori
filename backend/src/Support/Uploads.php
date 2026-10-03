<?php

namespace App\Support;

/**
 * Doğrulanmış dosya yükleme yardımcıları (uploads/ altına).
 * Fiziksel kök: DOCUMENT_ROOT/uploads (prod public_html/uploads, Docker backend/public/uploads).
 */
class Uploads
{
    private const IMAGE_MIME_EXT = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp',
        'image/gif'  => 'gif',
    ];

    public static function rootAbs(): string
    {
        $root = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
        if ($root === '') {
            // fallback: backend/public
            $root = dirname(__DIR__, 2) . '/public';
        }
        return $root . '/uploads';
    }

    public static function publicUrl(?string $storageKey): ?string
    {
        if (!$storageKey) return null;
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
        return $scheme . '://' . $host . '/uploads/' . ltrim($storageKey, '/');
    }

    /**
     * $_FILES[$inputName] içindeki görseli doğrular ve uploads/$relDir altına taşır.
     * @return array{storage_key:string,mime:string,size:int,original_name:string}
     * @throws ApiException
     */
    public static function storeImage(string $inputName, string $relDir, string $prefix, int $maxBytes = 5_242_880): array
    {
        if (!isset($_FILES[$inputName])) {
            throw new ApiException('validation_error', "Missing file field: {$inputName}", 422);
        }
        $f = $_FILES[$inputName];
        if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $err = is_array($f) ? (int)($f['error'] ?? -1) : -1;
            throw new ApiException('upload_error', "Upload failed (code {$err})", 422);
        }

        $tmp = (string)$f['tmp_name'];
        $size = (int)($f['size'] ?? 0);
        $original = (string)($f['name'] ?? 'image');

        if ($size <= 0) {
            throw new ApiException('validation_error', 'Empty upload', 422);
        }
        if ($size > $maxBytes) {
            throw new ApiException('validation_error', 'File too large (max ' . (int)($maxBytes / 1048576) . 'MB)', 422);
        }

        // MIME (finfo)
        $mime = null;
        if (function_exists('finfo_open')) {
            $fi = finfo_open(FILEINFO_MIME_TYPE);
            if ($fi) {
                $mime = finfo_file($fi, $tmp) ?: null;
                finfo_close($fi);
            }
        }
        if (!isset(self::IMAGE_MIME_EXT[$mime])) {
            throw new ApiException('validation_error', 'Only JPG, PNG, WEBP, GIF images are allowed', 422);
        }

        // Magic bytes
        if (!self::validImageMagic($tmp, $mime)) {
            throw new ApiException('validation_error', 'Invalid image file', 422);
        }

        $ext = self::IMAGE_MIME_EXT[$mime];
        $fileName = $prefix . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
        $storageKey = trim($relDir, '/') . '/' . $fileName;

        $destAbs = self::rootAbs() . '/' . $storageKey;
        $destDir = dirname($destAbs);
        if (!is_dir($destDir) && !@mkdir($destDir, 0755, true) && !is_dir($destDir)) {
            throw new ApiException('upload_error', 'Cannot create upload directory', 500);
        }
        if (!@move_uploaded_file($tmp, $destAbs)) {
            throw new ApiException('upload_error', 'Cannot move uploaded file', 500);
        }

        return [
            'storage_key'   => $storageKey,
            'mime'          => (string)$mime,
            'size'          => $size,
            'original_name' => $original,
        ];
    }

    public static function deleteByKey(?string $storageKey): void
    {
        if (!$storageKey) return;
        $abs = self::rootAbs() . '/' . ltrim($storageKey, '/');
        if (is_file($abs)) {
            @unlink($abs);
        }
    }

    private static function validImageMagic(string $path, string $mime): bool
    {
        $fh = @fopen($path, 'rb');
        if (!$fh) return false;
        $head = fread($fh, 12);
        fclose($fh);
        if ($head === false || strlen($head) < 4) return false;

        return match ($mime) {
            'image/jpeg' => substr($head, 0, 3) === "\xFF\xD8\xFF",
            'image/png'  => substr($head, 0, 8) === "\x89PNG\r\n\x1a\n",
            'image/gif'  => substr($head, 0, 4) === 'GIF8',
            'image/webp' => substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP',
            default      => false,
        };
    }
}

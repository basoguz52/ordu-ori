<?php

/**
 * Gizli (public'e açılmayan) dosya deposu.
 *
 * Yüklenen public dosyalar DOCUMENT_ROOT/uploads altında durur ve Apache tarafından
 * doğrudan servis edilir. SKB gibi yalnızca yöneticinin erişmesi gereken dosyalar
 * oraya konamaz; bu sınıf onlar için bir kök çözümler.
 *
 * Kök seçimi (ilk yazılabilir olan kazanır):
 *   1) PRIVATE_UPLOADS_DIR ortam değişkeni            -> mod: env
 *   2) DOCUMENT_ROOT/../private_uploads (web kökü dışı) -> mod: outside_webroot  (tercih edilen)
 *   3) DOCUMENT_ROOT/uploads/_private + deny .htaccess  -> mod: htaccess_guarded (yedek)
 *
 * Hangi modun seçildiği AdminController::storageCheck() ile panelden görülebilir.
 */
final class PrivateStorage
{
  private static ?string $root = null;
  private static string $mode = 'none';

  private const HTACCESS = <<<'TXT'
# Bu klasördeki dosyalar yalnızca PHP üzerinden (admin yetkisiyle) servis edilir.
Options -Indexes
Require all denied
<IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
</IfModule>
TXT;

  /** Seçilen kök dizin (sonunda / yok). Hiçbiri yazılamazsa null. */
  public static function root(): ?string
  {
    if (self::$root !== null) {
      return self::$root === '' ? null : self::$root;
    }

    foreach (self::candidates() as [$mode, $dir]) {
      if ($dir === '') continue;
      if (!self::ensureDir($dir)) continue;
      if (!is_writable($dir)) continue;

      if ($mode === 'htaccess_guarded') {
        self::ensureHtaccess($dir);
      }

      self::$root = rtrim($dir, '/\\');
      self::$mode = $mode;
      return self::$root;
    }

    self::$root = '';
    self::$mode = 'none';
    return null;
  }

  /** root() çağrıldıktan sonra geçerli: env | outside_webroot | htaccess_guarded | none */
  public static function mode(): string
  {
    self::root();
    return self::$mode;
  }

  /** storage_key -> mutlak yol. Kök yoksa null. */
  public static function path(string $storageKey): ?string
  {
    $root = self::root();
    if ($root === null) return null;

    $key = str_replace('\\', '/', $storageKey);
    // Dizin dışına çıkmayı engelle.
    if ($key === '' || str_contains($key, '..')) return null;

    return $root . '/' . ltrim($key, '/');
  }

  /**
   * htaccess_guarded modunda dosyanın (varsa) public URL'i — yalnızca erişilebilirlik
   * testi için. Diğer modlarda dosya web'den erişilemez, null döner.
   */
  public static function publicUrlForCheck(string $storageKey): ?string
  {
    if (self::mode() !== 'htaccess_guarded') return null;

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
    return $scheme . '://' . $host . '/uploads/_private/' . ltrim(str_replace('\\', '/', $storageKey), '/');
  }

  /** Panel için durum bilgisi. */
  public static function info(): array
  {
    $root = self::root();
    return [
      'root'     => $root,
      'mode'     => self::mode(),
      'writable' => $root !== null && is_writable($root),
    ];
  }

  /** @return array<int, array{0:string,1:string}> [mod, dizin] adayları */
  private static function candidates(): array
  {
    $docRoot = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/\\');
    if ($docRoot === '') {
      // CLI / beklenmedik durum: backend/public varsayımı
      $docRoot = dirname(__DIR__, 2) . '/public';
    }

    $fromEnv = function_exists('env') ? (string)(env('PRIVATE_UPLOADS_DIR', '') ?? '') : '';

    return [
      ['env', rtrim($fromEnv, '/\\')],
      ['outside_webroot', dirname($docRoot) . '/private_uploads'],
      ['htaccess_guarded', $docRoot . '/uploads/_private'],
    ];
  }

  private static function ensureDir(string $dir): bool
  {
    if (is_dir($dir)) return true;
    return @mkdir($dir, 0700, true) || is_dir($dir);
  }

  private static function ensureHtaccess(string $dir): void
  {
    $file = $dir . '/.htaccess';
    if (is_file($file)) return;
    @file_put_contents($file, self::HTACCESS);
  }
}

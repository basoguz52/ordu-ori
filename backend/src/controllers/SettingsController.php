<?php

/**
 * Genel uygulama ayarları (app_settings anahtar/değer).
 * Şimdilik tek grup: sonuç yükleme FTP bilgileri (results_ftp_*).
 * Tüm uçlar admin'e kapalıdır (Auth::requireAdmin).
 *
 * FTP şifresi, yarış sayfasındaki "FTP bilgileri" kartında kopyalanabilmesi için
 * düz metin döner — bu bilinçli bir tercih. Uçlar admin ile sınırlıdır; mümkünse
 * yalnızca uploads klasörüne yetkili ayrı bir FTP hesabı kullanılması önerilir.
 */
final class SettingsController
{
  /** Beyaz liste: anahtar => varsayılan değer. Bunun dışında anahtar yazılamaz. */
  private const FTP_KEYS = [
    'results_ftp_host'     => '',
    'results_ftp_port'     => '21',
    'results_ftp_user'     => '',
    'results_ftp_pass'     => '',
    'results_ftp_base_dir' => 'uploads/events',
    'results_ftp_passive'  => '1',
    'results_ftp_note'     => '',
  ];

  /** GET /api/admin/settings/ftp */
  public static function getFtp(Request $req): void
  {
    Auth::requireAdmin();
    Response::json(['item' => self::readGroup(self::FTP_KEYS)]);
  }

  /** PUT /api/admin/settings/ftp */
  public static function updateFtp(Request $req): void
  {
    Auth::requireAdmin();

    $b = $req->json ?? [];
    $pdo = Db::pdo();

    $stmt = $pdo->prepare(
      "INSERT INTO app_settings (`key`, `value`, updated_at)
       VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE `value` = VALUES(`value`), updated_at = NOW()"
    );

    foreach (self::FTP_KEYS as $key => $_default) {
      // Gövde kısa adlarla gelir (host, port...); anahtar results_ftp_host.
      $short = substr($key, strlen('results_ftp_'));
      if (!array_key_exists($short, $b)) continue; // sadece gönderilen alanlar
      $value = self::normalize($key, $b[$short]);
      $stmt->execute([$key, $value]);
    }

    Response::json(['item' => self::readGroup(self::FTP_KEYS)]);
  }

  /**
   * @param array<string,string> $keys anahtar => varsayılan
   * @return array<string,string> kısa adlarla ({ host, port, ... })
   */
  private static function readGroup(array $keys): array
  {
    $pdo = Db::pdo();
    $names = array_keys($keys);
    $in = implode(',', array_fill(0, count($names), '?'));
    $st = $pdo->prepare("SELECT `key`, `value` FROM app_settings WHERE `key` IN ($in)");
    $st->execute($names);

    $stored = [];
    foreach ($st->fetchAll() as $r) {
      $stored[(string)$r['key']] = (string)($r['value'] ?? '');
    }

    $out = [];
    foreach ($keys as $key => $default) {
      $val = $stored[$key] ?? $default;
      // results_ftp_host -> host
      $short = substr($key, strlen('results_ftp_'));
      $out[$short] = $val;
    }
    return $out;
  }

  private static function normalize(string $key, $raw): string
  {
    $v = is_scalar($raw) ? trim((string)$raw) : '';

    if ($key === 'results_ftp_base_dir') {
      // Baştaki/sondaki eğik çizgileri temizle: "/uploads/events/" -> "uploads/events"
      $v = trim($v, "/ \t");
    }
    if ($key === 'results_ftp_passive') {
      $v = ($v === '1' || strtolower($v) === 'true') ? '1' : '0';
    }
    if ($key === 'results_ftp_port') {
      $v = (string)(int)$v;
      if ($v === '0') $v = '21';
    }
    return $v;
  }
}

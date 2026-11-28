<?php
// /public_html/api/results.php
// OE2010 HTML/PDF sonuç dosyalarını sunar (kodlama düzeltmesi + güvenlik/önbellek başlıkları).
//
//  - Canlı/ara : ?source=live|intermediate   (uploads/yaris/canli_sonuclar.html | ara_sonuclar.html)
//  - Yarış     : ?key=00012&type=official|splits|overall   (uploads/events/<key>/results/)
//  - Probe     : ?key=00012&probe=1   (hangi dosyaların var olduğunu JSON döner)
//
// Notlar:
//  - Yüklenen HTML ana alan adında sunulduğu için CSP `sandbox` ile script çalıştırılmaz.
//  - ETag/Last-Modified ile 304 döner; çok sayıda ziyaretçi aynı dosyayı yenilerken disk/CPU yükü azalır.
//  - Dosya FTP ile yazılırken okunmasın diye canlı dosyanın boyutu kısa süre sabitlenene kadar beklenir.

declare(strict_types=1);

const RESULTS_LIVE_MAX_AGE   = 10;  // sn — canlı/ara sonuç tarayıcı önbelleği
const RESULTS_EVENT_MAX_AGE  = 0;   // sn — yarış dosyaları: her seferinde ETag ile doğrula
const RESULTS_SETTLE_SECONDS = 3;   // dosya bu süreden yeniyse yazılıyor olabilir

// ---------- Yardımcılar ----------

function send_error(int $code, string $msg): void {
  http_response_code($code);
  header('Content-Type: text/plain; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  echo $msg;
  exit;
}

function normalize_encoding_to_utf8(string $html): string {
  // BOM'u at.
  if (strncmp($html, "\xEF\xBB\xBF", 3) === 0) $html = substr($html, 3);

  // Windows-1254 hemen her baytı kabul ettiği için "tespit" yerine önce UTF-8 geçerli mi diye bak.
  if (!mb_check_encoding($html, 'UTF-8')) {
    $html = mb_convert_encoding($html, 'UTF-8', 'Windows-1254');
  }

  // charset bildiren tüm <meta> etiketlerini (öznitelik sırasından bağımsız) UTF-8'e çevir.
  $html = preg_replace('~<meta\b[^>]*charset\s*=[^>]*>~i', '<meta charset="utf-8">', $html) ?? $html;

  if (stripos($html, '<head') === false) {
    $html = '<head><meta charset="utf-8"></head>' . $html;
  } elseif (stripos($html, '<meta charset') === false) {
    $html = preg_replace('~<head[^>]*>~i', '$0<meta charset="utf-8">', $html, 1) ?? $html;
  }

  return $html;
}

/** Dosyanın uploads altında kaldığını (symlink/.. kaçışı olmadığını) doğrular. */
function path_inside(string $path, string $baseDir): bool {
  $real = realpath($path);
  if ($real === false) return false;
  $base = rtrim($baseDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
  return strncmp($real, $base, strlen($base)) === 0;
}

/** FTP ile yazılmakta olan dosyayı yarım okumamak için boyut sabitlenene kadar kısa bekle. */
function wait_until_settled(string $path): void {
  for ($i = 0; $i < 4; $i++) {
    clearstatcache(true, $path);
    $mtime = @filemtime($path);
    if ($mtime === false || (time() - $mtime) >= RESULTS_SETTLE_SECONDS) return;
    $size = @filesize($path);
    usleep(400000);
    clearstatcache(true, $path);
    if (@filesize($path) === $size) return;
  }
}

/**
 * Dosyayı sun. 304 kontrolü, ETag/Last-Modified, HTML için CSP, PDF için inline gösterim.
 * Çağrıdan sonra çıkar.
 */
function serve_file(string $path, string $ext, int $maxAge, bool $settle): void {
  if ($settle) wait_until_settled($path);

  clearstatcache(true, $path);
  $mtime = filemtime($path);
  $size  = filesize($path);
  if ($mtime === false || $size === false) send_error(500, 'read_error');

  $etag = '"' . dechex($mtime) . '-' . dechex($size) . '"';
  header('ETag: ' . $etag);
  header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
  header('Cache-Control: public, max-age=' . $maxAge . ', must-revalidate');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: no-referrer');

  $inm = $_SERVER['HTTP_IF_NONE_MATCH'] ?? '';
  $ims = $_SERVER['HTTP_IF_MODIFIED_SINCE'] ?? '';
  if (($inm !== '' && trim($inm) === $etag) ||
      ($inm === '' && $ims !== '' && strtotime($ims) !== false && strtotime($ims) >= $mtime)) {
    http_response_code(304);
    exit;
  }

  $head = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD';

  if ($ext === 'pdf') {
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="sonuclar.pdf"');
    header('Content-Length: ' . $size);
    if (!$head) readfile($path);
    exit;
  }

  $html = file_get_contents($path);
  if ($html === false) send_error(500, 'read_error');
  $html = normalize_encoding_to_utf8($html);

  header('Content-Type: text/html; charset=utf-8');
  // Yüklenen HTML'de script çalışmasın (ana alan adında sunuluyor): sandbox + yalnızca satır içi stil.
  header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; font-src data:; sandbox");
  header('Content-Length: ' . strlen($html));
  if (!$head) echo $html;
  exit;
}

// ---------- Yalnızca GET / HEAD ----------
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET' && $method !== 'HEAD') {
  header('Allow: GET, HEAD');
  send_error(405, 'method_not_allowed');
}

$uploadsDir = realpath(__DIR__ . '/../uploads');
if ($uploadsDir === false) send_error(500, 'uploads_dir_not_found');

// ---------- Canlı / ara sonuç ----------
$source = (string)($_GET['source'] ?? '');
if ($source !== '') {
  $map = [
    'intermediate' => 'ara_sonuclar.html',
    'live'         => 'canli_sonuclar.html',
  ];
  if (!isset($map[$source])) send_error(400, 'invalid_source');

  $yarisDir = realpath($uploadsDir . '/yaris');
  if ($yarisDir === false) send_error(500, 'yaris_dir_not_found');

  $filePath = $yarisDir . DIRECTORY_SEPARATOR . $map[$source];
  if (!is_readable($filePath) || !path_inside($filePath, $uploadsDir)) send_error(404, 'file_not_found');

  serve_file($filePath, 'html', RESULTS_LIVE_MAX_AGE, true);
}

// ---------- Yarış bazlı ----------
$key   = (string)($_GET['key'] ?? '');
$type  = (string)($_GET['type'] ?? '');
$probe = ($_GET['probe'] ?? '') !== '';

if ($key === '') send_error(400, 'missing_key');

// folder_key: rakam, harf, tire, alt çizgi.
if (!preg_match('/^[0-9A-Za-z_-]{1,80}$/', $key)) send_error(400, 'invalid_key');

$baseEventsDir = realpath($uploadsDir . '/events');
if ($baseEventsDir === false) send_error(500, 'events_upload_dir_not_found');

$resultsDir = $baseEventsDir . DIRECTORY_SEPARATOR . $key . DIRECTORY_SEPARATOR . 'results';

// Standart dosya adları (FTP/panel buraya bırakır). Önce HTML, sonra PDF.
$files = [
  'official' => ['official.html', 'official.pdf'],
  'splits'   => ['splits.html', 'splits.pdf'],
  'overall'  => ['overall.html', 'overall.pdf'],
];

/** İlk okunabilir adayı döner: [yol, uzantı] ya da null. */
function find_result_file(string $dir, array $candidates, string $baseDir): ?array {
  foreach ($candidates as $fn) {
    $p = $dir . DIRECTORY_SEPARATOR . $fn;
    if (is_readable($p) && path_inside($p, $baseDir)) {
      return [$p, strtolower(pathinfo($p, PATHINFO_EXTENSION))];
    }
  }
  return null;
}

if ($probe) {
  // Yalnızca var/yok bilgisi; herkese açık, kişisel veri içermez.
  header('Access-Control-Allow-Origin: *');
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  $out = ['key' => $key, 'official' => false, 'splits' => false, 'overall' => false];
  foreach ($files as $k => $candidates) {
    $out[$k] = find_result_file($resultsDir, $candidates, $baseEventsDir) !== null;
  }
  echo json_encode($out);
  exit;
}

if ($type === '' || !isset($files[$type])) send_error(400, 'invalid_type');

$found = find_result_file($resultsDir, $files[$type], $baseEventsDir);
if ($found === null) send_error(404, 'file_not_found');

serve_file($found[0], $found[1], RESULTS_EVENT_MAX_AGE, false);

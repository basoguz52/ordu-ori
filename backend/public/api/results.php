<?php
// /public_html/api/results.php
// Serves OE/HTML results files with encoding fix.
// Supports:
//  - Legacy: ?source=live|intermediate (reads global files)
//  - Event-based: ?key=00012&type=official|splits|overall
//  - Probe: ?key=00012&probe=1 (returns JSON availability)

declare(strict_types=1);

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header("Access-Control-Allow-Origin: *");

function send_error(int $code, string $msg): void {
  http_response_code($code);
  echo $msg;
  exit;
}

function normalize_encoding_to_utf8(string $html): string {
  $enc = mb_detect_encoding($html, ['UTF-8', 'Windows-1254', 'ISO-8859-9'], true);
  if ($enc === false) $enc = 'Windows-1254';
  if (strtoupper($enc) !== 'UTF-8') {
    $html = mb_convert_encoding($html, 'UTF-8', $enc);
  }

  // Fix meta charset if present (helps browser render correctly)
  $html = preg_replace('~<meta\s+charset=["\']?[^"\'>\s]+["\']?\s*/?>~i', '<meta charset="utf-8">', $html);
  $html = preg_replace('~<meta\s+http-equiv=["\']Content-Type["\']\s+content=["\'][^"\']*charset=[^"\']*["\']\s*/?>~i', '<meta charset="utf-8">', $html);

  if (stripos($html, '<head') === false) {
    $html = '<head><meta charset="utf-8"></head>' . $html;
  } elseif (stripos($html, 'meta charset') === false) {
    $html = preg_replace('~<head[^>]*>~i', '$0<meta charset="utf-8">', $html, 1);
  }

  return $html;
}

// ---------- Legacy (global) mode ----------
$source = $_GET['source'] ?? '';
if ($source !== '') {
  $map = [
    'intermediate' => 'ara_sonuclar.html',
    'live'         => 'canli_sonuclar.html',
  ];
  if (!isset($map[$source])) send_error(400, 'invalid_source');

  // Preferred new location
  $legacyDir = realpath(__DIR__ . '/../uploads/yaris');
  // Backward-compatible fallback (your old hardcoded path)
  if ($legacyDir === false) {
    $legacyDir = realpath(__DIR__ . '/../../orduoryantiring.com.tr/yaris');
  }
  if ($legacyDir === false) send_error(500, 'yaris_dir_not_found');

  $filePath = $legacyDir . DIRECTORY_SEPARATOR . $map[$source];
  if (!is_readable($filePath)) send_error(404, 'file_not_found');

  $html = file_get_contents($filePath);
  if ($html === false) send_error(500, 'read_error');

  $html = normalize_encoding_to_utf8($html);
  header('Content-Type: text/html; charset=utf-8');
  echo $html;
  exit;
}

// ---------- Event-based mode ----------
$key = (string)($_GET['key'] ?? '');
$type = (string)($_GET['type'] ?? '');
$probe = ($_GET['probe'] ?? '') !== '';

if ($key === '') send_error(400, 'missing_key');

// folder_key validation: allow digits + dash + underscore
if (!preg_match('/^[0-9A-Za-z_-]{1,80}$/', $key)) {
  send_error(400, 'invalid_key');
}

$baseEventsDir = realpath(__DIR__ . '/../uploads/events');
if ($baseEventsDir === false) send_error(500, 'events_upload_dir_not_found');

$eventDir = $baseEventsDir . DIRECTORY_SEPARATOR . $key;
$resultsDir = $eventDir . DIRECTORY_SEPARATOR . 'results';

// Standard filenames (FTP will drop them here)
$files = [
  'official' => ['official.html', 'official.pdf'],
  'splits'   => ['splits.html', 'splits.pdf'],
  'overall'  => ['overall.html', 'overall.pdf'],
];

if ($probe) {
  header('Content-Type: application/json; charset=utf-8');
  $out = [
    'key' => $key,
    'official' => false,
    'splits' => false,
    'overall' => false,
  ];

  foreach ($files as $k => $candidates) {
    foreach ($candidates as $fn) {
      $p = $resultsDir . DIRECTORY_SEPARATOR . $fn;
      if (is_readable($p)) { $out[$k] = true; break; }
    }
  }

  echo json_encode($out);
  exit;
}

if ($type === '' || !isset($files[$type])) send_error(400, 'invalid_type');

$selectedPath = null;
$selectedExt = null;
foreach ($files[$type] as $fn) {
  $p = $resultsDir . DIRECTORY_SEPARATOR . $fn;
  if (is_readable($p)) {
    $selectedPath = $p;
    $selectedExt = strtolower(pathinfo($p, PATHINFO_EXTENSION));
    break;
  }
}

if ($selectedPath === null) send_error(404, 'file_not_found');

if ($selectedExt === 'pdf') {
  header('Content-Type: application/pdf');
  header('X-Content-Type-Options: nosniff');
  readfile($selectedPath);
  exit;
}

// default: html
$html = file_get_contents($selectedPath);
if ($html === false) send_error(500, 'read_error');

$html = normalize_encoding_to_utf8($html);
header('Content-Type: text/html; charset=utf-8');
echo $html;

<?php

use App\Services\ResultImportService;
use App\Support\ApiException;

/**
 * Puanlı sonuçlar.
 *  - Public: GET /api/events/{id}/results → kategori bazında gün gün süre/durum/puan + toplam.
 *  - Admin : OE2010 CSV'sini gün bazında içe aktarma (panelden yükleme ya da FTP gelen kutusu).
 */
final class ResultController
{
  private const MAX_STAGES = 9;

  /** GET /api/events/{id}/results (public) */
  public static function listForEvent(Request $req, array $params): void
  {
    $eventId = (int)($params['id'] ?? 0);
    $pdo = Db::pdo();

    $st = $pdo->prepare("SELECT id FROM events WHERE id = ?");
    $st->execute([$eventId]);
    if (!$st->fetch()) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }

    $st = $pdo->prepare("
      SELECT r.stage_no, r.athlete_id, r.category_code, r.first_name, r.last_name, r.club_name,
             r.time_ms, r.status, r.position, r.points,
             c.id AS category_order, c.name AS category_name
      FROM event_results r
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE r.event_id = ? AND r.category_code IS NOT NULL
      ORDER BY r.stage_no
    ");
    $st->execute([$eventId]);

    $stages = [];
    $cats = [];
    foreach ($st->fetchAll() as $r) {
      $stage = (int)$r['stage_no'];
      $stages[$stage] = true;
      $code = (string)$r['category_code'];

      if (!isset($cats[$code])) {
        $cats[$code] = [
          'code'    => $code,
          'name'    => $r['category_name'] ?? $code,
          'order'   => $r['category_order'] !== null ? (int)$r['category_order'] : PHP_INT_MAX,
          'entries' => [],
        ];
      }

      // Aynı kişiyi günler arasında birleştir: eşleşmişse sporcu id'si, değilse ad.
      $name = trim($r['first_name'] . ' ' . $r['last_name']);
      $key = $r['athlete_id'] !== null
        ? 'a' . $r['athlete_id']
        : 'n' . mb_strtolower($name, 'UTF-8');

      $entry = &$cats[$code]['entries'][$key];
      $entry ??= ['name' => $name, 'club_name' => $r['club_name'], 'total' => 0, 'results' => []];
      $entry['club_name'] = $r['club_name']; // en son günün kulübü
      $entry['total'] += (int)$r['points'];
      $entry['results'][(string)$stage] = [
        'time_sec' => $r['time_ms'] !== null ? intdiv((int)$r['time_ms'], 1000) : null,
        'status'   => $r['status'],
        'position' => $r['position'] !== null ? (int)$r['position'] : null,
        'points'   => (int)$r['points'],
      ];
      unset($entry);
    }

    $stageList = array_keys($stages);
    sort($stageList);

    Response::json([
      'event_id'   => $eventId,
      'stages'     => $stageList,
      'categories' => self::rankCategories($cats),
    ]);
  }

  /**
   * GET /api/season-standings?season=2025 (public)
   * "Sezon puanına dahil" işaretli yarışların her günü ayrı sütun; kategori bazında
   * sporcuların tüm sonuçları tek tabloda. season verilmezse en son sezon.
   */
  public static function seasonStandings(Request $req): void
  {
    $rows = Db::pdo()->query("
      SELECT e.id AS event_id, e.name AS event_name, e.start_date,
             COALESCE(e.season_start_year,
                      IF(MONTH(e.start_date) >= 9, YEAR(e.start_date), YEAR(e.start_date) - 1)) AS season,
             r.stage_no, r.athlete_id, r.category_code, r.first_name, r.last_name, r.club_name,
             r.status, r.points,
             c.id AS category_order, c.name AS category_name
      FROM event_results r
      JOIN events e ON e.id = r.event_id
      LEFT JOIN categories c ON c.id = r.category_id
      WHERE e.counts_for_season = 1 AND r.category_code IS NOT NULL
      ORDER BY e.start_date, e.id, r.stage_no
    ")->fetchAll();

    $seasons = array_values(array_unique(array_map(fn($r) => (int)$r['season'], $rows)));
    rsort($seasons);
    $season = isset($req->query['season']) ? (int)$req->query['season'] : ($seasons[0] ?? 0);

    // Önce yarış-günlerini topla (gün sayısı etiket için gerekli).
    $stagesPerEvent = [];
    foreach ($rows as $r) {
      if ((int)$r['season'] !== $season) continue;
      $stagesPerEvent[(int)$r['event_id']][(int)$r['stage_no']] = true;
    }

    $races = [];
    $cats = [];
    foreach ($rows as $r) {
      if ((int)$r['season'] !== $season) continue;

      $eventId = (int)$r['event_id'];
      $stage = (int)$r['stage_no'];
      $raceKey = $eventId . '-' . $stage;
      if (!isset($races[$raceKey])) {
        $multi = count($stagesPerEvent[$eventId]) > 1;
        $races[$raceKey] = [
          'key'        => $raceKey,
          'event_id'   => $eventId,
          'stage_no'   => $stage,
          'event_name' => $r['event_name'],
          'label'      => $r['event_name'] . ($multi ? " · {$stage}. Gün" : ''),
          'date'       => date('Y-m-d', strtotime($r['start_date'] . ' +' . ($stage - 1) . ' day')),
        ];
      }

      $code = (string)$r['category_code'];
      $cats[$code] ??= [
        'code'    => $code,
        'name'    => $r['category_name'] ?? $code,
        'order'   => $r['category_order'] !== null ? (int)$r['category_order'] : PHP_INT_MAX,
        'entries' => [],
      ];

      // Kişi: eşleşmişse sporcu id'si, değilse ad + kulüp (yarışlar arası birleştirme).
      $name = trim($r['first_name'] . ' ' . $r['last_name']);
      $key = $r['athlete_id'] !== null
        ? 'a' . $r['athlete_id']
        : 'n' . mb_strtolower($name . '|' . $r['club_name'], 'UTF-8');

      $entry = &$cats[$code]['entries'][$key];
      $entry ??= ['name' => $name, 'club_name' => $r['club_name'], 'total' => 0, 'results' => []];
      $entry['club_name'] = $r['club_name'];
      $entry['total'] += (int)$r['points'];
      $entry['results'][$raceKey] = ['status' => $r['status'], 'points' => (int)$r['points']];
      unset($entry);
    }

    Response::json([
      'season'     => $season,
      'seasons'    => $seasons,
      'races'      => array_values($races),
      'categories' => self::rankCategories($cats),
    ]);
  }

  /**
   * Kategorileri sırala, her kategoride sporcuları toplam puana göre diz ve sıra ver.
   * Eşit toplam aynı sırayı alır; 0 puan sıralanmaz.
   */
  private static function rankCategories(array $cats): array
  {
    usort($cats, fn($a, $b) => [$a['order'], $a['code']] <=> [$b['order'], $b['code']]);

    $out = [];
    foreach ($cats as $cat) {
      $entries = array_values($cat['entries']);
      usort($entries, fn($a, $b) => [$b['total'], $a['name']] <=> [$a['total'], $b['name']]);

      $prevTotal = null;
      $prevRank = 0;
      foreach ($entries as $i => &$e) {
        if ($e['total'] <= 0) {
          $e['rank'] = null;
          continue;
        }
        $e['rank'] = $e['total'] === $prevTotal ? $prevRank : $i + 1;
        $prevTotal = $e['total'];
        $prevRank = $e['rank'];
      }
      unset($e);

      $out[] = ['code' => $cat['code'], 'name' => $cat['name'], 'entries' => $entries];
    }
    return $out;
  }

  /* ------------------------------ Admin ------------------------------ */

  /** GET /api/admin/events/{id}/scoring — günler: son içe aktarma + gelen kutusundaki dosya. */
  public static function adminStatus(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $ev = self::eventOrFail((int)($params['id'] ?? 0));
    if ($ev === null) return;

    $pdo = Db::pdo();
    $st = $pdo->prepare("
      SELECT stage_no, source, original_name, file_sha1, rows_total, rows_matched,
             unmatched_json, created_at
      FROM event_result_imports WHERE event_id = ?
    ");
    $st->execute([$ev['id']]);
    $imports = [];
    foreach ($st->fetchAll() as $row) {
      $imports[(int)$row['stage_no']] = $row;
    }

    // Gelen kutusu: gun<N>.csv dosyaları; tanınmayan dosyalar ayrıca listelenir.
    $inbox = [];
    $otherFiles = [];
    $dir = PrivateStorage::path(ResultImportService::INBOX_DIR . '/' . $ev['folder_key']);
    if ($dir !== null && is_dir($dir)) {
      foreach (scandir($dir) ?: [] as $name) {
        if ($name === '.' || $name === '..' || !is_file("$dir/$name")) continue;
        if (preg_match('/^gun([1-9])\.csv$/i', $name, $m)) {
          $inbox[(int)$m[1]] = "$dir/$name";
        } else {
          $otherFiles[] = $name;
        }
      }
    }

    $count = max(
      self::stageCount($ev),
      $imports ? max(array_keys($imports)) : 0,
      $inbox ? max(array_keys($inbox)) : 0
    );

    $stages = [];
    for ($n = 1; $n <= $count; $n++) {
      $imp = $imports[$n] ?? null;
      $file = $inbox[$n] ?? null;
      $stages[] = [
        'stage_no' => $n,
        'import'   => $imp ? [
          'source'        => $imp['source'],
          'original_name' => $imp['original_name'],
          'rows_total'    => (int)$imp['rows_total'],
          'rows_matched'  => (int)$imp['rows_matched'],
          'unmatched'     => json_decode((string)($imp['unmatched_json'] ?? '[]'), true) ?: [],
          'imported_at'   => $imp['created_at'],
        ] : null,
        'inbox'    => $file ? [
          'name'        => basename($file),
          'size_bytes'  => (int)filesize($file),
          // Saat dilimli ISO: PHP'nin varsayılan dilimi (çoğu zaman UTC) tarayıcıda yerele çevrilir.
          'modified_at' => date('c', (int)filemtime($file)),
          // İçe aktarılandan farklı (yeni) bir dosya mı?
          'is_new'      => !$imp || sha1_file($file) !== $imp['file_sha1'],
        ] : null,
      ];
    }

    Response::json([
      'event_id'    => (int)$ev['id'],
      'folder_key'  => $ev['folder_key'],
      'stages'      => $stages,
      'other_files' => $otherFiles,
    ]);
  }

  /** POST /api/admin/events/{id}/scoring/{stage}/upload — alan adı: csv */
  public static function adminUpload(Request $req, array $params): void
  {
    $user = Auth::requireAdmin();
    $ev = self::eventOrFail((int)($params['id'] ?? 0));
    if ($ev === null) return;
    $stage = self::stageOrFail($params);
    if ($stage === null) return;

    $f = $_FILES['csv'] ?? null;
    if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file((string)$f['tmp_name'])) {
      Response::error('upload_error', 'CSV dosyası yüklenemedi.', 422);
      return;
    }
    $origName = (string)($f['name'] ?? 'sonuc.csv');
    if (strtolower((string)pathinfo($origName, PATHINFO_EXTENSION)) !== 'csv') {
      Response::error('validation_error', 'Yalnızca .csv dosyası yüklenebilir.', 422);
      return;
    }
    if ((int)$f['size'] > ResultImportService::MAX_BYTES) {
      Response::error('validation_error', 'Dosya çok büyük (en fazla 5 MB).', 422);
      return;
    }

    // Önce okunabilir mi bak; bozuk dosya gelen kutusundaki eskisinin yerine geçmesin.
    try {
      ResultImportService::parseCsv((string)file_get_contents((string)$f['tmp_name']));
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
      return;
    }

    $dest = PrivateStorage::path(ResultImportService::inboxKey($ev['folder_key'], $stage));
    if ($dest === null) {
      Response::error('private_storage_unavailable', 'Gizli depolama klasörü yazılamıyor.', 500);
      return;
    }
    $dir = dirname($dest);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
      Response::error('upload_error', 'Klasör oluşturulamadı.', 500);
      return;
    }
    if (!@move_uploaded_file((string)$f['tmp_name'], $dest)) {
      Response::error('upload_error', 'Dosya taşınamadı.', 500);
      return;
    }
    @chmod($dest, 0600);

    self::runImport((int)$ev['id'], $stage, $dest, 'upload', $origName, (int)$user->id);
  }

  /** POST /api/admin/events/{id}/scoring/{stage}/import — FTP ile gelen dosyayı içe aktar. */
  public static function adminImportInbox(Request $req, array $params): void
  {
    $user = Auth::requireAdmin();
    $ev = self::eventOrFail((int)($params['id'] ?? 0));
    if ($ev === null) return;
    $stage = self::stageOrFail($params);
    if ($stage === null) return;

    $path = PrivateStorage::path(ResultImportService::inboxKey($ev['folder_key'], $stage));
    if ($path === null || !is_file($path)) {
      Response::error('not_found', "Gelen kutusunda gun{$stage}.csv yok.", 404);
      return;
    }

    self::runImport((int)$ev['id'], $stage, $path, 'ftp', basename($path), (int)$user->id);
  }

  /** DELETE /api/admin/events/{id}/scoring/{stage} — o günün sonuçları + CSV silinir. */
  public static function adminDeleteStage(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $ev = self::eventOrFail((int)($params['id'] ?? 0));
    if ($ev === null) return;
    $stage = self::stageOrFail($params);
    if ($stage === null) return;

    $pdo = Db::pdo();
    $pdo->prepare("DELETE FROM event_results WHERE event_id = ? AND stage_no = ?")->execute([$ev['id'], $stage]);
    $pdo->prepare("DELETE FROM event_result_imports WHERE event_id = ? AND stage_no = ?")->execute([$ev['id'], $stage]);

    $path = PrivateStorage::path(ResultImportService::inboxKey($ev['folder_key'], $stage));
    if ($path !== null && is_file($path)) {
      @unlink($path);
    }

    Response::noContent(204);
  }

  private static function runImport(int $eventId, int $stage, string $path, string $source, string $name, int $userId): void
  {
    try {
      $summary = ResultImportService::import($eventId, $stage, $path, $source, $name, $userId);
      Response::json($summary);
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
    }
  }

  /** @return array{id:int,folder_key:string,start_date:string,end_date:string}|null */
  private static function eventOrFail(int $eventId): ?array
  {
    $pdo = Db::pdo();
    $st = $pdo->prepare("SELECT id, folder_key, start_date, end_date FROM events WHERE id = ?");
    $st->execute([$eventId]);
    $ev = $st->fetch();
    if (!$ev) {
      Response::error('event_not_found', 'Event not found', 404);
      return null;
    }

    // folder_key = LPAD(id,5,'0') (EventController ile aynı kural)
    if ((string)($ev['folder_key'] ?? '') === '') {
      $ev['folder_key'] = str_pad((string)$eventId, 5, '0', STR_PAD_LEFT);
      $pdo->prepare("UPDATE events SET folder_key = ? WHERE id = ?")->execute([$ev['folder_key'], $eventId]);
    }
    $ev['id'] = (int)$ev['id'];
    return $ev;
  }

  private static function stageOrFail(array $params): ?int
  {
    $stage = (int)($params['stage'] ?? 0);
    if ($stage < 1 || $stage > self::MAX_STAGES) {
      Response::error('validation_error', 'Geçersiz gün numarası.', 422);
      return null;
    }
    return $stage;
  }

  /** Yarışın gün sayısı (başlangıç–bitiş, en az 1). */
  private static function stageCount(array $ev): int
  {
    $start = strtotime((string)$ev['start_date']);
    $end = strtotime((string)$ev['end_date']);
    if (!$start || !$end || $end < $start) return 1;
    return min(self::MAX_STAGES, intdiv($end - $start, 86400) + 1);
  }
}

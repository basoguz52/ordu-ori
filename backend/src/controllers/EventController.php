<?php

/**
 * EventController (step-3: event_files + uploads/events/{folder_key}/...)
 *
 * This file is intended as a drop-in replacement for your existing EventController.php.
 *
 * What it adds:
 * - Writes/reads bulletin/oncikis/kesincikis files via event_files table
 * - Stores uploads under: /public_html/uploads/events/{folder_key}/...
 * - Returns bulletin_url / oncikis_url / kesincikis_url on list/get
 * - Ensures folder_key is set on create (LPAD(id,5,'0'))
 * - Computes season_start_year/season_end_year from start_date using season start month=9
 */

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\EventResult;

final class EventController
{
  /** list/get sözleşmesindeki kolonlar (sıralama ve tipler korunur). */
  private const EVENT_COLUMNS = [
    'id', 'name', 'description', 'type', 'start_date', 'end_date', 'location',
    'is_registration_open', 'registration_start_at', 'registration_end_at',
    'bulletin_path', 'oncikis_path', 'kesincikis_path',
    'slug', 'folder_key', 'season_start_year', 'season_end_year',
  ];

  // --- Public API: list/get/create/update/delete ---------------------------------

  public static function list(Request $req): void
  {
    $q = trim((string)($req->query['q'] ?? ''));

    $query = Event::query()
      ->select(self::EVENT_COLUMNS)
      ->orderByDesc('start_date')
      ->orderByDesc('id');

    if ($q !== '') {
      $like = '%' . $q . '%';
      $query->where(function ($w) use ($like) {
        $w->where('name', 'like', $like)
          ->orWhere('location', 'like', $like)
          ->orWhere('type', 'like', $like);
      });
    }

    // getAttributes(): ham DB değerleri (tarih string, tinyint int) — eski sözleşme birebir.
    $items = $query->get()->map(fn(Event $e) => $e->getAttributes())->all();
    self::attachFileUrls($items);

    Response::json(['items' => $items]);
  }

  public static function get(Request $req, array $params): void
  {
    $id = (int)$params['id'];

    $e = Event::query()->select(self::EVENT_COLUMNS)->find($id);
    if (!$e) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }

    $items = [$e->getAttributes()];
    self::attachFileUrls($items);

    Response::json(['item' => $items[0]]);
  }

  public static function create(Request $req): void
  {
    Auth::requireAdmin();

    $b = $req->json ?? [];

    $name = trim((string)($b['name'] ?? ''));
    $location = trim((string)($b['location'] ?? ''));
    $start = (string)($b['start_date'] ?? '');
    $end = (string)($b['end_date'] ?? '');

    $description = isset($b['description']) ? trim((string)$b['description']) : null;
    $type = isset($b['type']) ? trim((string)$b['type']) : null;

    $isOpen = array_key_exists('is_registration_open', $b) ? ((int)$b['is_registration_open'] ? 1 : 0) : 1;

    $regStart = array_key_exists('registration_start_at', $b) ? self::parseDatetimeLocal($b['registration_start_at']) : null;
    $regEnd   = array_key_exists('registration_end_at', $b) ? self::parseDatetimeLocal($b['registration_end_at']) : null;

    if ($name === '' || $location === '' || $start === '' || $end === '') {
      Response::error('validation_error', 'name, location, start_date, end_date required', 422);
      return;
    }

    if ($regStart && $regEnd && strcmp($regStart, $regEnd) > 0) {
      Response::error('validation_error', 'registration_start_at must be <= registration_end_at', 422);
      return;
    }

    // season computation (season start month = 9)
    [$ssy, $sey] = self::computeSeasonYears($start, 9);

    $e = new Event();
    $e->name                  = $name;
    $e->description           = ($description === '' ? null : $description);
    $e->type                  = ($type === '' ? null : $type);
    $e->start_date            = $start;
    $e->end_date              = $end;
    $e->location              = $location;
    $e->is_registration_open  = $isOpen;
    $e->registration_start_at = $regStart;
    $e->registration_end_at   = $regEnd;
    $e->slug                  = null;
    $e->season_start_year     = $ssy;
    $e->season_end_year       = $sey;
    $e->save();

    // folder_key = LPAD(id,5,'0')
    $e->folder_key = str_pad((string)$e->id, 5, '0', STR_PAD_LEFT);
    $e->save();

    Response::json(['id' => (int)$e->id, 'folder_key' => $e->folder_key], 201);
  }

  public static function update(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $id = (int)($params['id'] ?? 0);
    if ($id <= 0) {
      Response::error('validation_error', 'Invalid id', 422);
      return;
    }

    $b = $req->json ?? null;
    if (!is_array($b)) {
      Response::error('validation_error', 'Invalid JSON body', 422);
      return;
    }

    $e = Event::find($id);
    if (!$e) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }

    $touched = false;
    $startDateChanged = false;
    $newStartDate = null;

    if (array_key_exists('name', $b)) {
      $e->name = trim((string)$b['name']);
      $touched = true;
    }
    if (array_key_exists('description', $b)) {
      $v = $b['description'];
      $e->description = ($v === null || trim((string)$v) === '') ? null : trim((string)$v);
      $touched = true;
    }
    if (array_key_exists('type', $b)) {
      $v = $b['type'];
      $e->type = ($v === null || trim((string)$v) === '') ? null : trim((string)$v);
      $touched = true;
    }
    if (array_key_exists('start_date', $b)) {
      $startDateChanged = true;
      $newStartDate = (string)$b['start_date'];
      $e->start_date = $newStartDate;
      $touched = true;
    }
    if (array_key_exists('end_date', $b)) {
      $e->end_date = (string)$b['end_date'];
      $touched = true;
    }
    if (array_key_exists('location', $b)) {
      $e->location = trim((string)$b['location']);
      $touched = true;
    }
    if (array_key_exists('is_registration_open', $b)) {
      $e->is_registration_open = ((int)$b['is_registration_open']) ? 1 : 0;
      $touched = true;
    }

    // Manuel sezon override
    $hasSeasonStart = array_key_exists('season_start_year', $b);
    $hasSeasonEnd = array_key_exists('season_end_year', $b);
    if ($hasSeasonStart) {
      $e->season_start_year = ($b['season_start_year'] === null || $b['season_start_year'] === '') ? null : (int)$b['season_start_year'];
      $touched = true;
    }
    if ($hasSeasonEnd) {
      $e->season_end_year = ($b['season_end_year'] === null || $b['season_end_year'] === '') ? null : (int)$b['season_end_year'];
      $touched = true;
    }

    // registration_start_at / registration_end_at
    $hasRegStart = array_key_exists('registration_start_at', $b);
    $hasRegEnd   = array_key_exists('registration_end_at', $b);
    $newRegStart = null;
    $newRegEnd   = null;

    if ($hasRegStart) {
      $parsed = self::parseDatetimeLocal($b['registration_start_at']);
      if ($b['registration_start_at'] !== null && trim((string)$b['registration_start_at']) !== '' && $parsed === null) {
        Response::error('validation_error', 'Invalid registration_start_at', 422);
        return;
      }
      $newRegStart = $parsed;
      $e->registration_start_at = $parsed;
      $touched = true;
    }
    if ($hasRegEnd) {
      $parsed = self::parseDatetimeLocal($b['registration_end_at']);
      if ($b['registration_end_at'] !== null && trim((string)$b['registration_end_at']) !== '' && $parsed === null) {
        Response::error('validation_error', 'Invalid registration_end_at', 422);
        return;
      }
      $newRegEnd = $parsed;
      $e->registration_end_at = $parsed;
      $touched = true;
    }

    if (!$touched) {
      Response::error('validation_error', 'No fields to update', 422);
      return;
    }

    // reg_start <= reg_end (verilmeyen taraf için mevcut DB değeri kullanılır)
    if ($hasRegStart || $hasRegEnd) {
      $startVal = $hasRegStart ? $newRegStart : ($e->getRawOriginal('registration_start_at') ?: null);
      $endVal   = $hasRegEnd ? $newRegEnd : ($e->getRawOriginal('registration_end_at') ?: null);
      if ($startVal && $endVal && strcmp((string)$startVal, (string)$endVal) > 0) {
        Response::error('validation_error', 'registration_start_at must be <= registration_end_at', 422);
        return;
      }
    }

    // start_date değişti ve sezon elle verilmediyse yeniden hesapla
    if ($startDateChanged && !$hasSeasonStart && !$hasSeasonEnd) {
      [$ssy, $sey] = self::computeSeasonYears((string)$newStartDate, 9);
      $e->season_start_year = $ssy;
      $e->season_end_year = $sey;
    }

    // Eski kayıtlar için folder_key garanti
    if (!$e->folder_key) {
      $e->folder_key = str_pad((string)$e->id, 5, '0', STR_PAD_LEFT);
    }

    $e->save();

    Response::noContent(204);
  }

  public static function delete(Request $req, array $params): void
  {
    // Güvenlik: eskiden sadece login (herhangi bir kullanıcı silebiliyordu) -> create/update ile tutarlı role kısıtı.
    Auth::requireAdmin();
    $id = (int)$params['id'];

    // NOT: event_files satırları FK ON DELETE CASCADE ile silinir. Fiziksel dosya temizliği burada yapılmıyor (eski davranış korundu).
    EventRegistration::where('event_id', $id)->delete();
    EventResult::where('event_id', $id)->delete();
    Event::where('id', $id)->delete();

    Response::noContent(204);
  }

  // --- New API: uploads for bulletin/oncikis/kesincikis --------------------------

  public static function uploadBulletin(Request $req, array $params): void
  {
    self::uploadEventPdf($params, 'bulletin', 'bulletin');
  }

  public static function uploadOnCikis(Request $req, array $params): void
  {
    self::uploadEventPdf($params, 'oncikis', 'startlist');
  }

  public static function uploadKesinCikis(Request $req, array $params): void
  {
    self::uploadEventPdf($params, 'kesincikis', 'startlist');
  }

  public static function deleteBulletin(Request $req, array $params): void
  {
    self::deleteCurrentEventFile($params, 'bulletin');
  }

  public static function deleteOnCikis(Request $req, array $params): void
  {
    self::deleteCurrentEventFile($params, 'oncikis');
  }

  public static function deleteKesinCikis(Request $req, array $params): void
  {
    self::deleteCurrentEventFile($params, 'kesincikis');
  }

  // --- Helpers ------------------------------------------------------------------

  public static function exportRegistrationsCsv(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    if ($eventId <= 0) {
      Response::error('validation_error', 'Invalid id', 422);
      return;
    }

    $pdo = Db::pdo();
    $stEvent = $pdo->prepare("SELECT id, name, start_date, slug FROM events WHERE id = ?");
    $stEvent->execute([$eventId]);
    $event = $stEvent->fetch();

    if (!$event) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }

    // OE2010 "data" import formatı — 58 sütun, ilk hücre format kodu (OE0001).
    // Başlıklar Ordu.xlsm `data` sekmesiyle birebir aynıdır.
    $header = [
      'OE0001', 'Çık.no', 'XStno', 'Çipno', 'Veritabanı Id', 'Soyad', 'İlk ad',
      'DY', 'Cinsiyet', 'Blok', 'td', 'Çıkış', 'Bitiş', 'Zaman', 'Tasnifleyici',
      'Kredi -', 'Ceza +', 'Yorum', 'Külüp no.', 'Ktg.adı', 'Şehir', 'Ülke',
      'Konum', 'Bölge', 'Kat. No.', 'Kısa', 'Uzun', 'Kayıt kat. No',
      'Kayıt kategorisi (Kısa)', 'Kayıt kategorisi (Uzun)', 'Sıralama',
      'Sıralama puanları', 'Num1', 'Num2', 'Num3', 'Text1', 'Text2', 'Text3',
      'Adres soyadı', 'Adres ilk adı', 'Sokak', 'Satır2', 'P.K.', 'Adres şehiri',
      'Telefon', 'Mobil', 'Faks', 'Eposta', 'Kiralık', 'Start ücerti', 'Ödenmiş',
      'Takım', 'Parkur no.', 'Parkur', 'km', 'm', 'Parkura ait hedefler', 'Konum',
    ];

    $rows = self::fetchRegistrationsForCsv($pdo, $eventId);
    // Çık.no (start no) sütununu 1'den başlayarak yarışmacı sayısınca doldur.
    $lines = [];
    $stno = 1;
    foreach ($rows as $row) {
      $line = self::mapRegistrationToOe2010Row($row);
      $line[1] = (string) $stno;   // B · Çık.no
      $stno++;
      $lines[] = $line;
    }

    $filename = self::buildRegistrationsCsvFilename($event);
    self::streamCsvDownload($filename, $header, $lines, ';');
  }

  private static function fetchRegistrationsForCsv(PDO $pdo, int $eventId): array
  {
    $sql = "
        SELECT
            a.si_chip_no,
            a.id AS athlete_id,
            a.last_name,
            a.first_name,
            a.birth_year,
            a.gender,
            a.national_id,

            cu.id AS club_id,
            cu.name AS club_name,
            cu.code AS club_code,

            ca.id AS cat_id,
            ca.code AS cat_code,
            ca.name AS cat_name

        FROM event_registrations o
        JOIN athletes a
            ON o.athlete_id = a.id
        JOIN categories ca
            ON ca.id = o.category_id
        JOIN clubs cu
            ON cu.id = a.club_id
        WHERE o.event_id = ?
        ORDER BY cu.name ASC, ca.name ASC, a.last_name ASC, a.first_name ASC
    ";

    $st = $pdo->prepare($sql);
    $st->execute([$eventId]);

    return $st->fetchAll(PDO::FETCH_ASSOC) ?: [];
  }

  /**
   * Bir kayıt satırını OE2010 "data" formatındaki 58 sütunlu pozisyonel diziye çevirir.
   * Sadece elimizdeki alanlar doldurulur, kalan sütunlar boş bırakılır.
   */
  private static function mapRegistrationToOe2010Row(array $row): array
  {
    $val = static function ($v): string {
      return $v === null ? '' : (string) $v;
    };

    $line = array_fill(0, 58, '');

    $line[3]  = $val($row['si_chip_no'] ?? '');   // D  · Çipno
    $line[4]  = $val($row['athlete_id'] ?? '');   // E  · Veritabanı Id
    $line[5]  = $val($row['last_name'] ?? '');    // F  · Soyad
    $line[6]  = $val($row['first_name'] ?? '');   // G  · İlk ad
    $line[7]  = $val($row['birth_year'] ?? '');   // H  · DY
    $line[8]  = $val($row['gender'] ?? '');       // I  · Cinsiyet
    $line[18] = $val($row['club_id'] ?? '');      // S  · Külüp no.
    $line[19] = $val($row['club_name'] ?? '');    // T  · Ktg.adı
    $line[20] = $val($row['club_code'] ?? '');    // U  · Şehir
    $line[24] = $val($row['cat_id'] ?? '');       // Y  · Kat. No.
    $line[25] = $val($row['cat_code'] ?? '');     // Z  · Kısa
    $line[26] = $val($row['cat_name'] ?? '');     // AA · Uzun
    $line[27] = $val($row['cat_id'] ?? '');       // AB · Kayıt kat. No
    $line[28] = $val($row['cat_code'] ?? '');     // AC · Kayıt kategorisi (Kısa)
    $line[29] = $val($row['cat_name'] ?? '');     // AD · Kayıt kategorisi (Uzun)
    $line[35] = $val($row['national_id'] ?? '');  // AJ · Text1 (TC)

    // AW · Kiralık: kendi çipi olan kiralık değildir; çipi olmayan 'X' (kiralık).
    $line[48] = trim($val($row['si_chip_no'] ?? '')) === '' ? 'X' : '';

    return $line;
  }

  private static function buildRegistrationsCsvFilename(array $event): string
  {
    $slug = trim((string)($event['slug'] ?? ''));
    if ($slug === '') {
      $slug = trim((string)($event['name'] ?? 'event'));
    }

    $slug = strtolower((string) @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $slug));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug ?? '');
    $slug = trim((string) $slug, '-');

    if ($slug === '') {
      $slug = 'event-' . (int)($event['id'] ?? 0);
    }

    $datePart = trim((string)($event['start_date'] ?? ''));
    if ($datePart !== '') {
      $datePart = preg_replace('/[^0-9\-]/', '', $datePart);
      if ($datePart !== '') {
        return $slug . '-registrations-' . $datePart . '.csv';
      }
    }

    return $slug . '-registrations.csv';
  }

  /**
   * @param string[]   $header Başlık satırı (pozisyonel sütun adları).
   * @param string[][] $rows   Her biri başlıkla aynı uzunlukta pozisyonel değer dizisi.
   */
  private static function streamCsvDownload(string $filename, array $header, array $rows, string $delimiter = ';'): void
  {
    @ini_set('display_errors', '0');
    @ini_set('html_errors', '0');

    while (ob_get_level() > 0) {
      @ob_end_clean();
    }

    header('Content-Type: text/csv; charset=Windows-1254');
    header('Content-Disposition: attachment; filename="' . addslashes($filename) . '"');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');

    $out = fopen('php://output', 'wb');
    if ($out === false) {
      http_response_code(500);
      echo 'CSV output stream could not be opened';
      exit;
    }

    self::writeCsvRow($out, $header, $delimiter);

    foreach ($rows as $line) {
      self::writeCsvRow($out, $line, $delimiter);
    }

    fclose($out);
    exit;
  }

  private static function writeCsvRow($out, array $fields, string $delimiter = ';'): void
  {
    $tmp = fopen('php://temp', 'r+');
    if ($tmp === false) {
      return;
    }

    fputcsv($tmp, $fields, $delimiter, '"', '\\', "\n");
    rewind($tmp);

    $line = stream_get_contents($tmp);
    fclose($tmp);

    if ($line === false) {
      return;
    }

    $line = rtrim($line, "\r\n");
    fwrite($out, self::toCsvEncoding($line) . "\r\n");
  }

  private static function toCsvEncoding(string $value): string
  {
    $converted = @iconv('UTF-8', 'Windows-1254//IGNORE', $value);
    return $converted !== false ? $converted : $value;
  }

  private static function uploadEventPdf(array $params, string $kind, string $subdir): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    if ($eventId <= 0) {
      Response::error('validation_error', 'Invalid id', 422);
      return;
    }

    $inputName = $kind; // bulletin | oncikis | kesincikis
    if (!isset($_FILES[$inputName])) {
      Response::error('validation_error', "Missing file field: {$inputName}", 422);
      return;
    }

    $f = $_FILES[$inputName];
    if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
      $err = is_array($f) ? (int)($f['error'] ?? -1) : -1;
      Response::error('upload_error', "Upload failed (code {$err})", 422);
      return;
    }

    $tmp = (string)$f['tmp_name'];
    $origName = (string)($f['name'] ?? 'file.pdf');
    $size = (int)($f['size'] ?? 0);

    if ($size <= 0) {
      Response::error('validation_error', 'Empty upload', 422);
      return;
    }
    if ($size > 20 * 1024 * 1024) {
      Response::error('validation_error', 'File too large (max 20MB)', 422);
      return;
    }

    // MIME check
    $mime = null;
    if (function_exists('finfo_open')) {
      $fi = finfo_open(FILEINFO_MIME_TYPE);
      if ($fi) {
        $mime = finfo_file($fi, $tmp) ?: null;
        finfo_close($fi);
      }
    }
    if ($mime !== 'application/pdf') {
      Response::error('validation_error', 'Only PDF files are allowed', 422);
      return;
    }

    // Magic bytes check
    $fh = @fopen($tmp, 'rb');
    if (!$fh) {
      Response::error('upload_error', 'Cannot read uploaded file', 422);
      return;
    }
    $head = fread($fh, 4);
    fclose($fh);
    if ($head !== '%PDF') {
      Response::error('validation_error', 'Invalid PDF file', 422);
      return;
    }

    $pdo = Db::pdo();

    // Ensure event exists + get folder_key
    $stE = $pdo->prepare("SELECT id, folder_key FROM events WHERE id = ?");
    $stE->execute([$eventId]);
    $ev = $stE->fetch();
    if (!$ev) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }
    $folderKey = (string)($ev['folder_key'] ?? '');
    if ($folderKey === '') {
      $folderKey = self::ensureFolderKey($pdo, $eventId);
    }

    // Destination
    $safeExt = 'pdf';
    $token = bin2hex(random_bytes(6));
    $prefix = $kind;
    $fileName = $prefix . '_' . $token . '.' . $safeExt;

    $storageKey = 'events/' . $folderKey . '/' . $subdir . '/' . $fileName;
    $destAbs = self::uploadsRootAbs() . '/' . $storageKey;
    $destDir = dirname($destAbs);
    if (!is_dir($destDir)) {
      if (!@mkdir($destDir, 0755, true) && !is_dir($destDir)) {
        Response::error('upload_error', 'Cannot create upload directory', 500);
        return;
      }
    }

    if (!@move_uploaded_file($tmp, $destAbs)) {
      Response::error('upload_error', 'Cannot move uploaded file', 500);
      return;
    }

    // versioning + current flag
    $pdo->beginTransaction();
    try {
      $stV = $pdo->prepare("SELECT COALESCE(MAX(version),0) AS v FROM event_files WHERE event_id=? AND kind=?");
      $stV->execute([$eventId, $kind]);
      $maxV = (int)($stV->fetch()['v'] ?? 0);
      $newV = $maxV + 1;

      $pdo->prepare("UPDATE event_files SET is_current=0 WHERE event_id=? AND kind=? AND is_current=1")->execute([$eventId, $kind]);

      $stI = $pdo->prepare("
        INSERT INTO event_files (
          event_id, kind, storage_key, original_name, mime_type, size_bytes,
          version, is_current, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ");
      $stI->execute([$eventId, $kind, $storageKey, $origName, $mime, $size, $newV]);

      // NOTE: During migration we intentionally do NOT update legacy columns
      // (events.bulletin_path / oncikis_path / kesincikis_path) because they
      // historically implied /bulletin/ and /cikis/ URLs. New uploads are served
      // from /uploads/... via event_files.*. Use *_url fields on the frontend.

      $pdo->commit();
    } catch (Throwable $t) {
      $pdo->rollBack();
      // Best-effort cleanup
      @unlink($destAbs);
      Response::error('server_error', 'DB error while saving file', 500);
      return;
    }

    $url = self::publicUploadsBaseUrl() . '/' . $storageKey;
    Response::json([
      'event_id' => $eventId,
      'kind' => $kind,
      'storage_key' => $storageKey,
      'url' => $url,
    ], 201);
  }

  private static function deleteCurrentEventFile(array $params, string $kind): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    if ($eventId <= 0) {
      Response::error('validation_error', 'Invalid id', 422);
      return;
    }

    $pdo = Db::pdo();
    $st = $pdo->prepare("
      SELECT id, storage_key
      FROM event_files
      WHERE event_id=? AND kind=? AND is_current=1 AND deleted_at IS NULL
      ORDER BY version DESC
      LIMIT 1
    ");
    $st->execute([$eventId, $kind]);
    $row = $st->fetch();
    if (!$row) {
      Response::error('not_found', 'File not found', 404);
      return;
    }

    $fileId = (int)$row['id'];
    $storageKey = (string)$row['storage_key'];
    // SKB gizli depoda durur, diğerleri public uploads altında.
    $abs = $kind === 'skb'
      ? PrivateStorage::path($storageKey)
      : self::uploadsRootAbs() . '/' . $storageKey;

    $pdo->beginTransaction();
    try {
      $pdo->prepare("UPDATE event_files SET is_current=0, deleted_at=NOW() WHERE id=?")->execute([$fileId]);

      // NOTE: We do not clear legacy columns during migration.

      $pdo->commit();
    } catch (Throwable $t) {
      $pdo->rollBack();
      Response::error('server_error', 'DB error while deleting file', 500);
      return;
    }

    // Best-effort delete from disk
    if ($abs !== null && is_file($abs)) {
      @unlink($abs);
    }

    Response::noContent(204);
  }

  // --- Yönetim dosyası: SKB (public'e hiç açılmaz) -------------------------------

  private const SKB_MAX_BYTES = 50 * 1024 * 1024;
  private const SKB_EXTS = ['skb', 'zip'];

  /** POST /api/events/{id}/skb — alan adı: skb */
  public static function uploadSkb(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    if ($eventId <= 0) {
      Response::error('validation_error', 'Invalid id', 422);
      return;
    }

    $f = self::pickUploadedFile('skb');
    if ($f === null) return; // hata yanıtı verildi

    [$tmp, $origName, $size] = $f;

    if ($size > self::SKB_MAX_BYTES) {
      Response::error('validation_error', 'File too large (max 50MB)', 422);
      return;
    }

    $ext = strtolower((string)pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, self::SKB_EXTS, true)) {
      Response::error('validation_error', 'Only .skb or .zip files are allowed', 422);
      return;
    }

    $pdo = Db::pdo();
    $folderKey = self::eventFolderKey($pdo, $eventId);
    if ($folderKey === null) return;

    $storageKey = 'events/' . $folderKey . '/private/skb_' . bin2hex(random_bytes(6)) . '.' . $ext;
    $destAbs = PrivateStorage::path($storageKey);
    if ($destAbs === null) {
      Response::error('private_storage_unavailable', 'Private storage directory is not writable', 500);
      return;
    }

    // MIME'ı taşımadan önce oku (taşıdıktan sonra tmp dosya kalmaz).
    $mime = self::detectMime($tmp) ?? 'application/octet-stream';

    $destDir = dirname($destAbs);
    if (!is_dir($destDir) && !@mkdir($destDir, 0700, true) && !is_dir($destDir)) {
      Response::error('upload_error', 'Cannot create private upload directory', 500);
      return;
    }
    if (!@move_uploaded_file($tmp, $destAbs)) {
      Response::error('upload_error', 'Cannot move uploaded file', 500);
      return;
    }
    @chmod($destAbs, 0600);

    if (!self::recordEventFile($pdo, $eventId, 'skb', $storageKey, $origName, $mime, $size)) {
      @unlink($destAbs);
      Response::error('server_error', 'DB error while saving file', 500);
      return;
    }

    Response::json([
      'event_id'      => $eventId,
      'kind'          => 'skb',
      'original_name' => $origName,
      'size_bytes'    => $size,
    ], 201);
  }

  /** GET /api/events/{id}/skb — sadece admin; dosyayı PHP üzerinden indirir. */
  public static function downloadSkb(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    if ($eventId <= 0) {
      Response::error('validation_error', 'Invalid id', 422);
      return;
    }

    $row = self::currentEventFile(Db::pdo(), $eventId, 'skb');
    if (!$row) {
      Response::error('not_found', 'File not found', 404);
      return;
    }

    $abs = PrivateStorage::path((string)$row['storage_key']);
    if ($abs === null || !is_file($abs)) {
      Response::error('not_found', 'File not found on disk', 404);
      return;
    }

    $name = (string)($row['original_name'] ?? 'event.skb');
    // Başlıkta satır sonu/tırnak enjeksiyonunu engelle.
    $safeName = preg_replace('/[^A-Za-z0-9._-]+/', '_', $name) ?: 'event.skb';

    header('Content-Type: application/octet-stream');
    header('Content-Length: ' . (string)filesize($abs));
    header('Content-Disposition: attachment; filename="' . $safeName . '"');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    readfile($abs);
    exit;
  }

  /** DELETE /api/events/{id}/skb */
  public static function deleteSkb(Request $req, array $params): void
  {
    self::deleteCurrentEventFile($params, 'skb');
  }

  /** GET /api/events/{id}/files — admin; güncel dosyaların meta bilgisi. */
  public static function listFiles(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    if ($eventId <= 0) {
      Response::error('validation_error', 'Invalid id', 422);
      return;
    }

    $st = Db::pdo()->prepare("
      SELECT kind, original_name, size_bytes, version, created_at
      FROM event_files
      WHERE event_id=? AND is_current=1 AND deleted_at IS NULL
      ORDER BY kind
    ");
    $st->execute([$eventId]);

    $items = array_map(static function (array $r): array {
      return [
        'kind'          => (string)$r['kind'],
        'original_name' => $r['original_name'] !== null ? (string)$r['original_name'] : null,
        'size_bytes'    => $r['size_bytes'] !== null ? (int)$r['size_bytes'] : null,
        'version'       => (int)$r['version'],
        'created_at'    => (string)$r['created_at'],
      ];
    }, $st->fetchAll());

    Response::json(['items' => $items]);
  }

  // --- Sonuç dosyaları (OE2010 çıktıları) ----------------------------------------

  private const RESULT_TYPES = ['official', 'splits', 'overall'];
  private const RESULT_EXTS = ['html', 'htm', 'pdf'];
  private const RESULT_MAX_BYTES = 20 * 1024 * 1024;

  /**
   * POST /api/events/{id}/results/{type} — alan adı: file
   *
   * Dosya, results.php'nin aradığı sabit adla yazılır:
   * uploads/events/{folder_key}/results/{type}.{html|pdf}
   */
  public static function uploadResultFile(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    $type = strtolower(trim((string)($params['type'] ?? '')));
    if ($eventId <= 0 || !in_array($type, self::RESULT_TYPES, true)) {
      Response::error('validation_error', 'Invalid event or result type', 422);
      return;
    }

    $f = self::pickUploadedFile('file');
    if ($f === null) return;

    [$tmp, $origName, $size] = $f;

    if ($size > self::RESULT_MAX_BYTES) {
      Response::error('validation_error', 'File too large (max 20MB)', 422);
      return;
    }

    $ext = strtolower((string)pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, self::RESULT_EXTS, true)) {
      Response::error('validation_error', 'Only .html or .pdf files are allowed', 422);
      return;
    }
    if ($ext === 'htm') $ext = 'html';

    $mime = self::detectMime($tmp);
    if ($ext === 'pdf') {
      if ($mime !== 'application/pdf' || !self::hasPdfMagic($tmp)) {
        Response::error('validation_error', 'Invalid PDF file', 422);
        return;
      }
    } else {
      // OE2010 HTML'i Windows-1254 olabilir; finfo text/html ya da text/plain döner.
      if ($mime !== null && !str_starts_with($mime, 'text/')) {
        Response::error('validation_error', 'Invalid HTML file', 422);
        return;
      }
      $head = (string)@file_get_contents($tmp, false, null, 0, 4096);
      if (stripos($head, '<?php') !== false) {
        Response::error('validation_error', 'Invalid HTML file', 422);
        return;
      }
    }

    $pdo = Db::pdo();
    $folderKey = self::eventFolderKey($pdo, $eventId);
    if ($folderKey === null) return;

    $storageKey = 'events/' . $folderKey . '/results/' . $type . '.' . $ext;
    $destAbs = self::uploadsRootAbs() . '/' . $storageKey;
    $destDir = dirname($destAbs);
    if (!is_dir($destDir) && !@mkdir($destDir, 0755, true) && !is_dir($destDir)) {
      Response::error('upload_error', 'Cannot create results directory', 500);
      return;
    }

    if (!@move_uploaded_file($tmp, $destAbs)) {
      Response::error('upload_error', 'Cannot move uploaded file', 500);
      return;
    }

    // results.php önce .html'e bakar; karışık kalmasın diye diğer uzantıyı sil.
    self::removeResultSiblings($folderKey, $type, $ext);

    self::recordEventFile($pdo, $eventId, 'results_' . $type, $storageKey, $origName, $mime ?? '', $size);

    Response::json([
      'event_id' => $eventId,
      'type'     => $type,
      'url'      => '/api/results.php?key=' . rawurlencode($folderKey) . '&type=' . rawurlencode($type),
    ], 201);
  }

  /** DELETE /api/events/{id}/results/{type} */
  public static function deleteResultFile(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $eventId = (int)($params['id'] ?? 0);
    $type = strtolower(trim((string)($params['type'] ?? '')));
    if ($eventId <= 0 || !in_array($type, self::RESULT_TYPES, true)) {
      Response::error('validation_error', 'Invalid event or result type', 422);
      return;
    }

    $pdo = Db::pdo();
    $folderKey = self::eventFolderKey($pdo, $eventId);
    if ($folderKey === null) return;

    // FTP ile bırakılmış dosyaların DB kaydı olmayabilir: diskten her iki uzantıyı da sil.
    $removed = self::removeResultSiblings($folderKey, $type, null);

    $row = self::currentEventFile($pdo, $eventId, 'results_' . $type);
    if ($row) {
      $pdo->prepare("UPDATE event_files SET is_current=0, deleted_at=NOW() WHERE id=?")
        ->execute([(int)$row['id']]);
    }

    if (!$removed && !$row) {
      Response::error('not_found', 'File not found', 404);
      return;
    }

    Response::noContent(204);
  }

  /** results/{type}.{html,pdf} dosyalarını siler ($keepExt hariç). Silinen oldu mu? */
  private static function removeResultSiblings(string $folderKey, string $type, ?string $keepExt): bool
  {
    $dir = self::uploadsRootAbs() . '/events/' . $folderKey . '/results';
    $removed = false;
    foreach (['html', 'htm', 'pdf'] as $ext) {
      if ($keepExt !== null && $ext === $keepExt) continue;
      $p = $dir . '/' . $type . '.' . $ext;
      if (is_file($p)) {
        @unlink($p);
        $removed = true;
      }
    }
    return $removed;
  }

  // --- Yükleme yardımcıları -------------------------------------------------------

  /**
   * $_FILES doğrulaması. Başarılıysa [tmp_name, original_name, size], değilse null
   * (hata yanıtı verilmiş olur).
   *
   * @return array{0:string,1:string,2:int}|null
   */
  private static function pickUploadedFile(string $field): ?array
  {
    if (!isset($_FILES[$field])) {
      Response::error('validation_error', "Missing file field: {$field}", 422);
      return null;
    }

    $f = $_FILES[$field];
    if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
      $err = is_array($f) ? (int)($f['error'] ?? -1) : -1;
      Response::error('upload_error', "Upload failed (code {$err})", 422);
      return null;
    }

    $tmp = (string)$f['tmp_name'];
    $size = (int)($f['size'] ?? 0);
    if ($size <= 0 || !is_uploaded_file($tmp)) {
      Response::error('validation_error', 'Empty upload', 422);
      return null;
    }

    return [$tmp, (string)($f['name'] ?? 'file'), $size];
  }

  private static function detectMime(string $tmp): ?string
  {
    if (!function_exists('finfo_open')) return null;
    $fi = finfo_open(FILEINFO_MIME_TYPE);
    if (!$fi) return null;
    $mime = finfo_file($fi, $tmp) ?: null;
    finfo_close($fi);
    return $mime;
  }

  private static function hasPdfMagic(string $tmp): bool
  {
    $fh = @fopen($tmp, 'rb');
    if (!$fh) return false;
    $head = fread($fh, 4);
    fclose($fh);
    return $head === '%PDF';
  }

  /** Etkinliği doğrular ve folder_key döner; yoksa 404 yanıtı verip null döner. */
  private static function eventFolderKey(PDO $pdo, int $eventId): ?string
  {
    $st = $pdo->prepare("SELECT id, folder_key FROM events WHERE id = ?");
    $st->execute([$eventId]);
    $ev = $st->fetch();
    if (!$ev) {
      Response::error('event_not_found', 'Event not found', 404);
      return null;
    }
    $key = (string)($ev['folder_key'] ?? '');
    return $key !== '' ? $key : self::ensureFolderKey($pdo, $eventId);
  }

  private static function currentEventFile(PDO $pdo, int $eventId, string $kind): ?array
  {
    $st = $pdo->prepare("
      SELECT id, storage_key, original_name
      FROM event_files
      WHERE event_id=? AND kind=? AND is_current=1 AND deleted_at IS NULL
      ORDER BY version DESC
      LIMIT 1
    ");
    $st->execute([$eventId, $kind]);
    $row = $st->fetch();
    return $row ?: null;
  }

  /** event_files'a yeni sürüm ekler, eskisini is_current=0 yapar. */
  private static function recordEventFile(
    PDO $pdo,
    int $eventId,
    string $kind,
    string $storageKey,
    string $origName,
    string $mime,
    int $size
  ): bool {
    $pdo->beginTransaction();
    try {
      $stV = $pdo->prepare("SELECT COALESCE(MAX(version),0) AS v FROM event_files WHERE event_id=? AND kind=?");
      $stV->execute([$eventId, $kind]);
      $newV = (int)($stV->fetch()['v'] ?? 0) + 1;

      $pdo->prepare("UPDATE event_files SET is_current=0 WHERE event_id=? AND kind=? AND is_current=1")
        ->execute([$eventId, $kind]);

      $pdo->prepare("
        INSERT INTO event_files (
          event_id, kind, storage_key, original_name, mime_type, size_bytes,
          version, is_current, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      ")->execute([$eventId, $kind, $storageKey, $origName, $mime, $size, $newV]);

      $pdo->commit();
      return true;
    } catch (Throwable $t) {
      $pdo->rollBack();
      return false;
    }
  }

  private static function attachFileUrls(array &$items): void
  {
    if (!$items) return;

    $ids = [];
    foreach ($items as $it) {
      if (isset($it['id'])) $ids[] = (int)$it['id'];
    }
    $ids = array_values(array_unique(array_filter($ids)));
    if (!$ids) return;

    $pdo = Db::pdo();
    $in = implode(',', array_fill(0, count($ids), '?'));
    $st = $pdo->prepare("
      SELECT event_id, kind, storage_key
      FROM event_files
      WHERE event_id IN ($in)
        AND is_current=1
        AND deleted_at IS NULL
        AND kind IN ('bulletin','oncikis','kesincikis')
    ");
    $st->execute($ids);
    $rows = $st->fetchAll();

    $map = []; // [event_id][kind] => storage_key
    foreach ($rows as $r) {
      $eid = (int)$r['event_id'];
      $k = (string)$r['kind'];
      $map[$eid][$k] = (string)$r['storage_key'];
    }

    $baseUploads = self::publicUploadsBaseUrl();
    $baseHost = self::publicHostBaseUrl();

    foreach ($items as &$it) {
      $eid = (int)($it['id'] ?? 0);

      // bulletin
      if (isset($map[$eid]['bulletin'])) {
        $it['bulletin_url'] = $baseUploads . '/' . $map[$eid]['bulletin'];
      } elseif (!empty($it['bulletin_path'])) {
        // legacy
        $it['bulletin_url'] = $baseHost . '/bulletin/' . ltrim((string)$it['bulletin_path'], '/');
      }

      // oncikis
      if (isset($map[$eid]['oncikis'])) {
        $it['oncikis_url'] = $baseUploads . '/' . $map[$eid]['oncikis'];
      } elseif (!empty($it['oncikis_path'])) {
        $it['oncikis_url'] = $baseHost . '/cikis/' . ltrim((string)$it['oncikis_path'], '/');
      }

      // kesincikis
      if (isset($map[$eid]['kesincikis'])) {
        $it['kesincikis_url'] = $baseUploads . '/' . $map[$eid]['kesincikis'];
      } elseif (!empty($it['kesincikis_path'])) {
        $it['kesincikis_url'] = $baseHost . '/cikis/' . ltrim((string)$it['kesincikis_path'], '/');
      }
    }
  }

  private static function uploadsRootAbs(): string
  {
    // /public_html/uploads
    $root = rtrim((string)($_SERVER['DOCUMENT_ROOT'] ?? ''), '/');
    if ($root === '') {
      // fallback (should not happen in normal hosting)
      $root = __DIR__;
    }
    return $root . '/uploads';
  }

  private static function publicHostBaseUrl(): string
  {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'localhost');
    return $scheme . '://' . $host;
  }

  private static function publicUploadsBaseUrl(): string
  {
    return self::publicHostBaseUrl() . '/uploads';
  }

  private static function ensureFolderKey(PDO $pdo, int $eventId): string
  {
    // folder_key = LPAD(id,5,'0')
    $st = $pdo->prepare("SELECT folder_key FROM events WHERE id = ?");
    $st->execute([$eventId]);
    $row = $st->fetch();
    $cur = $row ? (string)($row['folder_key'] ?? '') : '';
    if ($cur !== '') return $cur;

    $key = str_pad((string)$eventId, 5, '0', STR_PAD_LEFT);
    $pdo->prepare("UPDATE events SET folder_key = ? WHERE id = ?")->execute([$key, $eventId]);
    return $key;
  }

  private static function computeSeasonYears(string $startDate, int $seasonStartMonth): array
  {
    // startDate: YYYY-MM-DD
    $y = (int)substr($startDate, 0, 4);
    $m = (int)substr($startDate, 5, 2);
    if ($y <= 0 || $m <= 0) return [null, null];
    if ($m >= $seasonStartMonth) return [$y, $y + 1];
    return [$y - 1, $y];
  }

  private static function parseDatetimeLocal($v): ?string
  {
    if ($v === null) return null;
    $s = trim((string)$v);
    if ($s === '') return null;

    $s = str_replace('T', ' ', $s);
    if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/', $s)) {
      $s .= ':00';
    }

    if (!preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $s)) {
      return null;
    }

    return $s;
  }
}

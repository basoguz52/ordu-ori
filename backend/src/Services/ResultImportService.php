<?php

namespace App\Services;

use App\Support\ApiException;
use App\Support\TcNo;

/**
 * OE2010 sonuç CSV'sini (Raporu dışa aktar → "Virgülle ayrılmış sütunlar", noktalı virgül)
 * okuyup event_results'a yazar ve ferdi puanı hesaplar.
 *
 * Puan: yarış günü + kategori başına
 *   round(birincinin süresi [sn] × 1000 / sporcunun süresi [sn]); OK dışı durumlar 0.
 *
 * CSV dosyaları web dışındaki gizli depoda durur (TC kimlik numaraları içerir):
 *   <PrivateStorage>/results-inbox/<folder_key>/gun<N>.csv
 * Panelden yüklenen dosya da OE2010'un FTP ile bıraktığı dosya da aynı yere düşer.
 */
class ResultImportService
{
    public const INBOX_DIR = 'results-inbox';
    public const MAX_BYTES = 5 * 1024 * 1024;

    // OE2010 CSV kolon sırası (OE0012 formatı, 0 tabanlı). Başlıklar dile göre değiştiği
    // için ada göre değil sıraya göre okunur.
    private const COL_CHIP       = 3;
    private const COL_LAST       = 5;
    private const COL_FIRST      = 6;
    private const COL_TIME       = 13;
    private const COL_CLASSIFIER = 14;
    private const COL_CLUB_A     = 19; // "Ktg.adı" (kısa ad)
    private const COL_CLUB_B     = 20; // "Şehir"  (OE kulüp adını bu ikisinden kurar)
    private const COL_CAT_CODE   = 25;
    private const COL_CAT_NAME   = 26;
    private const COL_TEXTS      = [35, 36, 37]; // Text1-3: TC buradan biri olarak gelir
    private const COL_RENTED     = 48;           // "Kiralık" çip: X

    // OE "Tasnifleyici" kodu → durum
    private const STATUS_BY_CLASSIFIER = [
        '0' => 'OK',
        '1' => 'DNS',
        '2' => 'DNF',
        '3' => 'MP',
        '4' => 'DSQ',
        '5' => 'OT',
    ];

    public static function inboxKey(string $folderKey, int $stage): string
    {
        return self::INBOX_DIR . '/' . $folderKey . '/gun' . $stage . '.csv';
    }

    /**
     * @return array<int, array{
     *   first_name:string, last_name:string, club_name:string, category_code:string,
     *   category_name:string, time_sec:?int, status:string, chip:?string, rented:bool, tc:?string
     * }>
     * @throws ApiException
     */
    public static function parseCsv(string $raw): array
    {
        // UTF-8 BOM'u at; UTF-8 değilse OE2010'un varsayılanı Windows-1254 kabul et.
        if (strncmp($raw, "\xEF\xBB\xBF", 3) === 0) {
            $raw = substr($raw, 3);
        }
        if (!preg_match('//u', $raw)) {
            $converted = @iconv('Windows-1254', 'UTF-8//IGNORE', $raw);
            if ($converted === false) {
                throw new ApiException('invalid_csv', 'Dosyanın karakter kodlaması okunamadı.', 422);
            }
            $raw = $converted;
        }

        $lines = preg_split('/\r\n|\n|\r/', $raw) ?: [];
        $header = str_getcsv((string)array_shift($lines), ';', '"', '');
        if (count($header) <= self::COL_RENTED || !str_starts_with(trim((string)$header[0]), 'OE')) {
            throw new ApiException(
                'invalid_csv',
                'Bu bir OE2010 sonuç CSV\'si değil. OE2010\'da "Raporu dışa aktar" → "Virgülle ayrılmış sütunlar (CSV)", ayraç noktalı virgül seçin.',
                422
            );
        }

        $rows = [];
        foreach ($lines as $line) {
            if (trim($line) === '') continue;
            $c = str_getcsv($line, ';', '"', '');
            $c = array_map(fn($v) => trim((string)$v), $c);

            $last  = $c[self::COL_LAST] ?? '';
            $first = $c[self::COL_FIRST] ?? '';
            $code  = $c[self::COL_CAT_CODE] ?? '';
            if (($last === '' && $first === '') || $code === '') continue;

            $classifier = $c[self::COL_CLASSIFIER] ?? '';
            $status = self::STATUS_BY_CLASSIFIER[$classifier] ?? 'NC';
            $time = self::parseTime($c[self::COL_TIME] ?? '');
            if ($status === 'OK' && ($time === null || $time <= 0)) {
                $status = 'NC'; // süresiz "OK" satırı puanlanamaz
            }

            $tc = null;
            foreach (self::COL_TEXTS as $i) {
                $v = $c[$i] ?? '';
                if ($v !== '' && TcNo::isValid($v)) {
                    $tc = $v;
                    break;
                }
            }

            $chip = $c[self::COL_CHIP] ?? '';
            $rows[] = [
                'first_name'    => $first,
                'last_name'     => $last,
                'club_name'     => trim(($c[self::COL_CLUB_A] ?? '') . ' ' . ($c[self::COL_CLUB_B] ?? '')),
                'category_code' => $code,
                'category_name' => $c[self::COL_CAT_NAME] ?? $code,
                'time_sec'      => $time,
                'status'        => $status,
                'chip'          => $chip !== '' ? $chip : null,
                'rented'        => strtoupper($c[self::COL_RENTED] ?? '') === 'X',
                'tc'            => $tc,
            ];
        }

        if (!$rows) {
            throw new ApiException('invalid_csv', 'CSV\'de sonuç satırı bulunamadı.', 422);
        }
        return $rows;
    }

    /** "29:17" / "1:05:28" → saniye. Boş ya da bozuksa null. */
    public static function parseTime(string $v): ?int
    {
        $v = trim($v);
        if (!preg_match('/^\d+(:\d{1,2}){1,2}$/', $v)) return null;
        $sec = 0;
        foreach (explode(':', $v) as $part) {
            $sec = $sec * 60 + (int)$part;
        }
        return $sec;
    }

    /**
     * Sıra ve puanı kategori bazında hesaplar (satırlara position/points ekler).
     * Eşit süreler aynı sırayı ve aynı puanı alır.
     */
    public static function score(array $rows): array
    {
        $best = [];
        foreach ($rows as $r) {
            if ($r['status'] !== 'OK') continue;
            $code = $r['category_code'];
            if (!isset($best[$code]) || $r['time_sec'] < $best[$code]) {
                $best[$code] = $r['time_sec'];
            }
        }

        foreach ($rows as &$r) {
            $r['position'] = null;
            $r['points'] = 0;
            if ($r['status'] !== 'OK') continue;

            $r['points'] = (int)round($best[$r['category_code']] * 1000 / $r['time_sec']);
            $faster = 0;
            foreach ($rows as $o) {
                if ($o['status'] === 'OK'
                    && $o['category_code'] === $r['category_code']
                    && $o['time_sec'] < $r['time_sec']) {
                    $faster++;
                }
            }
            $r['position'] = $faster + 1;
        }
        unset($r);

        return $rows;
    }

    /**
     * Dosyayı içe aktarır: o günün eski sonuçlarını siler, yenilerini yazar, özet döner.
     *
     * @throws ApiException
     */
    public static function import(
        int $eventId,
        int $stage,
        string $absPath,
        string $source,
        ?string $originalName,
        ?int $userId
    ): array {
        $raw = @file_get_contents($absPath);
        if ($raw === false) {
            throw new ApiException('not_found', 'CSV dosyası okunamadı.', 404);
        }

        $rows = self::score(self::parseCsv($raw));
        $pdo = \Db::pdo();

        $athleteByTc   = self::lookup($pdo, 'national_id', array_column($rows, 'tc'));
        $athleteByChip = self::lookup(
            $pdo,
            'si_chip_no',
            array_map(fn($r) => $r['rented'] ? null : $r['chip'], $rows)
        );
        $categoryIds = [];
        foreach ($pdo->query("SELECT id, code FROM categories")->fetchAll() as $c) {
            $categoryIds[(string)$c['code']] = (int)$c['id'];
        }

        $matched = 0;
        $unmatched = [];
        foreach ($rows as &$r) {
            $r['athlete_id'] = ($r['tc'] !== null ? ($athleteByTc[$r['tc']] ?? null) : null)
                ?? (!$r['rented'] && $r['chip'] !== null ? ($athleteByChip[$r['chip']] ?? null) : null);
            if ($r['athlete_id'] !== null) {
                $matched++;
            } else {
                $unmatched[] = [
                    'name'          => trim($r['first_name'] . ' ' . $r['last_name']),
                    'club_name'     => $r['club_name'],
                    'category_code' => $r['category_code'],
                ];
            }
        }
        unset($r);

        $pdo->beginTransaction();
        try {
            $pdo->prepare("DELETE FROM event_results WHERE event_id = ? AND stage_no = ?")
                ->execute([$eventId, $stage]);

            $ins = $pdo->prepare("
                INSERT INTO event_results
                  (event_id, stage_no, athlete_id, category_id, category_code, first_name, last_name,
                   club_name, time_ms, status, position, points, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            foreach ($rows as $r) {
                $ins->execute([
                    $eventId,
                    $stage,
                    $r['athlete_id'],
                    $categoryIds[$r['category_code']] ?? null,
                    $r['category_code'],
                    $r['first_name'],
                    $r['last_name'],
                    $r['club_name'],
                    $r['time_sec'] !== null ? $r['time_sec'] * 1000 : null,
                    $r['status'],
                    $r['position'],
                    $r['points'],
                ]);
            }

            $pdo->prepare("
                INSERT INTO event_result_imports
                  (event_id, stage_no, source, original_name, file_sha1, rows_total, rows_matched,
                   unmatched_json, imported_by, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE
                  source = VALUES(source), original_name = VALUES(original_name),
                  file_sha1 = VALUES(file_sha1), rows_total = VALUES(rows_total),
                  rows_matched = VALUES(rows_matched), unmatched_json = VALUES(unmatched_json),
                  imported_by = VALUES(imported_by), created_at = NOW()
            ")->execute([
                $eventId,
                $stage,
                $source,
                $originalName,
                sha1($raw),
                count($rows),
                $matched,
                json_encode($unmatched, JSON_UNESCAPED_UNICODE),
                $userId,
            ]);

            $pdo->commit();
        } catch (\Throwable $t) {
            $pdo->rollBack();
            throw new ApiException('server_error', 'Sonuçlar kaydedilemedi.', 500);
        }

        return [
            'stage_no'     => $stage,
            'rows_total'   => count($rows),
            'rows_matched' => $matched,
            'unmatched'    => $unmatched,
        ];
    }

    /**
     * athletes.<column> değerlerine göre id eşlemesi. Birden fazla sporcuya uyan değer
     * belirsiz sayılır ve eşlenmez.
     *
     * @param array<int, ?string> $values
     * @return array<string,int>
     */
    private static function lookup(\PDO $pdo, string $column, array $values): array
    {
        $values = array_values(array_unique(array_filter($values, fn($v) => $v !== null && $v !== '')));
        if (!$values) return [];

        $in = implode(',', array_fill(0, count($values), '?'));
        $st = $pdo->prepare("SELECT id, {$column} AS v FROM athletes WHERE {$column} IN ($in)");
        $st->execute($values);

        $map = [];
        $seen = [];
        foreach ($st->fetchAll() as $a) {
            $v = (string)$a['v'];
            $seen[$v] = ($seen[$v] ?? 0) + 1;
            $map[$v] = (int)$a['id'];
        }
        foreach ($seen as $v => $n) {
            if ($n > 1) unset($map[$v]);
        }
        return $map;
    }
}

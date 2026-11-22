<?php

namespace Tests;

use App\Services\ResultImportService as S;
use App\Support\ApiException;
use PHPUnit\Framework\TestCase;

/**
 * Ferdi puan ve OE2010 CSV okuyucu testleri (DB gerektirmez).
 * Kural: puan = round(birincinin süresi × 1000 / sporcunun süresi), kategori başına;
 * OK dışı durumlar 0 puan ve sırasız.
 */
final class ResultImportServiceTest extends TestCase
{
    // ---------- score() ----------

    private static function row(string $cat, ?int $sec, string $status = 'OK', string $name = ''): array
    {
        return ['category_code' => $cat, 'time_sec' => $sec, 'status' => $status, 'first_name' => $name];
    }

    private static function byName(array $rows): array
    {
        $out = [];
        foreach ($rows as $r) $out[$r['first_name']] = $r;
        return $out;
    }

    public function testBirinci1000PuanAlirDigerleriOranla(): void
    {
        $r = self::byName(S::score([
            self::row('H21', 1800, 'OK', 'b'),   // 30:00
            self::row('H21', 1500, 'OK', 'a'),   // 25:00 birinci
            self::row('H21', 2000, 'OK', 'c'),
        ]));

        $this->assertSame([1, 1000], [$r['a']['position'], $r['a']['points']]);
        $this->assertSame([2, 833], [$r['b']['position'], $r['b']['points']]);   // 1500*1000/1800 = 833.3
        $this->assertSame([3, 750], [$r['c']['position'], $r['c']['points']]);
    }

    public function testYuvarlamaYariYukari(): void
    {
        // 1000*1000/1999 = 500.25 → 500 ; 1000*1000/1997 = 500.75 → 501
        $r = self::byName(S::score([
            self::row('D16', 1000, 'OK', 'a'),
            self::row('D16', 1999, 'OK', 'b'),
            self::row('D16', 1997, 'OK', 'c'),
        ]));
        $this->assertSame(500, $r['b']['points']);
        $this->assertSame(501, $r['c']['points']);
    }

    public function testEsitSureAyniSiraVePuan(): void
    {
        $r = self::byName(S::score([
            self::row('H21', 1200, 'OK', 'a'),
            self::row('H21', 1500, 'OK', 'b'),
            self::row('H21', 1500, 'OK', 'c'),
            self::row('H21', 1600, 'OK', 'd'),
        ]));
        $this->assertSame(2, $r['b']['position']);
        $this->assertSame(2, $r['c']['position']);
        $this->assertSame($r['b']['points'], $r['c']['points']);
        $this->assertSame(4, $r['d']['position']); // 2'li eşitlikten sonra 3 atlanır
    }

    public function testOkDisiDurumlarSifirVeSirasiz(): void
    {
        $r = self::byName(S::score([
            self::row('H21', 1500, 'OK', 'ok'),
            self::row('H21', 900, 'MP', 'mp'),    // daha hızlı ama MP: birinciyi etkilememeli
            self::row('H21', null, 'DNF', 'dnf'),
            self::row('H21', null, 'DSQ', 'dsq'),
            self::row('H21', null, 'DNS', 'dns'),
        ]));
        $this->assertSame([1, 1000], [$r['ok']['position'], $r['ok']['points']]);
        foreach (['mp', 'dnf', 'dsq', 'dns'] as $k) {
            $this->assertNull($r[$k]['position'], $k);
            $this->assertSame(0, $r[$k]['points'], $k);
        }
    }

    public function testKategorilerBirbirindenBagimsiz(): void
    {
        $r = self::byName(S::score([
            self::row('H21', 1500, 'OK', 'h1'),
            self::row('H21', 3000, 'OK', 'h2'),
            self::row('D21', 2000, 'OK', 'd1'),
            self::row('D21', 2500, 'OK', 'd2'),
        ]));
        $this->assertSame([1, 1000], [$r['h1']['position'], $r['h1']['points']]);
        $this->assertSame([1, 1000], [$r['d1']['position'], $r['d1']['points']]);
        $this->assertSame([2, 500], [$r['h2']['position'], $r['h2']['points']]);
        $this->assertSame([2, 800], [$r['d2']['position'], $r['d2']['points']]);
    }

    public function testSatirSirasiKorunur(): void
    {
        $in = [self::row('H21', 2000, 'OK', 'x'), self::row('H21', 1000, 'OK', 'y')];
        $out = S::score($in);
        $this->assertSame(['x', 'y'], array_column($out, 'first_name'));
    }

    // ---------- parseTime() ----------

    public function testParseTime(): void
    {
        $this->assertSame(29 * 60 + 17, S::parseTime('29:17'));
        $this->assertSame(3600 + 5 * 60 + 28, S::parseTime('1:05:28'));
        $this->assertSame(65, S::parseTime(' 1:05 '));
        $this->assertSame(125 * 60, S::parseTime('125:00'));
        foreach (['', '-', 'abc', '12', '1:2:3:4', '12:345', '1.05'] as $bad) {
            $this->assertNull(S::parseTime($bad), var_export($bad, true));
        }
    }

    // ---------- parseCsv() ----------

    /** OE2010 OE0012 düzeninde 50 kolonluk bir satır kurar (yalnızca okunan kolonlar dolu). */
    private static function csvLine(array $set): string
    {
        $c = array_fill(0, 50, '');
        foreach ($set as $i => $v) $c[$i] = $v;
        return implode(';', $c);
    }

    private static function oeCsv(array $rows): string
    {
        $header = array_fill(0, 50, 'Kolon');
        $header[0] = 'OE0012';
        $lines = [implode(';', $header)];
        foreach ($rows as $r) $lines[] = self::csvLine($r);
        return implode("\r\n", $lines) . "\r\n";
    }

    /** Okunan kolonlar: 3 çip, 5 soyad, 6 ad, 13 süre, 14 tasnif, 19/20 kulüp, 25 kat.kodu, 26 kat.adı, 35-37 text, 48 kiralık */
    private static function oeRow(string $first, string $last, string $time, string $cls, string $cat, array $extra = []): array
    {
        return [5 => $last, 6 => $first, 13 => $time, 14 => $cls, 19 => 'Ordu', 20 => 'GSK', 25 => $cat, 26 => $cat . ' Adı'] + $extra;
    }

    public function testCsvWindows1254TurkceKarakterVeKolonSirasi(): void
    {
        $tc = TcNoTest::makeTc('123456789');
        $utf8 = self::oeCsv([
            self::oeRow('Çağrı', 'Işıkoğlu', '29:17', '0', 'H21', [3 => '2001234', 36 => $tc]),
            self::oeRow('Şule', 'Güneş', '', '3', 'D16', [3 => '2009999', 48 => 'X']),
        ]);
        $cp1254 = iconv('UTF-8', 'Windows-1254', $utf8);
        $this->assertFalse((bool)preg_match('//u', $cp1254), 'fixture gerçekten UTF-8 dışı olmalı');

        $rows = S::parseCsv($cp1254);
        $this->assertCount(2, $rows);

        $a = $rows[0];
        $this->assertSame('Çağrı', $a['first_name']);
        $this->assertSame('Işıkoğlu', $a['last_name']);
        $this->assertSame('Ordu GSK', $a['club_name']);
        $this->assertSame('H21', $a['category_code']);
        $this->assertSame('H21 Adı', $a['category_name']);
        $this->assertSame(29 * 60 + 17, $a['time_sec']);
        $this->assertSame('OK', $a['status']);
        $this->assertSame('2001234', $a['chip']);
        $this->assertFalse($a['rented']);
        $this->assertSame($tc, $a['tc']);

        $b = $rows[1];
        $this->assertSame('Şule', $b['first_name']);
        $this->assertSame('MP', $b['status']);
        $this->assertNull($b['time_sec']);
        $this->assertTrue($b['rented']);
        $this->assertNull($b['tc']);
    }

    public function testCsvUtf8BomKabulEdilir(): void
    {
        $rows = S::parseCsv("\xEF\xBB\xBF" . self::oeCsv([self::oeRow('Ali', 'Veli', '10:00', '0', 'H12')]));
        $this->assertSame('Ali', $rows[0]['first_name']);
        $this->assertSame(600, $rows[0]['time_sec']);
    }

    public function testCsvTasnifKodlari(): void
    {
        $map = ['0' => 'OK', '1' => 'DNS', '2' => 'DNF', '3' => 'MP', '4' => 'DSQ', '5' => 'OT', '9' => 'NC', '' => 'NC'];
        $in = [];
        foreach ($map as $code => $_) $in[] = self::oeRow('A' . $code, 'B', '20:00', (string)$code, 'H21');
        $rows = S::parseCsv(self::oeCsv($in));
        $this->assertSame(array_values($map), array_column($rows, 'status'));
    }

    public function testSuresizOkSatiriPuanlanmaz(): void
    {
        $rows = S::parseCsv(self::oeCsv([
            self::oeRow('A', 'B', '', '0', 'H21'),
            self::oeRow('C', 'D', '0:00', '0', 'H21'),
        ]));
        $this->assertSame(['NC', 'NC'], array_column($rows, 'status'));
    }

    public function testTcIlkGecerliTextKolonundanAlinir(): void
    {
        $tc1 = TcNoTest::makeTc('111111111');
        $tc2 = TcNoTest::makeTc('222222222');
        $rows = S::parseCsv(self::oeCsv([
            self::oeRow('A', 'B', '20:00', '0', 'H21', [35 => 'not', 36 => '12345678901', 37 => $tc1]),
            self::oeRow('C', 'D', '20:00', '0', 'H21', [35 => $tc2, 37 => $tc1]),
        ]));
        $this->assertSame($tc1, $rows[0]['tc']); // geçersiz checksum'lı 36 atlanır
        $this->assertSame($tc2, $rows[1]['tc']);
    }

    public function testBosVeKategorisizSatirlarAtlanir(): void
    {
        $rows = S::parseCsv(self::oeCsv([
            self::oeRow('A', 'B', '20:00', '0', 'H21'),
            self::oeRow('', '', '20:00', '0', 'H21'),
            self::oeRow('C', 'D', '20:00', '0', ''),
        ]) . "\r\n\r\n");
        $this->assertCount(1, $rows);
    }

    public function testOeOlmayanDosyaReddedilir(): void
    {
        $this->expectException(ApiException::class);
        S::parseCsv("Ad;Soyad;Süre\nAli;Veli;10:00\n");
    }

    public function testAzKolonluDosyaReddedilir(): void
    {
        $this->expectException(ApiException::class);
        S::parseCsv("OE0012;a;b\n1;2;3\n");
    }

    public function testSatirsizDosyaReddedilir(): void
    {
        try {
            S::parseCsv(self::oeCsv([]));
            $this->fail('ApiException bekleniyordu');
        } catch (ApiException $e) {
            $this->assertSame('invalid_csv', $e->errorCode);
            $this->assertSame(422, $e->status);
        }
    }
}

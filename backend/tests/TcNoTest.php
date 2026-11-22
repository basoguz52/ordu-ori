<?php

namespace Tests;

use App\Support\TcNo;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class TcNoTest extends TestCase
{
    /** Kontrol basamaklarını hesaplayıp geçerli (uydurma) bir TC üretir. */
    public static function makeTc(string $first9): string
    {
        $d = array_map('intval', str_split($first9));
        $odd  = $d[0] + $d[2] + $d[4] + $d[6] + $d[8];
        $even = $d[1] + $d[3] + $d[5] + $d[7];
        $d10 = ((($odd * 7) - $even) % 10 + 10) % 10;
        $d11 = (array_sum($d) + $d10) % 10;
        return $first9 . $d10 . $d11;
    }

    public function testBilinenGecerliNumara(): void
    {
        $this->assertTrue(TcNo::isValid('10000000146'));
    }

    public function testUretilenNumaralarGecerli(): void
    {
        foreach (['123456789', '987654321', '555555555', '100000001'] as $n) {
            $this->assertTrue(TcNo::isValid(self::makeTc($n)), $n);
        }
    }

    /** @return array<string, array{string}> */
    public static function gecersizler(): array
    {
        return [
            'boş'               => [''],
            '10 hane'           => ['1000000014'],
            '12 hane'           => ['100000001460'],
            'sıfırla başlıyor'  => ['00000000146'],
            'harf var'          => ['1000000014a'],
            'boşluklu'          => [' 10000000146'],
            '10. hane yanlış'   => ['10000000156'],
            '11. hane yanlış'   => ['10000000147'],
        ];
    }

    #[DataProvider('gecersizler')]
    public function testGecersizNumaralar(string $tc): void
    {
        $this->assertFalse(TcNo::isValid($tc));
    }
}

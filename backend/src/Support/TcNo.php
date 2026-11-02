<?php

namespace App\Support;

/**
 * TC Kimlik No doğrulama (11 hane + iki kontrol basamağı).
 */
class TcNo
{
    public static function isValid(string $tc): bool
    {
        if (!preg_match('/^[1-9][0-9]{10}$/', $tc)) {
            return false;
        }
        $d = array_map('intval', str_split($tc));
        $odd  = $d[0] + $d[2] + $d[4] + $d[6] + $d[8];
        $even = $d[1] + $d[3] + $d[5] + $d[7];
        $d10 = ((($odd * 7) - $even) % 10 + 10) % 10;
        if ($d10 !== $d[9]) {
            return false;
        }
        $d11 = array_sum(array_slice($d, 0, 10)) % 10;
        return $d11 === $d[10];
    }
}

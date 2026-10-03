<?php

/**
 * Basit ortam değişkeni okuyucu.
 *
 * Öncelik sırası: $_ENV -> $_SERVER -> getenv().
 * Docker'da docker-compose `environment:` ile set eder; canlıda phpdotenv `backend/.env`'i
 * $_ENV'e yükler (bkz. bootstrap.php). Hiçbiri yoksa $default döner — bu sayede mevcut
 * local davranışı (config dosyalarındaki eski değerler) bozulmaz.
 */
if (!function_exists('env')) {
  function env(string $key, $default = null) {
    $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

    if ($value === false || $value === null || $value === '') {
      return $default;
    }

    switch (strtolower((string)$value)) {
      case 'true':
      case '(true)':
        return true;
      case 'false':
      case '(false)':
        return false;
      case 'null':
      case '(null)':
        return null;
    }

    // Tırnak içindeki değerleri temizle: "Destek Ordu" -> Destek Ordu
    if (strlen($value) > 1 && $value[0] === '"' && $value[-1] === '"') {
      return substr($value, 1, -1);
    }

    return $value;
  }
}

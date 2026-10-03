<?php

final class Db {
  private static ?PDO $pdo = null;

  public static function pdo(): PDO {
    if (self::$pdo) return self::$pdo;

    $cfg = require __DIR__ . '/../config/database.php';
    $dsn = sprintf(
      "mysql:host=%s;port=%d;dbname=%s;charset=%s",
      $cfg['host'],
      $cfg['port'],
      $cfg['dbname'],
      $cfg['charset'] ?? 'utf8mb4'
    );

    self::$pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return self::$pdo;
  }
}

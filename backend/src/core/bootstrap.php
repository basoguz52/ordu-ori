<?php

/**
 * Uygulama önyükleme (bootstrap).
 *
 * Bu dosya index.php'nin başında bir kez çağrılır. Her adım "varsa çalış" mantığıyla
 * korumalıdır: composer `vendor/` henüz üretilmemişse uygulama eski PDO yoluyla çalışmaya
 * devam eder (hiçbir şey kırılmaz).
 */

require_once __DIR__ . '/env.php';

// 1) Composer autoload (illuminate, phpdotenv, phpmailer)
$autoload = __DIR__ . '/../../vendor/autoload.php';
if (is_file($autoload)) {
  require_once $autoload;
}

// 2) backend/.env yükle (phpdotenv kuruluysa ve dosya varsa)
//    Docker'da değerler zaten ortam değişkeni; bu adım no-op olur.
if (class_exists(\Dotenv\Dotenv::class)) {
  $backendDir = dirname(__DIR__, 2); // backend/
  if (is_file($backendDir . '/.env')) {
    \Dotenv\Dotenv::createImmutable($backendDir)->safeLoad();
  }
}

// 3) Eloquent (Illuminate\Database) capsule — kuruluysa başlat.
if (class_exists(\Illuminate\Database\Capsule\Manager::class)) {
  $capsule = new \Illuminate\Database\Capsule\Manager();
  $capsule->addConnection([
    'driver'    => 'mysql',
    'host'      => env('DB_HOST', '127.0.0.1'),
    'port'      => (int) env('DB_PORT', 3306),
    'database'  => env('DB_DATABASE', 'orienteering'),
    'username'  => env('DB_USERNAME', 'root'),
    'password'  => env('DB_PASSWORD', ''),
    'charset'   => env('DB_CHARSET', 'utf8mb4'),
    'collation' => 'utf8mb4_unicode_ci',
    'prefix'    => '',
  ]);
  $capsule->setAsGlobal();   // Model::…  ve  Capsule::table(…) global erişilebilir
  $capsule->bootEloquent();
}

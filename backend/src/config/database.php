<?php

require_once __DIR__ . '/../core/env.php';

return [
  'host'    => env('DB_HOST', '127.0.0.1'),
  'port'    => (int) env('DB_PORT', 3306),
  'dbname'  => env('DB_DATABASE', 'orienteering'),
  'user'    => env('DB_USERNAME', 'root'),
  'pass'    => env('DB_PASSWORD', ''),
  'charset' => env('DB_CHARSET', 'utf8mb4'),
];

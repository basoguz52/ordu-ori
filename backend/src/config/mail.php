<?php

require_once __DIR__ . '/../core/env.php';

return [
    'debug' => (bool) env('MAIL_DEBUG', false),

    // cPanel > Email Accounts > Set Up Mail Client ekranından
    'smtp_host'   => env('SMTP_HOST', 'mail.orduoryantiring.com.tr'),
    'smtp_port'   => (int) env('SMTP_PORT', 465),  // 465 = SSL, 587 = TLS
    'smtp_secure' => env('SMTP_SECURE', 'ssl'),    // 'ssl' veya 'tls'

    'smtp_user'   => env('SMTP_USER', 'destek@orduoryantiring.com.tr'),
    // Şifre ARTIK kodda tutulmuyor; backend/.env -> SMTP_PASS'ten okunur.
    'smtp_pass'   => env('SMTP_PASS', ''),

    // Formun düşeceği adres
    'to'          => env('MAIL_TO', 'oryantiringordu@gmail.com'),

    // From mutlaka kendi domain mailbox olmalı (deliverability)
    'from'        => env('MAIL_FROM', 'destek@orduoryantiring.com.tr'),
    'from_name'   => env('MAIL_FROM_NAME', 'Destek Ordu Oryantiring'),
];

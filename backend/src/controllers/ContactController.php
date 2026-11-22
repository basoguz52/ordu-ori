<?php

use App\Support\Mailer;

final class ContactController
{
    public static function send(Request $req): void
    {
        $cfg = Mailer::config();
        $data = $req->json ?? [];

        // Honeypot (frontend'de gizli "website" alanı)
        if (!empty($data['website'] ?? '')) {
            Response::json(['ok' => true]);
            return;
        }

        $name    = trim((string)($data['name'] ?? ''));
        $email   = trim((string)($data['email'] ?? ''));
        $phone   = trim((string)($data['phone'] ?? ''));
        $subject = trim((string)($data['subject'] ?? ''));
        $message = trim((string)($data['message'] ?? ''));

        if ($name === '' || $email === '' || $subject === '' || $message === '') {
            Response::error('validation', 'Lütfen tüm alanları doldurun.', 400);
            return;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::error('validation', 'E-posta formatı geçersiz.', 400);
            return;
        }

        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

        $body =
            "Ad Soyad: {$name}\n" .
            "E-posta: {$email}\n" .
            "Telefon: " . ($phone !== '' ? $phone : '-') . "\n" .
            "IP: {$ip}\n\n" .
            "Mesaj:\n{$message}\n";

        // Basit rate limit: IP başına 30sn (shared hosting için yeterli)
        $rateFile = sys_get_temp_dir() . '/contact_rate_' . md5($ip);
        $now = time();
        $last = is_file($rateFile) ? (int)@file_get_contents($rateFile) : 0;
        if ($now - $last < 30) {
            Response::error('rate_limit', 'Çok hızlı gönderim. Lütfen biraz bekleyin.', 429);
            return;
        }
        @file_put_contents($rateFile, (string)$now);

        if (!Mailer::send($cfg['to'], '[İletişim] ' . $subject, $body, $email, $name)) {
            Response::error('mail_failed', 'Mail gönderilemedi. SMTP ayarlarını kontrol edin.', 500);
            return;
        }
        Response::json(!empty($cfg['debug']) ? ['ok' => true, 'debug' => true] : ['ok' => true]);
    }
}

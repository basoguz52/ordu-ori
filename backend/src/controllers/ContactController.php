<?php

use PHPMailer\PHPMailer\PHPMailer;

final class ContactController
{
    public static function send(Request $req): void
    {
        $cfg = require __DIR__ . '/../config/mail.php';
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

        // Debug modunda gerçekten mail atma, logla (eski $body tanımsız bug'ı düzeltildi)
        if (!empty($cfg['debug'])) {
            error_log("[CONTACT DEBUG]\n" . $body);
            Response::json(['ok' => true, 'debug' => true]);
            return;
        }

        // Basit rate limit: IP başına 30sn (shared hosting için yeterli)
        $rateFile = sys_get_temp_dir() . '/contact_rate_' . md5($ip);
        $now = time();
        $last = is_file($rateFile) ? (int)@file_get_contents($rateFile) : 0;
        if ($now - $last < 30) {
            Response::error('rate_limit', 'Çok hızlı gönderim. Lütfen biraz bekleyin.', 429);
            return;
        }
        @file_put_contents($rateFile, (string)$now);

        // PHPMailer (Composer autoload — manuel include kaldırıldı)
        $mail = new PHPMailer(true);

        try {
            $mail->CharSet = 'UTF-8';
            $mail->isSMTP();
            $mail->Host = $cfg['smtp_host'];
            $mail->SMTPAuth = true;
            $mail->Username = $cfg['smtp_user'];
            $mail->Password = $cfg['smtp_pass'];
            $mail->Port = (int)$cfg['smtp_port'];
            $mail->SMTPSecure = $cfg['smtp_secure']; // 'ssl' or 'tls'

            // From: kendi domain mailbox
            $mail->setFrom($cfg['from'], $cfg['from_name']);
            $mail->addAddress($cfg['to']);

            // Reply-To: formu dolduran kişi
            $mail->addReplyTo($email, $name);

            $mail->Subject = '[İletişim] ' . $subject;
            $mail->Body = $body;

            $mail->send();
            Response::json(['ok' => true]);
        } catch (\Throwable $e) {
            Response::error('mail_failed', 'Mail gönderilemedi. SMTP ayarlarını kontrol edin.', 500);
        }
    }
}

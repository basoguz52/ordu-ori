<?php

namespace App\Support;

use PHPMailer\PHPMailer\PHPMailer;

/**
 * SMTP ile düz metin e-posta gönderimi (ayarlar: src/config/mail.php ← .env).
 * MAIL_DEBUG açıkken gerçekten göndermez, error_log'a yazar.
 */
final class Mailer
{
  public static function config(): array
  {
    return require __DIR__ . '/../config/mail.php';
  }

  /** @return bool true = gönderildi (veya debug'da loglandı) */
  public static function send(
    string $to,
    string $subject,
    string $body,
    ?string $replyTo = null,
    ?string $replyName = null
  ): bool {
    $cfg = self::config();

    if (!empty($cfg['debug'])) {
      error_log("[MAIL DEBUG] To: {$to}\nSubject: {$subject}\n\n{$body}");
      return true;
    }

    try {
      $mail = new PHPMailer(true);
      $mail->CharSet = 'UTF-8';
      $mail->isSMTP();
      $mail->Host = $cfg['smtp_host'];
      $mail->SMTPAuth = true;
      $mail->Username = $cfg['smtp_user'];
      $mail->Password = $cfg['smtp_pass'];
      $mail->Port = (int)$cfg['smtp_port'];
      $mail->SMTPSecure = $cfg['smtp_secure']; // 'ssl' or 'tls'

      // From mutlaka kendi domain mailbox olmalı (deliverability)
      $mail->setFrom($cfg['from'], $cfg['from_name']);
      $mail->addAddress($to);
      if ($replyTo !== null) {
        $mail->addReplyTo($replyTo, $replyName ?? '');
      }

      $mail->Subject = $subject;
      $mail->Body = $body;
      $mail->send();
      return true;
    } catch (\Throwable $e) {
      error_log('[MAIL] gönderilemedi: ' . $e->getMessage());
      return false;
    }
  }
}

<?php

/**
 * CSRF koruması — SPA + session-cookie auth için double-submit token.
 *
 * - Token session'da tutulur (`$_SESSION['csrf_token']`).
 * - JS'in okuyabilmesi için `XSRF-TOKEN` cookie'sine yazılır (HttpOnly DEĞİL).
 * - Frontend bu cookie'yi okuyup mutasyon isteklerinde `X-CSRF-Token`
 *   header'ı olarak geri gönderir; burada session token ile karşılaştırılır.
 * - Güvenli metodlar (GET/HEAD/OPTIONS) ve ön-yetki uçları (login/register/contact)
 *   muaftır (henüz oturum/token yokken çalışabilmeleri gerekir).
 */
final class Csrf
{
  const COOKIE = 'XSRF-TOKEN';
  const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
  const EXEMPT_PATHS = ['/api/login', '/api/register', '/api/contact'];

  /** Session token'ını döndür; yoksa üret. */
  public static function token(): string
  {
    if (empty($_SESSION['csrf_token'])) {
      $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
  }

  /** Token'ı frontend'in okuyabileceği cookie olarak yaz (değişmişse). */
  public static function setCookie(): void
  {
    $t = self::token();
    if (($_COOKIE[self::COOKIE] ?? null) === $t) {
      return; // cookie zaten güncel
    }
    $secure = (($_SERVER['HTTPS'] ?? '') === 'on')
      || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    setcookie(self::COOKIE, $t, [
      'expires'  => 0,
      'path'     => '/',
      'secure'   => $secure,
      'httponly' => false, // frontend okumalı
      'samesite' => 'Lax',
    ]);
    $_COOKIE[self::COOKIE] = $t;
  }

  /** Mutasyon isteğinde header token'ını session ile karşılaştır; uyumsuzsa 419. */
  public static function verify(Request $req): void
  {
    if (in_array($req->method, self::SAFE_METHODS, true)) {
      return;
    }
    if (in_array($req->path, self::EXEMPT_PATHS, true)) {
      return;
    }

    $sent = (string) ($req->headers['x-csrf-token'] ?? '');
    $sess = (string) ($_SESSION['csrf_token'] ?? '');

    if ($sess === '' || $sent === '' || !hash_equals($sess, $sent)) {
      http_response_code(403);
      header('Content-Type: application/json; charset=utf-8');
      echo json_encode([
        'error' => [
          'code'    => 'csrf_mismatch',
          'message' => 'CSRF token missing or invalid',
        ],
      ]);
      exit;
    }
  }
}

<?php

use App\Models\User;
use App\Support\Mailer;

final class AuthController
{
  /** Hatalı deneme penceresi (dakika) ve sınırları */
  private const ATTEMPT_WINDOW_MIN = 15;
  private const MAX_FAILS_PER_EMAIL = 5;
  private const MAX_FAILS_PER_IP = 20;
  private const MAX_RESET_REQUESTS_PER_IP = 5;
  private const RESET_TOKEN_TTL_MIN = 60;

  private static function clientIp(): string
  {
    return substr((string)($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 0, 45);
  }

  /** Son ATTEMPT_WINDOW_MIN dakikadaki deneme sayısı (kind + e-posta veya IP). */
  private static function countAttempts(string $kind, string $column, string $value): int
  {
    $col = $column === 'email' ? 'email' : 'ip';
    $st = Db::pdo()->prepare(
      "SELECT COUNT(*) FROM login_attempts
        WHERE kind = ? AND {$col} = ? AND created_at > NOW() - INTERVAL " . self::ATTEMPT_WINDOW_MIN . " MINUTE"
    );
    $st->execute([$kind, $value]);
    return (int)$st->fetchColumn();
  }

  private static function recordAttempt(string $kind, ?string $email): void
  {
    $pdo = Db::pdo();
    $pdo->prepare('INSERT INTO login_attempts (kind, email, ip) VALUES (?, ?, ?)')
      ->execute([$kind, $email, self::clientIp()]);
    // Eski kayıtları temizle (tablo şişmesin)
    $pdo->exec('DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL 1 DAY');
  }

  private static function tooManyAttempts(string $what = 'hatalı deneme'): void
  {
    Response::error(
      'too_many_attempts',
      "Çok fazla {$what}. Lütfen " . self::ATTEMPT_WINDOW_MIN . ' dakika sonra tekrar deneyin.',
      429
    );
  }

  /** Public kullanıcı gösterimi (parola hash'i asla dönmez). */
  private static function publicUser(User $u): array
  {
    return [
      'id'              => (int) $u->id,
      'email'           => $u->email,
      'full_name'       => $u->full_name,
      'phone_number'    => $u->phone_number,
      'is_referee'      => (bool) $u->is_referee,
      'is_club_manager' => (bool) $u->is_club_manager,
      'is_admin'        => (bool) $u->is_admin,
    ];
  }

  public static function login(Request $req): void
  {
    $body = $req->json ?? [];
    $email = strtolower(trim((string)($body['email'] ?? '')));
    $password = (string)($body['password'] ?? '');

    if ($email === '' || $password === '') {
      Response::error('validation_error', 'email and password required', 422);
      return;
    }

    if (self::countAttempts('login', 'email', $email) >= self::MAX_FAILS_PER_EMAIL
      || self::countAttempts('login', 'ip', self::clientIp()) >= self::MAX_FAILS_PER_IP) {
      self::tooManyAttempts();
      return;
    }

    $u = User::where('email', $email)->first();

    if (!$u || !password_verify($password, $u->password_hash)) {
      self::recordAttempt('login', $email);
      Response::error('invalid_credentials', 'Invalid email or password', 401);
      return;
    }

    // Başarılı giriş: bu e-postanın hatalı deneme sayacı sıfırlanır
    Db::pdo()->prepare("DELETE FROM login_attempts WHERE kind = 'login' AND email = ?")->execute([$email]);

    // Hesap durumu: pending (admin onayı bekliyor) / rejected girişe kapalı
    $status = $u->status ?? 'active';
    if ($status !== 'active') {
      $msg = $status === 'rejected'
        ? 'Your account was not approved'
        : 'Your account is awaiting admin approval';
      Response::error('account_' . $status, $msg, 403);
      return;
    }

    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $u->id;

    Response::json(['user' => self::publicUser($u)]);
  }

  public static function me(Request $req): void
  {
    $uid = Auth::userId();
    if (!$uid) {
      Response::json(['user' => null]);
      return;
    }

    $u = User::find($uid);
    if (!$u) {
      $_SESSION = [];
      session_destroy();
      Response::json(['user' => null]);
      return;
    }

    // Yönettiği kulüp (clubs.manager_user_id -> users.id), yoksa null
    $club = $u->managedClub;

    $data = self::publicUser($u);
    $data['club'] = $club ? [
      'id'   => (int) $club->id,
      'name' => $club->name,
      'code' => $club->code,
    ] : null;

    Response::json(['user' => $data]);
  }

  /**
   * Öz-kayıt: yeni kullanıcı (kulüp yöneticisi adayı) hesabı açar.
   * status = pending; admin onaylayana kadar giriş yapamaz.
   */
  public static function register(Request $req): void
  {
    $b = $req->json ?? [];
    $full     = trim((string)($b['full_name'] ?? ''));
    $email    = strtolower(trim((string)($b['email'] ?? '')));
    $password = (string)($b['password'] ?? '');
    $phone    = trim((string)($b['phone_number'] ?? ''));

    if ($full === '' || $email === '' || $password === '') {
      Response::error('validation_error', 'full_name, email, password required', 422);
      return;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
      Response::error('validation_error', 'Invalid email address', 422);
      return;
    }
    if (strlen($password) < 8) {
      Response::error('validation_error', 'Password must be at least 8 characters', 422);
      return;
    }
    if (User::where('email', $email)->exists()) {
      Response::error('email_taken', 'This email is already registered', 409);
      return;
    }

    $u = new User();
    $u->email         = $email;
    $u->password_hash = password_hash($password, PASSWORD_DEFAULT);
    $u->full_name     = $full;
    $u->phone_number  = $phone !== '' ? $phone : null;
    $u->is_referee      = false;
    $u->is_club_manager = false;
    $u->is_admin        = false;
    $u->status          = 'pending';
    $u->save();

    Response::json([
      'message' => 'Registration received. Your account is awaiting admin approval.',
      'user'    => self::publicUser($u),
    ], 201);
  }

  /** PUT /api/me/profile — genel kullanıcı kendi ad/telefon bilgisini günceller. */
  public static function updateProfile(Request $req): void
  {
    $uid = Auth::userId();
    if (!$uid) {
      Response::error('unauthorized', 'Login required', 401);
      return;
    }
    $u = User::find($uid);
    if (!$u) {
      Response::error('not_found', 'User not found', 404);
      return;
    }

    $b = $req->json ?? [];
    if (array_key_exists('full_name', $b)) {
      $fn = trim((string)$b['full_name']);
      if ($fn === '') {
        Response::error('validation_error', 'full_name cannot be empty', 422);
        return;
      }
      $u->full_name = $fn;
    }
    if (array_key_exists('phone_number', $b)) {
      $ph = trim((string)$b['phone_number']);
      $u->phone_number = $ph !== '' ? $ph : null;
    }
    $u->save();

    Response::json(['user' => self::publicUser($u)]);
  }

  public static function logout(Request $req): void
  {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
      $params = session_get_cookie_params();
      setcookie(
        session_name(),
        '',
        time() - 42000,
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
      );
    }
    session_destroy();
    Response::noContent(204);
  }

  public static function changePassword(Request $req): void
  {
    $uid = Auth::userId();
    if (!$uid) {
      Response::error('unauthorized', 'Login required', 401);
      return;
    }

    $body = $req->json ?? [];
    $current = (string)($body['current_password'] ?? '');
    $next    = (string)($body['new_password'] ?? '');
    $confirm = (string)($body['new_password_confirm'] ?? '');

    if ($current === '' || $next === '' || $confirm === '') {
      Response::error('validation_error', 'current_password, new_password, new_password_confirm required', 422);
      return;
    }
    if ($next !== $confirm) {
      Response::error('validation_error', 'New passwords do not match', 422);
      return;
    }
    if (strlen($next) < 8) {
      Response::error('validation_error', 'New password must be at least 8 characters', 422);
      return;
    }

    $u = User::find($uid);
    if (!$u) {
      Response::error('not_found', 'User not found', 404);
      return;
    }
    if (!password_verify($current, $u->password_hash)) {
      Response::error('invalid_credentials', 'Current password is incorrect', 401);
      return;
    }
    if (password_verify($next, $u->password_hash)) {
      Response::error('validation_error', 'New password must be different from current password', 422);
      return;
    }

    $u->password_hash = password_hash($next, PASSWORD_DEFAULT);
    $u->save();

    // Session fixation'a karşı iyi pratik
    session_regenerate_id(true);

    Response::noContent(204);
  }

  /**
   * POST /api/auth/forgot-password {email}
   * Hesap varsa ve aktifse e-postaya 1 saatlik sıfırlama bağlantısı yollar.
   * Yanıt hesap olsun olmasın aynıdır (hangi e-postaların kayıtlı olduğu sızmasın).
   */
  public static function forgotPassword(Request $req): void
  {
    $email = strtolower(trim((string)(($req->json ?? [])['email'] ?? '')));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
      Response::error('validation_error', 'Geçerli bir e-posta adresi girin.', 422);
      return;
    }

    if (self::countAttempts('reset', 'ip', self::clientIp()) >= self::MAX_RESET_REQUESTS_PER_IP) {
      self::tooManyAttempts('şifre sıfırlama isteği');
      return;
    }
    self::recordAttempt('reset', $email);

    $u = User::where('email', $email)->first();
    if ($u && ($u->status ?? 'active') === 'active') {
      $token = bin2hex(random_bytes(32));
      $pdo = Db::pdo();
      // Önceki kullanılmamış bağlantılar geçersiz olur; yalnızca en sonuncusu çalışır
      $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([(int)$u->id]);
      $pdo->prepare(
        'INSERT INTO password_resets (user_id, token_hash, expires_at)
         VALUES (?, ?, NOW() + INTERVAL ' . self::RESET_TOKEN_TTL_MIN . ' MINUTE)'
      )->execute([(int)$u->id, hash('sha256', $token)]);

      $link = self::appUrl() . '/sifre-sifirla?token=' . $token;
      $body =
        "Merhaba {$u->full_name},\n\n" .
        "orduoryantiring.com.tr hesabınız için şifre sıfırlama isteği aldık.\n" .
        "Yeni şifre belirlemek için aşağıdaki bağlantıyı açın (1 saat geçerlidir):\n\n" .
        "{$link}\n\n" .
        "Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın; şifreniz değişmez.\n";

      if (!Mailer::send($u->email, 'Şifre sıfırlama — Ordu Oryantiring', $body)) {
        Response::error('mail_failed', 'E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.', 500);
        return;
      }
    }

    Response::json(['ok' => true]);
  }

  /** POST /api/auth/reset-password {token, password, password_confirm} */
  public static function resetPassword(Request $req): void
  {
    $b = $req->json ?? [];
    $token   = trim((string)($b['token'] ?? ''));
    $next    = (string)($b['password'] ?? '');
    $confirm = (string)($b['password_confirm'] ?? '');

    if ($token === '' || $next === '' || $confirm === '') {
      Response::error('validation_error', 'token, password, password_confirm required', 422);
      return;
    }
    if ($next !== $confirm) {
      Response::error('validation_error', 'Şifreler eşleşmiyor.', 422);
      return;
    }
    if (strlen($next) < 8) {
      Response::error('validation_error', 'Şifre en az 8 karakter olmalı.', 422);
      return;
    }

    $pdo = Db::pdo();
    $st = $pdo->prepare(
      'SELECT id, user_id FROM password_resets
        WHERE token_hash = ? AND expires_at > NOW()'
    );
    $st->execute([hash('sha256', $token)]);
    $row = $st->fetch();
    $u = $row ? User::find((int)$row['user_id']) : null;
    if (!$u || ($u->status ?? 'active') !== 'active') {
      Response::error('invalid_token', 'Bağlantı geçersiz veya süresi dolmuş. Yeniden şifre sıfırlama isteyin.', 400);
      return;
    }

    $u->password_hash = password_hash($next, PASSWORD_DEFAULT);
    $u->save();

    // Bağlantı tek kullanımlık: kullanıcının tüm sıfırlama kayıtları silinir
    $pdo->prepare('DELETE FROM password_resets WHERE user_id = ?')->execute([(int)$u->id]);
    $pdo->prepare("DELETE FROM login_attempts WHERE kind = 'login' AND email = ?")->execute([$u->email]);

    Response::noContent(204);
  }

  /** E-postadaki bağlantı için site adresi: .env APP_URL, yoksa isteğin host'u. */
  private static function appUrl(): string
  {
    $url = rtrim((string)env('APP_URL', ''), '/');
    if ($url !== '') return $url;
    $https = (($_SERVER['HTTPS'] ?? '') === 'on')
      || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    $host = (string)($_SERVER['HTTP_HOST'] ?? 'orduoryantiring.com.tr');
    return ($https ? 'https' : 'http') . '://' . $host;
  }
}

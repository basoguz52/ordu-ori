<?php

use App\Models\User;

final class AuthController
{
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

    $u = User::where('email', $email)->first();

    if (!$u || !password_verify($password, $u->password_hash)) {
      Response::error('invalid_credentials', 'Invalid email or password', 401);
      return;
    }

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
}

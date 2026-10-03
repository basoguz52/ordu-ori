<?php

use App\Models\User;

/**
 * Tek yetki/policy katmanı.
 *
 * Roller: is_admin (süper kullanıcı — tüm requireRole kontrollerini geçer),
 *         is_club_manager, is_referee. Hesap durumu: status = active|pending|rejected.
 *
 * Not: RequireAuth::run() geriye dönük uyumluluk için Auth::requireUserId()'e delege eder.
 */
final class Auth
{
  public static function userId(): ?int
  {
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
  }

  public static function requireUserId(): int
  {
    $uid = self::userId();
    if (!$uid) {
      Response::error('unauthorized', 'Login required', 401);
      exit;
    }
    return $uid;
  }

  /** Oturumdaki kullanıcı (Eloquent) veya null. */
  public static function user(): ?User
  {
    $uid = self::userId();
    return $uid ? User::find($uid) : null;
  }

  /** Giriş yapmış ve hesabı aktif kullanıcıyı zorunlu kılar. */
  public static function requireUser(): User
  {
    $u = self::user();
    if (!$u) {
      Response::error('unauthorized', 'Login required', 401);
      exit;
    }
    if (($u->status ?? 'active') !== 'active') {
      Response::error('account_not_active', 'Account is not active', 403);
      exit;
    }
    return $u;
  }

  /**
   * Verilen rollerden en az birine (veya admin süper kullanıcıya) sahip olmayı zorunlu kılar.
   * @param string[] $roles  'admin' | 'club_manager' | 'referee'
   */
  public static function requireRole(array $roles): User
  {
    $u = self::requireUser();

    if ($u->is_admin) {
      return $u; // admin süper kullanıcı: her yetkiyi geçer
    }

    $ok = false;
    if (in_array('club_manager', $roles, true) && $u->is_club_manager) $ok = true;
    if (in_array('referee', $roles, true) && $u->is_referee) $ok = true;

    if (!$ok) {
      Response::error('forbidden', 'Insufficient permissions', 403);
      exit;
    }

    return $u;
  }

  /** Yalnızca admin. */
  public static function requireAdmin(): User
  {
    $u = self::requireUser();
    if (!$u->is_admin) {
      Response::error('forbidden', 'Admin privileges required', 403);
      exit;
    }
    return $u;
  }
}

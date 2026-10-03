<?php

use App\Models\User;
use App\Models\Club;
use App\Models\Event;
use App\Models\EventReferee;
use App\Models\RefereeEventPreference;

/**
 * Admin: kullanıcı yönetimi (öz-kayıt onay akışı + kulüp yöneticisi atama).
 * Tüm uçlar Auth::requireAdmin() ile korunur.
 */
final class AdminController
{
  private static function userRow(User $u): array
  {
    $club = $u->managedClub;
    return [
      'id'              => (int) $u->id,
      'email'           => $u->email,
      'full_name'       => $u->full_name,
      'phone_number'    => $u->phone_number,
      'is_referee'      => (bool) $u->is_referee,
      'is_club_manager' => (bool) $u->is_club_manager,
      'is_admin'        => (bool) $u->is_admin,
      'status'          => $u->status,
      'created_at'      => $u->created_at ? $u->created_at->format('Y-m-d H:i:s') : null,
      'club'            => $club ? ['id' => (int) $club->id, 'name' => $club->name, 'code' => $club->code] : null,
    ];
  }

  /** GET /api/admin/users?status=pending|active|rejected (status opsiyonel) */
  public static function listUsers(Request $req): void
  {
    Auth::requireAdmin();

    $status = trim((string)($req->query['status'] ?? ''));
    $q = User::query();
    if ($status !== '') {
      $q->where('status', $status);
    }
    $users = $q->orderBy('created_at', 'desc')->get();

    Response::json(['items' => $users->map(fn($u) => self::userRow($u))->all()]);
  }

  /**
   * POST /api/admin/users/{id}/approve
   * body: { is_club_manager?: bool, club_id?: int, club_name?: string, club_code?: string }
   * status=active yapar; istenirse kulüp yöneticisi rolü + kulüp ataması.
   */
  public static function approveUser(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $u = User::find((int)($params['id'] ?? 0));
    if (!$u) {
      Response::error('not_found', 'User not found', 404);
      return;
    }

    $b = $req->json ?? [];
    $makeManager = (bool)($b['is_club_manager'] ?? false);
    $clubId      = (int)($b['club_id'] ?? 0);
    $clubName    = trim((string)($b['club_name'] ?? ''));
    $clubCode    = trim((string)($b['club_code'] ?? ''));

    $u->status = 'active';
    if ($makeManager) {
      $u->is_club_manager = true;
    }
    $u->save();

    if ($makeManager) {
      $club = null;
      if ($clubId > 0) {
        $club = Club::find($clubId);
        if (!$club) {
          Response::error('club_not_found', 'Club not found', 404);
          return;
        }
      } elseif ($clubName !== '') {
        $club = new Club();
        $club->name = $clubName;
        $club->code = $clubCode !== '' ? $clubCode : mb_substr($clubName, 0, 32);
      }
      if ($club) {
        $club->manager_user_id = $u->id;
        $club->save();
      }
    }

    Response::json(['message' => 'User approved', 'user' => self::userRow($u->fresh())]);
  }

  /** POST /api/admin/users/{id}/reject */
  public static function rejectUser(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $u = User::find((int)($params['id'] ?? 0));
    if (!$u) {
      Response::error('not_found', 'User not found', 404);
      return;
    }

    $u->status = 'rejected';
    $u->save();

    Response::noContent(204);
  }

  /**
   * POST /api/admin/users/{id}/assign-club
   * body: { club_id: int }
   * Var olan bir kullanıcıyı bir kulübe yönetici atar.
   */
  public static function assignClubManager(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $u = User::find((int)($params['id'] ?? 0));
    if (!$u) {
      Response::error('not_found', 'User not found', 404);
      return;
    }

    $clubId = (int)(($req->json ?? [])['club_id'] ?? 0);
    $club = Club::find($clubId);
    if (!$club) {
      Response::error('club_not_found', 'Club not found', 404);
      return;
    }

    $u->is_club_manager = true;
    $u->save();

    $club->manager_user_id = $u->id;
    $club->save();

    Response::json(['message' => 'Club manager assigned', 'user_id' => (int) $u->id, 'club_id' => (int) $club->id]);
  }

  // ---------- Hakem atama (event_referees) ----------

  /** GET /api/admin/events/{id}/referees — atanmışlar + hakem tercihleri */
  public static function listEventReferees(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $eventId = (int)($params['id'] ?? 0);
    if (!Event::find($eventId)) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }

    $assigned = EventReferee::with(['user', 'refereeType'])
      ->where('event_id', $eventId)->get()
      ->map(fn(EventReferee $a) => [
        'user_id'      => (int) $a->user_id,
        'full_name'    => $a->user?->full_name,
        'referee_type' => $a->refereeType ? ['id' => (int)$a->refereeType->id, 'code' => $a->refereeType->code, 'name' => $a->refereeType->name] : null,
      ])->all();

    $preferences = RefereeEventPreference::with('user')
      ->where('event_id', $eventId)->get()
      ->map(fn(RefereeEventPreference $p) => [
        'user_id'                   => (int) $p->user_id,
        'full_name'                 => $p->user?->full_name,
        'wants_to_serve'            => (bool) $p->wants_to_serve,
        'note'                      => $p->note,
        'preferred_referee_type_id' => $p->preferred_referee_type_id !== null ? (int)$p->preferred_referee_type_id : null,
      ])->all();

    Response::json(['assigned' => $assigned, 'preferences' => $preferences]);
  }

  /** POST /api/admin/events/{id}/referees  body: { user_id, referee_type_id } */
  public static function assignReferee(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $eventId = (int)($params['id'] ?? 0);
    if (!Event::find($eventId)) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }

    $b = $req->json ?? [];
    $uid = (int)($b['user_id'] ?? 0);
    $typeId = (int)($b['referee_type_id'] ?? 0);
    if ($uid <= 0 || $typeId <= 0) {
      Response::error('validation_error', 'user_id and referee_type_id required', 422);
      return;
    }

    $u = User::find($uid);
    if (!$u || !$u->is_referee) {
      Response::error('validation_error', 'User is not a referee', 422);
      return;
    }

    $er = EventReferee::firstOrNew(['event_id' => $eventId, 'user_id' => $uid]);
    $er->referee_type_id = $typeId;
    $er->save();

    Response::json(['event_id' => $eventId, 'user_id' => $uid, 'referee_type_id' => $typeId], 201);
  }

  /** DELETE /api/admin/events/{id}/referees/{userId} */
  public static function unassignReferee(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $eventId = (int)($params['id'] ?? 0);
    $uid = (int)($params['userId'] ?? 0);

    $er = EventReferee::where('event_id', $eventId)->where('user_id', $uid)->first();
    if (!$er) {
      Response::error('not_found', 'Assignment not found', 404);
      return;
    }
    $er->delete();
    Response::noContent(204);
  }

  /**
   * GET /api/admin/storage-check
   *
   * Gizli depolamanın (SKB) gerçekten web'den erişilemez olduğunu ölçer:
   * geçici bir işaret dosyası yazar, mod `htaccess_guarded` ise dosyanın public
   * URL'ini sunucunun kendisinden HTTP ile çekmeyi dener, sonra dosyayı siler.
   *
   * http_accessible: true  -> dosya web'den indirilebiliyor (GÜVENSİZ)
   *                  false -> engellendi (güvenli)
   *                  null  -> dosyanın public URL'i yok (web kökü dışında)
   */
  public static function storageCheck(Request $req): void
  {
    Auth::requireAdmin();

    $info = PrivateStorage::info();
    $info['http_accessible'] = null;
    $info['checked_url'] = null;

    $key = '_check/' . bin2hex(random_bytes(8)) . '.txt';
    $abs = PrivateStorage::path($key);
    if ($abs === null) {
      Response::json($info);
      return;
    }

    $dir = dirname($abs);
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    if (@file_put_contents($abs, 'storage-check') === false) {
      $info['writable'] = false;
      Response::json($info);
      return;
    }

    $url = PrivateStorage::publicUrlForCheck($key);
    if ($url !== null) {
      $info['checked_url'] = $url;
      $info['http_accessible'] = self::urlReturnsContent($url, 'storage-check');
    }

    @unlink($abs);
    Response::json($info);
  }

  /** URL kısa bir istekle çekilip beklenen içeriği döndürüyor mu? */
  private static function urlReturnsContent(string $url, string $needle): ?bool
  {
    $body = null;

    if (function_exists('curl_init')) {
      $ch = curl_init($url);
      curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 3,
        CURLOPT_CONNECTTIMEOUT => 2,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => false,
      ]);
      $res = curl_exec($ch);
      $code = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
      curl_close($ch);
      if ($res === false) return null;
      $body = $code === 200 ? (string)$res : '';
    } else {
      $ctx = stream_context_create([
        'http' => ['timeout' => 3, 'ignore_errors' => true],
        'ssl'  => ['verify_peer' => false, 'verify_peer_name' => false],
      ]);
      $res = @file_get_contents($url, false, $ctx);
      if ($res === false) return null;
      $body = (string)$res;
    }

    return str_contains($body, $needle);
  }
}

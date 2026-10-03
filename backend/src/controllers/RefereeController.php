<?php

use App\Models\Event;
use App\Models\EventReferee;
use App\Models\RefereeEventPreference;
use App\Models\RefereeProfile;
use App\Models\RefereeType;
use App\Support\ApiException;
use App\Support\Uploads;

/**
 * Hakem kendi profilini yönetir (self-service). Yetki: Auth::requireRole(['referee'])
 * (admin superuser olarak da geçer).
 */
final class RefereeController
{
  private static function profilePayload(\App\Models\User $user, ?RefereeProfile $prof): array
  {
    $type = $prof ? $prof->defaultRefereeType : null;
    return [
      'user' => [
        'id'           => (int) $user->id,
        'full_name'    => $user->full_name,
        'phone_number' => $user->phone_number,
        'email'        => $user->email,
      ],
      'license_no'              => $prof->license_no ?? null,
      'registry_no'             => $prof->registry_no ?? null,
      'bio'                     => $prof->bio ?? null,
      'photo_url'               => Uploads::publicUrl($prof->photo_path ?? null),
      'default_referee_type_id' => $prof && $prof->default_referee_type_id !== null ? (int)$prof->default_referee_type_id : null,
      'default_referee_type'    => $type ? ['id' => (int)$type->id, 'code' => $type->code, 'name' => $type->name] : null,
    ];
  }

  /** GET /api/referee-types — profil/tercih seçimleri için (hakem+admin). */
  public static function listTypes(Request $req): void
  {
    Auth::requireRole(['referee']);
    $types = RefereeType::orderBy('id')->get(['id', 'code', 'name']);
    Response::json(['items' => $types->all()]);
  }

  /** GET /api/me/referee-profile */
  public static function getProfile(Request $req): void
  {
    $user = Auth::requireRole(['referee']);
    $prof = $user->refereeProfile;
    Response::json(self::profilePayload($user, $prof));
  }

  /** PUT /api/me/referee-profile  — users.full_name/phone + referee_profiles upsert */
  public static function updateProfile(Request $req): void
  {
    $user = Auth::requireRole(['referee']);
    $b = $req->json ?? [];

    // users tarafındaki alanlar
    if (array_key_exists('full_name', $b)) {
      $fn = trim((string)$b['full_name']);
      if ($fn === '') {
        Response::error('validation_error', 'full_name cannot be empty', 422);
        return;
      }
      $user->full_name = $fn;
    }
    if (array_key_exists('phone_number', $b)) {
      $ph = trim((string)$b['phone_number']);
      $user->phone_number = $ph !== '' ? $ph : null;
    }
    if ($user->isDirty()) {
      $user->save();
    }

    // referee_profiles upsert
    $prof = $user->refereeProfile ?: new RefereeProfile(['user_id' => $user->id]);

    foreach (['license_no', 'registry_no', 'bio'] as $f) {
      if (array_key_exists($f, $b)) {
        $v = $b[$f];
        $prof->$f = ($v === null || trim((string)$v) === '') ? null : trim((string)$v);
      }
    }
    if (array_key_exists('default_referee_type_id', $b)) {
      $v = $b['default_referee_type_id'];
      $prof->default_referee_type_id = ($v === null || $v === '' || (int)$v <= 0) ? null : (int)$v;
    }

    $prof->user_id = $user->id;
    $prof->save();

    Response::json(self::profilePayload($user->fresh(), $prof->fresh()));
  }

  /** POST /api/me/referee-profile/photo  (form-data: photo) */
  public static function uploadPhoto(Request $req): void
  {
    $user = Auth::requireRole(['referee']);

    try {
      $stored = Uploads::storeImage('photo', 'referees/' . $user->id, 'photo');
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
      return;
    }

    $prof = $user->refereeProfile ?: new RefereeProfile(['user_id' => $user->id]);
    Uploads::deleteByKey($prof->photo_path);
    $prof->user_id = $user->id;
    $prof->photo_path = $stored['storage_key'];
    $prof->save();

    Response::json(['photo_url' => Uploads::publicUrl($prof->photo_path)], 201);
  }

  /**
   * GET /api/me/referee/events
   * Tüm yarışlar + hakemin tercihi + fiili atama (event_referees) + geçmiş bilgisi.
   */
  public static function listEvents(Request $req): void
  {
    $user = Auth::requireRole(['referee']);

    $events = Event::orderByDesc('start_date')->orderByDesc('id')->get();
    $prefs = RefereeEventPreference::where('user_id', $user->id)->get()->keyBy('event_id');
    $assigns = EventReferee::with('refereeType')->where('user_id', $user->id)->get()->keyBy('event_id');
    $today = date('Y-m-d');

    $items = $events->map(function (Event $e) use ($prefs, $assigns, $today) {
      $pref = $prefs->get($e->id);
      $asg  = $assigns->get($e->id);
      $type = $asg ? $asg->refereeType : null;

      return [
        'id'              => (int) $e->id,
        'name'            => $e->name,
        'start_date'      => $e->getRawOriginal('start_date'),
        'end_date'        => $e->getRawOriginal('end_date'),
        'location'        => $e->location,
        'is_past'         => ($e->getRawOriginal('start_date') < $today),
        'wants_to_serve'  => $pref ? (bool) $pref->wants_to_serve : null,
        'preference_note' => $pref ? $pref->note : null,
        'assigned'        => (bool) $asg,   // geçmiş/gelecek görev bilgisi
        'assigned_type'   => $type ? ['id' => (int)$type->id, 'code' => $type->code, 'name' => $type->name] : null,
      ];
    });

    Response::json(['items' => $items->all()]);
  }

  /**
   * PUT /api/me/referee/events/{id}/preference
   * body: { wants_to_serve: bool, note?: string, preferred_referee_type_id?: int }
   */
  public static function setPreference(Request $req, array $params): void
  {
    $user = Auth::requireRole(['referee']);
    $eventId = (int)($params['id'] ?? 0);

    $event = Event::find($eventId);
    if (!$event) {
      Response::error('event_not_found', 'Event not found', 404);
      return;
    }

    $b = $req->json ?? [];

    $pref = RefereeEventPreference::firstOrNew([
      'event_id' => $eventId,
      'user_id'  => $user->id,
    ]);

    $pref->wants_to_serve = !empty($b['wants_to_serve']) ? 1 : 0;

    if (array_key_exists('note', $b)) {
      $pref->note = ($b['note'] === null || trim((string)$b['note']) === '') ? null : trim((string)$b['note']);
    }
    if (array_key_exists('preferred_referee_type_id', $b)) {
      $v = $b['preferred_referee_type_id'];
      $pref->preferred_referee_type_id = ((int)$v > 0) ? (int)$v : null;
    }

    $pref->save();

    Response::json([
      'event_id'       => $eventId,
      'wants_to_serve' => (bool) $pref->wants_to_serve,
      'note'           => $pref->note,
    ]);
  }
}

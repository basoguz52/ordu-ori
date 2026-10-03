<?php

use App\Models\EventRegistration;
use App\Services\RegistrationService;
use App\Support\ApiException;

final class RegistrationController
{
  /** Bir kaydı eski düz sözleşmeye (athlete/category/club alanları düz) map eder. */
  private static function row(EventRegistration $r): array
  {
    $a = $r->athlete;
    return [
      'id'            => (int) $r->id,
      'event_id'      => (int) $r->event_id,
      'athlete_id'    => (int) $r->athlete_id,
      'category_id'   => $r->category_id !== null ? (int) $r->category_id : null,
      'registered_at' => $r->getRawOriginal('registered_at'),
      'status'        => $r->status,
      'first_name'    => $a?->first_name,
      'last_name'     => $a?->last_name,
      'license_no'    => $a?->license_no,
      'si_chip_no'    => $a?->si_chip_no,
      'birth_year'    => $a?->birth_year,
      'gender'        => $a?->gender,
      'category_code' => $r->category?->code,
      'category_name' => $r->category?->name,
      'club_name'     => $a?->club?->name,
      'club_code'     => $a?->club?->code,
    ];
  }

  private static function baseQuery(int $eventId)
  {
    return EventRegistration::with(['athlete.club:id,name,code', 'category:id,code,name'])
      ->where('event_id', $eventId)
      ->orderByDesc('registered_at')
      ->orderByDesc('id');
  }

  public static function listForEvent(Request $req, array $params): void
  {
    $eventId = (int)$params['id'];
    $regs = self::baseQuery($eventId)->get();
    Response::json(['items' => $regs->map(fn($r) => self::row($r))->all()]);
  }

  public static function listMyForEvent(Request $req, array $params): void
  {
    $uid = Auth::requireUserId();
    $eventId = (int)$params['id'];

    $regs = self::baseQuery($eventId)
      ->whereHas('athlete', fn($q) => $q->where('user_id', $uid))
      ->get();

    Response::json(['items' => $regs->map(fn($r) => self::row($r))->all()]);
  }

  public static function create(Request $req): void
  {
    $uid = Auth::requireUserId();
    try {
      $reg = RegistrationService::create($uid, $req->json ?? []);
      Response::json(['id' => (int)$reg->id], 201);
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
    }
  }

  public static function delete(Request $req, array $params): void
  {
    $uid = Auth::requireUserId();
    try {
      RegistrationService::delete($uid, (int)($params['id'] ?? 0));
      Response::noContent(204);
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
    }
  }

  public static function updateStatus(Request $req, array $params): void
  {
    Auth::requireRole(['club_manager', 'referee']);

    $id = (int)$params['id'];
    $status = strtolower(trim((string)(($req->json ?? [])['status'] ?? '')));

    $allowed = ['pending', 'approved', 'cancelled'];
    if (!in_array($status, $allowed, true)) {
      Response::error('validation_error', 'status must be pending/approved/cancelled', 422);
      return;
    }

    $reg = EventRegistration::find($id);
    if (!$reg) {
      Response::error('registration_not_found', 'Registration not found', 404);
      return;
    }

    $reg->status = $status;
    $reg->save();

    Response::noContent(204);
  }
}

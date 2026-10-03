<?php

use App\Models\Club;
use App\Models\User;
use App\Support\Uploads;

/**
 * Kurumsal veri-güdümlü public sayfalar:
 *   Hakemlerimiz -> users.is_referee + referee_profiles
 *   Kulüplerimiz -> clubs
 */
final class KurumsalController
{
  /** GET /api/kurumsal/hakemler */
  public static function hakemler(Request $req): void
  {
    $refs = User::where('is_referee', 1)
      ->where('status', 'active')
      ->with('refereeProfile.defaultRefereeType')
      ->orderBy('full_name')
      ->get();

    $items = $refs->map(function (User $u) {
      $pr = $u->refereeProfile;
      $t = $pr ? $pr->defaultRefereeType : null;
      return [
        'id'           => (int) $u->id,
        'full_name'    => $u->full_name,
        'photo_url'    => Uploads::publicUrl($pr->photo_path ?? null),
        'license_no'   => $pr->license_no ?? null,
        'referee_type' => $t ? ['id' => (int)$t->id, 'code' => $t->code, 'name' => $t->name] : null,
      ];
    });

    Response::json(['items' => $items->all()]);
  }

  /** GET /api/kurumsal/kulupler */
  public static function kulupler(Request $req): void
  {
    $clubs = Club::withCount('athletes')->orderBy('name')->get();

    $items = $clubs->map(fn(Club $c) => [
      'id'            => (int) $c->id,
      'name'          => $c->name,
      'code'          => $c->code,
      'athlete_count' => (int) $c->athletes_count,
      'description'   => $c->description,
      'logo_url'      => Uploads::publicUrl($c->logo_path),
      'contact_email' => $c->contact_email,
      'contact_phone' => $c->contact_phone,
      'website'       => $c->website,
    ]);

    Response::json(['items' => $items->all()]);
  }
}

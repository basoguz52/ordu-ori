<?php

use App\Models\Athlete;
use App\Models\Category;
use App\Models\Club;
use App\Models\User;

final class AthleteController
{
  /** Liste satırı: a.* + düz club_name/club_code/category_name/category_code. */
  private static function rowFor(Athlete $a): array
  {
    $row = $a->getAttributes();
    $row['club_name']     = $a->club?->name;
    $row['club_code']     = $a->club?->code;
    $row['category_name'] = $a->category?->name;
    $row['category_code'] = $a->category?->code;
    return $row;
  }

  public static function listMine(Request $req): void
  {
    $uid = Auth::requireUserId();

    // Kullanıcının yönettiği kulüp
    $club = User::find($uid)?->managedClub;
    if (!$club) {
      Response::json(['items' => []]);
      return;
    }

    $athletes = Athlete::with(['club:id,name,code', 'category:id,name,code'])
      ->where('club_id', $club->id)
      ->orderBy('id', 'desc')
      ->get();

    Response::json(['items' => $athletes->map(fn(Athlete $a) => self::rowFor($a))]);
  }

  public static function create(Request $req): void
  {
    $uid = Auth::requireUserId();

    $club = User::find($uid)?->managedClub;
    if (!$club) {
      Response::error('forbidden', 'user has no managed club', 403);
      return;
    }

    self::createForClub($req->json ?? [], (int)$club->id, $uid);
  }

  public static function update(Request $req, array $params): void
  {
    $uid = Auth::requireUserId();
    $id  = (int)$params['id'];

    // Sahiplik: çağıranın yönettiği kulüpteki herhangi bir sporcu
    $club = User::find($uid)?->managedClub;
    if (!$club) {
      Response::error('forbidden', 'user has no managed club', 403);
      return;
    }
    $a = Athlete::where('id', $id)->where('club_id', $club->id)->first();
    if (!$a) {
      Response::error('not_found', 'Athlete not found', 404);
      return;
    }

    if ($err = self::applyFields($a, $req->json ?? [])) {
      Response::error($err[0], $err[1], $err[2]);
      return;
    }
    $a->save();
    Response::noContent(204);
  }

  public static function delete(Request $req, array $params): void
  {
    $uid = Auth::requireUserId();
    $id  = (int)$params['id'];

    $club = User::find($uid)?->managedClub;
    if (!$club) {
      Response::error('forbidden', 'user has no managed club', 403);
      return;
    }
    $a = Athlete::where('id', $id)->where('club_id', $club->id)->first();
    if (!$a) {
      Response::error('not_found', 'Athlete not found', 404);
      return;
    }

    // Şemada athlete silinince registrations/results FK cascade davranır.
    $a->delete();
    Response::noContent(204);
  }

  // ---------- Admin (tüm kulüpler) ----------

  /** GET /api/admin/athletes?club_id=&category_id=&q= */
  public static function adminList(Request $req): void
  {
    Auth::requireAdmin();

    $clubId     = (int)($req->query['club_id'] ?? 0);
    $categoryId = (int)($req->query['category_id'] ?? 0);
    $q          = trim((string)($req->query['q'] ?? ''));

    $query = Athlete::with(['club:id,name,code', 'category:id,name,code']);
    if ($clubId > 0)     $query->where('club_id', $clubId);
    if ($categoryId > 0) $query->where('category_id', $categoryId);
    if ($q !== '') {
      $query->where(function ($w) use ($q) {
        $w->where('first_name', 'like', "%$q%")
          ->orWhere('last_name', 'like', "%$q%")
          ->orWhere('national_id', 'like', "%$q%")
          ->orWhere('license_no', 'like', "%$q%");
      });
    }

    $athletes = $query->orderBy('id', 'desc')->get();
    Response::json(['items' => $athletes->map(fn(Athlete $a) => self::rowFor($a))]);
  }

  /** POST /api/admin/athletes — body = sporcu alanları + zorunlu club_id */
  public static function adminCreate(Request $req): void
  {
    $admin = Auth::requireAdmin();
    $b = $req->json ?? [];

    $clubId = (int)($b['club_id'] ?? 0);
    $club = $clubId > 0 ? Club::find($clubId) : null;
    if (!$club) {
      Response::error('validation_error', 'club not found', 422);
      return;
    }

    // Kulüp yöneticisi kendi kulübünde de düzenleyebilsin diye sahiplik yöneticiye yazılır.
    $ownerId = $club->manager_user_id ? (int)$club->manager_user_id : (int)$admin->id;
    self::createForClub($b, (int)$club->id, $ownerId);
  }

  /** PUT /api/admin/athletes/{id} — herhangi bir sporcu, tüm alanlar (club_id ile taşıma dahil). */
  public static function adminUpdate(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $a = Athlete::find((int)($params['id'] ?? 0));
    if (!$a) {
      Response::error('not_found', 'Athlete not found', 404);
      return;
    }

    if ($err = self::applyFields($a, $req->json ?? [])) {
      Response::error($err[0], $err[1], $err[2]);
      return;
    }
    $a->save();
    Response::json(['item' => self::rowFor($a->fresh(['club', 'category']))]);
  }

  /** DELETE /api/admin/athletes/{id} */
  public static function adminDelete(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $a = Athlete::find((int)($params['id'] ?? 0));
    if (!$a) {
      Response::error('not_found', 'Athlete not found', 404);
      return;
    }
    $a->delete(); // kayıt + sonuçlar FK cascade
    Response::noContent(204);
  }

  // ---------- Ortak ----------

  /** Yeni sporcu oluştur (kulüp + sahiplik dışarıdan verilir). Yanıtı kendisi yollar. */
  private static function createForClub(array $b, int $clubId, int $ownerId): void
  {
    $first  = trim((string)($b['first_name'] ?? ''));
    $last   = trim((string)($b['last_name'] ?? ''));
    $gender = strtoupper(trim((string)($b['gender'] ?? '')));

    $birthYearRaw = $b['birth_year'] ?? null;
    $birthYear = ($birthYearRaw === null || $birthYearRaw === '') ? null : (int)$birthYearRaw;

    $nationalId = trim((string)($b['national_id'] ?? ''));
    $licenseNo  = trim((string)($b['license_no'] ?? '')) ?: null;
    $siChipNo   = trim((string)($b['si_chip_no'] ?? '')) ?: null;
    $categoryId = isset($b['category_id']) ? (int)$b['category_id'] : 0;

    if ($first === '' || $last === '' || ($gender !== 'M' && $gender !== 'F')) {
      Response::error('validation_error', 'first_name, last_name, gender(M/F) required', 422);
      return;
    }
    if ($nationalId === '' && $licenseNo === null) {
      Response::error('validation_error', 'Lisans No veya TC Kimlik No’dan en az biri gerekli', 422);
      return;
    }
    if ($nationalId !== '' && !self::isValidTcNo($nationalId)) {
      Response::error('validation_error', 'Geçersiz TC Kimlik No', 422);
      return;
    }
    if ($categoryId <= 0 || !Category::find($categoryId)) {
      Response::error('validation_error', 'category not found', 422);
      return;
    }

    $a = new Athlete();
    $a->user_id     = $ownerId;
    $a->club_id     = $clubId;
    $a->category_id = $categoryId;
    $a->first_name  = $first;
    $a->last_name   = $last;
    $a->gender      = $gender;
    $a->birth_year  = $birthYear;
    $a->national_id = $nationalId !== '' ? $nationalId : null;
    $a->license_no  = $licenseNo;
    $a->si_chip_no  = $siChipNo;
    $a->save();

    Response::json(['id' => (int)$a->id], 201);
  }

  /**
   * Kısmi güncelleme: whitelist alanları doğrulayıp modele uygular.
   * Başarıda null, hatada [code, message, status] döndürür.
   */
  private static function applyFields(Athlete $a, array $b): ?array
  {
    $fields = ['club_id', 'category_id', 'first_name', 'last_name', 'gender', 'birth_year', 'national_id', 'license_no', 'si_chip_no'];
    $changed = false;

    foreach ($fields as $f) {
      if (!array_key_exists($f, $b)) continue;
      $val = $b[$f];

      if ($f === 'gender') {
        $val = strtoupper(trim((string)$val));
      } elseif ($f === 'club_id') {
        $val = ((int)$val > 0) ? (int)$val : null;
        if ($val !== null && !Club::find($val)) {
          return ['validation_error', 'club not found', 422];
        }
      } elseif ($f === 'category_id') {
        $val = (int)$val;
        if ($val <= 0 || !Category::find($val)) {
          return ['validation_error', 'category not found', 422];
        }
      } elseif ($f === 'national_id') {
        $val = trim((string)$val);
        if ($val !== '' && !self::isValidTcNo($val)) {
          return ['validation_error', 'Geçersiz TC Kimlik No', 422];
        }
        $val = $val !== '' ? $val : null;
      } elseif ($f === 'first_name' || $f === 'last_name') {
        $val = trim((string)$val);
      } elseif ($f === 'birth_year') {
        $val = ($val === null || $val === '') ? null : (int)$val;
      } elseif ($f === 'license_no' || $f === 'si_chip_no') {
        $val = trim((string)$val);
        $val = $val !== '' ? $val : null;
      }

      $a->$f = $val;
      $changed = true;
    }

    if (!$changed) {
      return ['validation_error', 'no fields to update', 422];
    }

    // Güncelleme sonrası: Lisans No veya TC'den en az biri kalmalı.
    $hasNat = trim((string)($a->national_id ?? '')) !== '';
    $hasLic = trim((string)($a->license_no ?? '')) !== '';
    if (!$hasNat && !$hasLic) {
      return ['validation_error', 'Lisans No veya TC Kimlik No’dan en az biri gerekli', 422];
    }

    return null;
  }

  /**
   * TC Kimlik No doğrulama (resmi kurallar):
   * - 11 hane, tamamı rakam, ilk hane 0 olamaz.
   * - 10. hane = ((1,3,5,7,9. hanelerin toplamı × 7) − (2,4,6,8. hanelerin toplamı)) mod 10
   * - 11. hane = (ilk 10 hanenin toplamı) mod 10
   */
  private static function isValidTcNo(string $tc): bool
  {
    if (!preg_match('/^[1-9][0-9]{10}$/', $tc)) {
      return false;
    }
    $d = array_map('intval', str_split($tc));
    $odd  = $d[0] + $d[2] + $d[4] + $d[6] + $d[8];
    $even = $d[1] + $d[3] + $d[5] + $d[7];
    $d10 = ((($odd * 7) - $even) % 10 + 10) % 10;
    if ($d10 !== $d[9]) {
      return false;
    }
    $d11 = array_sum(array_slice($d, 0, 10)) % 10;
    return $d11 === $d[10];
  }
}

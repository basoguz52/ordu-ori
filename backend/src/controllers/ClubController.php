<?php

use App\Models\Club;
use App\Models\User;
use App\Support\ApiException;
use App\Support\Uploads;

final class ClubController
{
    public static function list(Request $req): void
    {
        Response::json([
            'items' => Club::orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    /** Kulüp self-service payload'u (kulüp yöneticisi profili için). */
    private static function clubPayload(Club $c): array
    {
        return [
            'id'            => (int) $c->id,
            'name'          => $c->name,
            'code'          => $c->code,
            'description'   => $c->description,
            'logo_url'      => Uploads::publicUrl($c->logo_path),
            'contact_email' => $c->contact_email,
            'contact_phone' => $c->contact_phone,
            'website'       => $c->website,
        ];
    }

    /** Giriş yapan kullanıcının yönettiği kulübü döndürür (yoksa 403). */
    private static function requireManagedClub(): ?Club
    {
        $uid = Auth::requireUserId();
        $club = User::find($uid)?->managedClub;
        if (!$club) {
            Response::error('forbidden', 'Yönettiğiniz bir kulüp yok', 403);
            return null;
        }
        return $club;
    }

    /** GET /api/me/club — kulüp yöneticisinin kendi kulübü. */
    public static function myClub(Request $req): void
    {
        $uid = Auth::requireUserId();
        $club = User::find($uid)?->managedClub;
        Response::json(['club' => $club ? self::clubPayload($club) : null]);
    }

    /**
     * PUT /api/me/club — kulüp yöneticisi kendi kulübünü günceller.
     * Kod (code) DEĞİŞTİRİLEMEZ (admin kontrolünde kalır).
     */
    public static function updateMyClub(Request $req): void
    {
        $club = self::requireManagedClub();
        if (!$club) return;

        $b = $req->json ?? [];

        if (array_key_exists('name', $b)) {
            $name = trim((string)$b['name']);
            if ($name === '') {
                Response::error('validation_error', 'Kulüp adı boş olamaz', 422);
                return;
            }
            $club->name = $name;
        }
        foreach (['description', 'contact_email', 'contact_phone', 'website'] as $f) {
            if (array_key_exists($f, $b)) {
                $v = trim((string)$b[$f]);
                $club->$f = $v !== '' ? $v : null;
            }
        }

        $club->save();
        Response::json(['club' => self::clubPayload($club->fresh())]);
    }

    /** POST /api/me/club/logo  (form-data: logo) */
    public static function uploadLogo(Request $req): void
    {
        $club = self::requireManagedClub();
        if (!$club) return;

        try {
            $stored = Uploads::storeImage('logo', 'clubs/' . $club->id, 'logo');
        } catch (ApiException $e) {
            Response::error($e->errorCode, $e->getMessage(), $e->status);
            return;
        }

        Uploads::deleteByKey($club->logo_path);
        $club->logo_path = $stored['storage_key'];
        $club->save();

        Response::json(['logo_url' => Uploads::publicUrl($club->logo_path)], 201);
    }

    /** DELETE /api/me/club/logo */
    public static function deleteLogo(Request $req): void
    {
        $club = self::requireManagedClub();
        if (!$club) return;

        Uploads::deleteByKey($club->logo_path);
        $club->logo_path = null;
        $club->save();
        Response::noContent(204);
    }

    // ---------- Admin (tüm kulüpler) ----------

    /** Admin kulüp payload'u: temel alanlar + yönetici + sporcu sayısı. */
    private static function adminClubPayload(Club $c): array
    {
        $mgr = $c->manager;
        return array_merge(self::clubPayload($c), [
            'manager_user_id' => $c->manager_user_id ? (int) $c->manager_user_id : null,
            'manager'         => $mgr ? [
                'id'        => (int) $mgr->id,
                'full_name' => $mgr->full_name,
                'email'     => $mgr->email,
            ] : null,
            'athletes_count'  => (int) ($c->athletes_count ?? $c->athletes()->count()),
        ]);
    }

    private static function codeTaken(string $code, ?int $exceptId): bool
    {
        $q = Club::where('code', $code);
        if ($exceptId) $q->where('id', '!=', $exceptId);
        return $q->exists();
    }

    /**
     * Kulübe yönetici ata/kaldır (bir yönetici = bir kulüp).
     * club->manager_user_id'i günceller, yeni yöneticinin is_club_manager bayrağını açar.
     * Başarıda ['prev'=>?int], hatada ['error'=>[code,msg,status]].
     */
    private static function assignManager(Club $club, $rawMid): array
    {
        $mid  = (int) $rawMid;
        $prev = $club->manager_user_id ? (int) $club->manager_user_id : null;

        if ($mid <= 0) {
            $club->manager_user_id = null;
            return ['prev' => $prev];
        }

        $u = User::find($mid);
        if (!$u) {
            return ['error' => ['validation_error', 'Seçilen kullanıcı bulunamadı', 422]];
        }
        $ownsOther = Club::where('manager_user_id', $mid);
        if ($club->id) $ownsOther->where('id', '!=', (int) $club->id);
        if ($ownsOther->exists()) {
            return ['error' => ['manager_taken', 'Bu kullanıcı zaten başka bir kulübü yönetiyor', 422]];
        }

        $club->manager_user_id = $mid;
        $u->is_club_manager = true;
        $u->save();

        return ['prev' => ($prev !== $mid ? $prev : null)];
    }

    /** Eski yönetici artık hiç kulüp yönetmiyorsa is_club_manager bayrağını kaldır. */
    private static function downFlagPrevManager(?int $prev, ?int $newMid): void
    {
        if ($prev && $prev !== $newMid && Club::where('manager_user_id', $prev)->doesntExist()) {
            $u = User::find($prev);
            if ($u) {
                $u->is_club_manager = false;
                $u->save();
            }
        }
    }

    /** GET /api/admin/clubs */
    public static function adminList(Request $req): void
    {
        Auth::requireAdmin();
        $clubs = Club::withCount('athletes')
            ->with('manager:id,full_name,email')
            ->orderBy('name')
            ->get();
        Response::json(['items' => $clubs->map(fn(Club $c) => self::adminClubPayload($c))]);
    }

    /** POST /api/admin/clubs */
    public static function adminCreate(Request $req): void
    {
        Auth::requireAdmin();
        $b = $req->json ?? [];

        $name = trim((string)($b['name'] ?? ''));
        $code = trim((string)($b['code'] ?? ''));
        if ($name === '') {
            Response::error('validation_error', 'Kulüp adı zorunludur', 422);
            return;
        }
        if ($code === '') {
            Response::error('validation_error', 'Kulüp kodu zorunludur', 422);
            return;
        }
        if (self::codeTaken($code, null)) {
            Response::error('code_taken', 'Bu kod zaten kullanılıyor', 422);
            return;
        }

        $club = new Club();
        $club->name = $name;
        $club->code = $code;
        foreach (['description', 'contact_email', 'contact_phone', 'website'] as $f) {
            if (array_key_exists($f, $b)) {
                $v = trim((string)$b[$f]);
                $club->$f = $v !== '' ? $v : null;
            }
        }
        if (array_key_exists('manager_user_id', $b)) {
            $res = self::assignManager($club, $b['manager_user_id']);
            if (isset($res['error'])) {
                Response::error($res['error'][0], $res['error'][1], $res['error'][2]);
                return;
            }
        }

        $club->save();
        Response::json(['club' => self::adminClubPayload($club->fresh())], 201);
    }

    /** PUT /api/admin/clubs/{id} — kod dahil düzenlenebilir; yönetici atanabilir. */
    public static function adminUpdate(Request $req, array $params): void
    {
        Auth::requireAdmin();
        $club = Club::find((int)($params['id'] ?? 0));
        if (!$club) {
            Response::error('not_found', 'Club not found', 404);
            return;
        }
        $b = $req->json ?? [];

        if (array_key_exists('name', $b)) {
            $name = trim((string)$b['name']);
            if ($name === '') {
                Response::error('validation_error', 'Kulüp adı boş olamaz', 422);
                return;
            }
            $club->name = $name;
        }
        if (array_key_exists('code', $b)) {
            $code = trim((string)$b['code']);
            if ($code === '') {
                Response::error('validation_error', 'Kulüp kodu boş olamaz', 422);
                return;
            }
            if (self::codeTaken($code, (int)$club->id)) {
                Response::error('code_taken', 'Bu kod zaten kullanılıyor', 422);
                return;
            }
            $club->code = $code;
        }
        foreach (['description', 'contact_email', 'contact_phone', 'website'] as $f) {
            if (array_key_exists($f, $b)) {
                $v = trim((string)$b[$f]);
                $club->$f = $v !== '' ? $v : null;
            }
        }

        $prev = $club->manager_user_id ? (int)$club->manager_user_id : null;
        $managerChanged = array_key_exists('manager_user_id', $b);
        if ($managerChanged) {
            $res = self::assignManager($club, $b['manager_user_id']);
            if (isset($res['error'])) {
                Response::error($res['error'][0], $res['error'][1], $res['error'][2]);
                return;
            }
        }

        $club->save();

        if ($managerChanged) {
            self::downFlagPrevManager($prev, $club->manager_user_id ? (int)$club->manager_user_id : null);
        }

        Response::json(['club' => self::adminClubPayload($club->fresh())]);
    }

    /** DELETE /api/admin/clubs/{id} — sporcusu varsa engellenir. */
    public static function adminDelete(Request $req, array $params): void
    {
        Auth::requireAdmin();
        $club = Club::find((int)($params['id'] ?? 0));
        if (!$club) {
            Response::error('not_found', 'Club not found', 404);
            return;
        }
        if ($club->athletes()->count() > 0) {
            Response::error('club_not_empty', 'Sporcusu olan kulüp silinemez', 409);
            return;
        }

        $prev = $club->manager_user_id ? (int)$club->manager_user_id : null;
        Uploads::deleteByKey($club->logo_path);
        $club->delete();
        self::downFlagPrevManager($prev, null);

        Response::noContent(204);
    }

    /** POST /api/admin/clubs/{id}/logo  (form-data: logo) */
    public static function adminUploadLogo(Request $req, array $params): void
    {
        Auth::requireAdmin();
        $club = Club::find((int)($params['id'] ?? 0));
        if (!$club) {
            Response::error('not_found', 'Club not found', 404);
            return;
        }
        try {
            $stored = Uploads::storeImage('logo', 'clubs/' . $club->id, 'logo');
        } catch (ApiException $e) {
            Response::error($e->errorCode, $e->getMessage(), $e->status);
            return;
        }
        Uploads::deleteByKey($club->logo_path);
        $club->logo_path = $stored['storage_key'];
        $club->save();
        Response::json(['logo_url' => Uploads::publicUrl($club->logo_path)], 201);
    }

    /** DELETE /api/admin/clubs/{id}/logo */
    public static function adminDeleteLogo(Request $req, array $params): void
    {
        Auth::requireAdmin();
        $club = Club::find((int)($params['id'] ?? 0));
        if (!$club) {
            Response::error('not_found', 'Club not found', 404);
            return;
        }
        Uploads::deleteByKey($club->logo_path);
        $club->logo_path = null;
        $club->save();
        Response::noContent(204);
    }
}

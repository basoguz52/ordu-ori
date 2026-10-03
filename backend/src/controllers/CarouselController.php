<?php

use App\Models\CarouselImage;
use App\Support\ApiException;
use App\Support\Uploads;

/**
 * Anasayfa carousel görselleri.
 * Public: yalnızca aktif (is_active=1) slide'ları sort_order sırasıyla listeler.
 * Admin: tüm CRUD + görsel yükleme + sıralama (Auth::requireAdmin).
 */
final class CarouselController
{
  private static function row(CarouselImage $c): array
  {
    return [
      'id'         => (int) $c->id,
      'image_url'  => Uploads::publicUrl($c->storage_key),
      'title'      => $c->title,
      'subtitle'   => $c->subtitle,
      'link_url'   => $c->link_url,
      'sort_order' => (int) $c->sort_order,
      'is_active'  => (bool) $c->is_active,
    ];
  }

  // ---------- Public ----------

  /** GET /api/carousel — yalnızca aktif slide'lar */
  public static function publicList(Request $req): void
  {
    $items = CarouselImage::where('is_active', 1)
      ->orderBy('sort_order')
      ->orderBy('id')
      ->get();

    Response::json(['items' => $items->map(fn($c) => self::row($c))->all()]);
  }

  // ---------- Admin ----------

  /** GET /api/admin/carousel — tüm slide'lar (pasifler dahil) */
  public static function adminList(Request $req): void
  {
    Auth::requireAdmin();

    $items = CarouselImage::orderBy('sort_order')->orderBy('id')->get();
    Response::json(['items' => $items->map(fn($c) => self::row($c))->all()]);
  }

  /**
   * POST /api/admin/carousel  (multipart/form-data)
   * Alanlar: image (dosya, zorunlu), title, subtitle, link_url, is_active
   */
  public static function create(Request $req): void
  {
    Auth::requireAdmin();

    try {
      $stored = Uploads::storeImage('image', 'carousel', 'slide');
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
      return;
    }

    $c = new CarouselImage();
    $c->storage_key   = $stored['storage_key'];
    $c->original_name = $stored['original_name'];
    $c->mime_type     = $stored['mime'];
    $c->size_bytes    = $stored['size'];
    $c->title         = self::textField('title');
    $c->subtitle      = self::textField('subtitle');
    $c->link_url      = self::textField('link_url');
    $c->is_active     = self::boolField('is_active', true);
    $c->sort_order    = (int) (CarouselImage::max('sort_order') ?? 0) + 1;
    $c->save();

    Response::json(self::row($c), 201);
  }

  /**
   * PUT /api/admin/carousel/{id}
   * JSON body: title, subtitle, link_url, is_active (görsel değişmez).
   */
  public static function update(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $c = CarouselImage::find((int)($params['id'] ?? 0));
    if (!$c) {
      Response::error('not_found', 'Carousel image not found', 404);
      return;
    }

    $b = $req->json ?? [];
    $touched = false;

    foreach (['title', 'subtitle', 'link_url'] as $field) {
      if (array_key_exists($field, $b)) {
        $v = $b[$field];
        $c->$field = ($v === null || trim((string)$v) === '') ? null : trim((string)$v);
        $touched = true;
      }
    }
    if (array_key_exists('is_active', $b)) {
      $c->is_active = (bool) $b['is_active'];
      $touched = true;
    }

    if (!$touched) {
      Response::error('validation_error', 'no fields to update', 422);
      return;
    }

    $c->save();
    Response::json(self::row($c));
  }

  /** DELETE /api/admin/carousel/{id} */
  public static function delete(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $c = CarouselImage::find((int)($params['id'] ?? 0));
    if (!$c) {
      Response::error('not_found', 'Carousel image not found', 404);
      return;
    }

    Uploads::deleteByKey($c->storage_key);
    $c->delete();
    Response::noContent(204);
  }

  /**
   * POST /api/admin/carousel/reorder
   * JSON body: { "order": [id1, id2, ...] }  veya  [{ "id":.., "sort_order":.. }, ...]
   */
  public static function reorder(Request $req): void
  {
    Auth::requireAdmin();

    $b = $req->json ?? [];
    $pairs = [];

    if (isset($b['order']) && is_array($b['order'])) {
      foreach ($b['order'] as $i => $id) {
        $pairs[(int)$id] = $i + 1;
      }
    } elseif (array_is_list($b)) {
      foreach ($b as $item) {
        if (isset($item['id'])) {
          $pairs[(int)$item['id']] = (int)($item['sort_order'] ?? 0);
        }
      }
    }

    if (!$pairs) {
      Response::error('validation_error', 'order required', 422);
      return;
    }

    foreach ($pairs as $id => $order) {
      CarouselImage::where('id', $id)->update(['sort_order' => $order]);
    }

    Response::noContent(204);
  }

  // ---------- Helpers ----------

  /** multipart/form-data metin alanı ($_POST); boşsa null. */
  private static function textField(string $name): ?string
  {
    $v = $_POST[$name] ?? null;
    if ($v === null) return null;
    $v = trim((string)$v);
    return $v === '' ? null : $v;
  }

  /** '1'/'true'/'on' => true; '0'/'false'/'' => false. */
  private static function boolField(string $name, bool $default = false): bool
  {
    if (!array_key_exists($name, $_POST)) return $default;
    $v = strtolower(trim((string)$_POST[$name]));
    return in_array($v, ['1', 'true', 'on', 'yes'], true);
  }
}

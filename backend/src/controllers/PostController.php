<?php

use App\Models\Post;
use App\Models\PostMedia;
use App\Support\ApiException;
use App\Support\Uploads;

/**
 * CMS: Duyurular + Haberler (posts.kind = announcement | news).
 * Public: yayınlanmış (published) içerikleri listeler/gösterir.
 * Admin: tüm CRUD + kapak görseli + medya galerisi (Auth::requireAdmin).
 */
final class PostController
{
  /** Liste satırı (gövde hariç özet). */
  private static function listRow(Post $p): array
  {
    return [
      'id'           => (int) $p->id,
      'kind'         => $p->kind,
      'title'        => $p->title,
      'slug'         => $p->slug,
      'status'       => $p->status,
      'cover_url'    => Uploads::publicUrl($p->cover_image_path),
      'published_at' => $p->getRawOriginal('published_at'),
      'created_at'   => $p->getRawOriginal('created_at'),
    ];
  }

  private static function mediaRow(PostMedia $m): array
  {
    return [
      'id'            => (int) $m->id,
      'url'           => Uploads::publicUrl($m->storage_key),
      'original_name' => $m->original_name,
      'mime_type'     => $m->mime_type,
      'size_bytes'    => $m->size_bytes,
    ];
  }

  private static function fullRow(Post $p): array
  {
    $row = self::listRow($p);
    $row['body'] = $p->body;
    $row['media'] = $p->media->map(fn($m) => self::mediaRow($m))->all();
    return $row;
  }

  // ---------- Public ----------

  /** GET /api/posts?kind=announcement|news */
  public static function publicList(Request $req): void
  {
    $kind = trim((string)($req->query['kind'] ?? ''));

    $q = Post::query()->where('status', 'published');
    if (in_array($kind, Post::KINDS, true)) {
      $q->where('kind', $kind);
    }
    $q->orderByRaw('COALESCE(published_at, created_at) DESC')->orderByDesc('id');

    Response::json(['items' => $q->get()->map(fn($p) => self::listRow($p))->all()]);
  }

  /** GET /api/posts/{slug} */
  public static function publicDetail(Request $req, array $params): void
  {
    $slug = (string)($params['slug'] ?? '');
    $p = Post::where('slug', $slug)->where('status', 'published')->first();
    if (!$p) {
      Response::error('not_found', 'Post not found', 404);
      return;
    }
    Response::json(['item' => self::fullRow($p)]);
  }

  // ---------- Admin ----------

  /** GET /api/admin/posts?kind=...  (tüm durumlar) */
  public static function adminList(Request $req): void
  {
    Auth::requireAdmin();

    $kind = trim((string)($req->query['kind'] ?? ''));
    $q = Post::query();
    if (in_array($kind, Post::KINDS, true)) {
      $q->where('kind', $kind);
    }
    $q->orderByDesc('id');

    Response::json(['items' => $q->get()->map(fn($p) => self::listRow($p))->all()]);
  }

  /** GET /api/admin/posts/{id} — düzenleme için tam kayıt (gövde + medya, tüm durumlar) */
  public static function adminGet(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $p = Post::find((int)($params['id'] ?? 0));
    if (!$p) {
      Response::error('not_found', 'Post not found', 404);
      return;
    }
    Response::json(['item' => self::fullRow($p)]);
  }

  /** POST /api/admin/posts */
  public static function adminCreate(Request $req): void
  {
    $admin = Auth::requireAdmin();
    $b = $req->json ?? [];

    $title = trim((string)($b['title'] ?? ''));
    $kind  = trim((string)($b['kind'] ?? 'announcement'));
    if ($title === '') {
      Response::error('validation_error', 'title required', 422);
      return;
    }
    if (!in_array($kind, Post::KINDS, true)) {
      Response::error('validation_error', 'kind must be announcement or news', 422);
      return;
    }

    $status = (($b['status'] ?? 'published') === 'draft') ? 'draft' : 'published';

    $p = new Post();
    $p->kind         = $kind;
    $p->title        = $title;
    $p->slug         = self::uniqueSlug($title);
    $p->body         = isset($b['body']) ? (string)$b['body'] : null;
    $p->status       = $status;
    $p->published_at = $status === 'published' ? date('Y-m-d H:i:s') : null;
    $p->author_id    = (int) $admin->id;
    $p->save();

    Response::json(['id' => (int)$p->id, 'slug' => $p->slug], 201);
  }

  /** PUT /api/admin/posts/{id} */
  public static function adminUpdate(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $p = Post::find((int)($params['id'] ?? 0));
    if (!$p) {
      Response::error('not_found', 'Post not found', 404);
      return;
    }

    $b = $req->json ?? [];
    $touched = false;

    if (array_key_exists('title', $b)) {
      $title = trim((string)$b['title']);
      if ($title === '') {
        Response::error('validation_error', 'title cannot be empty', 422);
        return;
      }
      if ($title !== $p->title) {
        $p->slug = self::uniqueSlug($title, (int)$p->id);
      }
      $p->title = $title;
      $touched = true;
    }
    if (array_key_exists('kind', $b)) {
      $kind = trim((string)$b['kind']);
      if (!in_array($kind, Post::KINDS, true)) {
        Response::error('validation_error', 'kind must be announcement or news', 422);
        return;
      }
      $p->kind = $kind;
      $touched = true;
    }
    if (array_key_exists('body', $b)) {
      $p->body = ($b['body'] === null) ? null : (string)$b['body'];
      $touched = true;
    }
    if (array_key_exists('status', $b)) {
      $newStatus = ($b['status'] === 'draft') ? 'draft' : 'published';
      // draft -> published geçişinde published_at doldur
      if ($newStatus === 'published' && !$p->published_at) {
        $p->published_at = date('Y-m-d H:i:s');
      }
      $p->status = $newStatus;
      $touched = true;
    }

    if (!$touched) {
      Response::error('validation_error', 'no fields to update', 422);
      return;
    }

    $p->save();
    Response::noContent(204);
  }

  /** DELETE /api/admin/posts/{id} */
  public static function adminDelete(Request $req, array $params): void
  {
    Auth::requireAdmin();

    $p = Post::find((int)($params['id'] ?? 0));
    if (!$p) {
      Response::error('not_found', 'Post not found', 404);
      return;
    }
    $p->delete();
    Response::noContent(204);
  }

  // ---------- Medya ----------

  /** POST /api/admin/posts/{id}/cover  (form-data: cover) */
  public static function uploadCover(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $p = Post::find((int)($params['id'] ?? 0));
    if (!$p) {
      Response::error('not_found', 'Post not found', 404);
      return;
    }

    try {
      $stored = Uploads::storeImage('cover', 'posts/' . $p->id . '/cover', 'cover');
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
      return;
    }

    // Eski kapağı diskten sil
    Uploads::deleteByKey($p->cover_image_path);

    $p->cover_image_path = $stored['storage_key'];
    $p->save();

    Response::json(['cover_url' => Uploads::publicUrl($p->cover_image_path)], 201);
  }

  /** DELETE /api/admin/posts/{id}/cover */
  public static function deleteCover(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $p = Post::find((int)($params['id'] ?? 0));
    if (!$p) {
      Response::error('not_found', 'Post not found', 404);
      return;
    }
    Uploads::deleteByKey($p->cover_image_path);
    $p->cover_image_path = null;
    $p->save();
    Response::noContent(204);
  }

  /** POST /api/admin/posts/{id}/media  (form-data: media) */
  public static function uploadMedia(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $p = Post::find((int)($params['id'] ?? 0));
    if (!$p) {
      Response::error('not_found', 'Post not found', 404);
      return;
    }

    try {
      $stored = Uploads::storeImage('media', 'posts/' . $p->id . '/media', 'media');
    } catch (ApiException $e) {
      Response::error($e->errorCode, $e->getMessage(), $e->status);
      return;
    }

    $m = new PostMedia();
    $m->post_id       = (int) $p->id;
    $m->storage_key   = $stored['storage_key'];
    $m->original_name = $stored['original_name'];
    $m->mime_type     = $stored['mime'];
    $m->size_bytes    = $stored['size'];
    $m->save();

    Response::json(self::mediaRow($m), 201);
  }

  /** DELETE /api/admin/posts/{id}/media/{mediaId} */
  public static function deleteMedia(Request $req, array $params): void
  {
    Auth::requireAdmin();
    $postId = (int)($params['id'] ?? 0);
    $mediaId = (int)($params['mediaId'] ?? 0);

    $m = PostMedia::where('id', $mediaId)->where('post_id', $postId)->first();
    if (!$m) {
      Response::error('not_found', 'Media not found', 404);
      return;
    }
    Uploads::deleteByKey($m->storage_key);
    $m->delete();
    Response::noContent(204);
  }

  // ---------- Helpers ----------

  private static function slugify(string $text): string
  {
    $s = strtolower((string) @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s ?? '');
    $s = trim((string)$s, '-');
    return $s !== '' ? $s : 'post';
  }

  /** Benzersiz slug (varsa -2, -3 ekler). $ignoreId: update sırasında kendi kaydını hariç tut. */
  private static function uniqueSlug(string $title, int $ignoreId = 0): string
  {
    $base = self::slugify($title);
    $slug = $base;
    $i = 2;
    while (true) {
      $q = Post::where('slug', $slug);
      if ($ignoreId > 0) $q->where('id', '!=', $ignoreId);
      if (!$q->exists()) break;
      $slug = $base . '-' . $i;
      $i++;
    }
    return $slug;
  }
}

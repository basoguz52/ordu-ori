<?php

use App\Models\ContentPage;

/**
 * Kurumsal serbest içerik sayfaları (Federasyonumuz / Antrenörlerimiz ...).
 * Public: slug ile okur. Admin: listeler + upsert (Auth::requireAdmin).
 */
final class ContentPageController
{
  private static function row(ContentPage $p): array
  {
    return [
      'slug'       => $p->slug,
      'title'      => $p->title,
      'body'       => $p->body,
      'updated_at' => $p->getRawOriginal('updated_at'),
    ];
  }

  /** GET /api/pages/{slug} */
  public static function publicGet(Request $req, array $params): void
  {
    $slug = (string)($params['slug'] ?? '');
    $p = ContentPage::where('slug', $slug)->first();
    if (!$p) {
      Response::error('not_found', 'Page not found', 404);
      return;
    }
    Response::json(['item' => self::row($p)]);
  }

  /** GET /api/admin/pages */
  public static function adminList(Request $req): void
  {
    Auth::requireAdmin();
    Response::json(['items' => ContentPage::orderBy('slug')->get()->map(fn($p) => self::row($p))->all()]);
  }

  /** PUT /api/admin/pages/{slug}  (upsert) */
  public static function adminUpsert(Request $req, array $params): void
  {
    $admin = Auth::requireAdmin();

    $slug = trim((string)($params['slug'] ?? ''));
    if ($slug === '' || !preg_match('/^[a-z0-9-]{1,100}$/', $slug)) {
      Response::error('validation_error', 'Invalid slug', 422);
      return;
    }

    $b = $req->json ?? [];
    $title = trim((string)($b['title'] ?? ''));
    if ($title === '') {
      Response::error('validation_error', 'title required', 422);
      return;
    }

    $p = ContentPage::firstOrNew(['slug' => $slug]);
    $p->title = $title;
    $p->body = isset($b['body']) ? (string)$b['body'] : null;
    $p->updated_by = (int) $admin->id;
    $p->save();

    Response::json(self::row($p));
  }
}

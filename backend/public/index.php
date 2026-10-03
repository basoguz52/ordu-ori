<?php

// 0) Önyükleme: composer autoload + .env + Eloquent (vendor yoksa no-op, uygulama çalışmaya devam eder)
require __DIR__ . '/../src/core/bootstrap.php';

// 1) Hata gösterimi — yalnızca local'de aç
$isLocal = env('APP_ENV', 'production') === 'local';
ini_set('display_errors', $isLocal ? '1' : '0');
error_reporting($isLocal ? E_ALL : (E_ALL & ~E_DEPRECATED & ~E_NOTICE));

// 2) Session
session_start();

// 3) CORS — SADECE whitelist'teki origin'lere credentials izni (eskiden her origin yansıtılıyordu)
$allowed = array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', ''))));
// Local geliştirme (Vite) origin'leri her zaman izinli
$allowed = array_merge($allowed, ['http://localhost:5173', 'http://127.0.0.1:5173']);
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed, true)) {
  header("Access-Control-Allow-Origin: $origin");
  header("Vary: Origin");
  header("Access-Control-Allow-Credentials: true");
  header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");
  header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

// 4) Autoload (basit require)
require __DIR__ . '/../src/core/Db.php';
require __DIR__ . '/../src/core/Request.php';
require __DIR__ . '/../src/core/Response.php';
require __DIR__ . '/../src/core/Router.php';
require __DIR__ . '/../src/core/Csrf.php';
require __DIR__ . '/../src/core/Auth.php';
require __DIR__ . '/../src/core/PrivateStorage.php';
require __DIR__ . '/../src/middleware/RequireAuth.php';

require __DIR__ . '/../src/controllers/AthleteController.php';
require __DIR__ . '/../src/controllers/AuthController.php';
require __DIR__ . '/../src/controllers/AdminController.php';
require __DIR__ . '/../src/controllers/PostController.php';
require __DIR__ . '/../src/controllers/CarouselController.php';
require __DIR__ . '/../src/controllers/RefereeController.php';
require __DIR__ . '/../src/controllers/ContentPageController.php';
require __DIR__ . '/../src/controllers/KurumsalController.php';
require __DIR__ . '/../src/controllers/CategoryController.php';
require __DIR__ . '/../src/controllers/ClubController.php';
require __DIR__ . '/../src/controllers/EventController.php';
require __DIR__ . '/../src/controllers/RegistrationController.php';
require __DIR__ . '/../src/controllers/ResultController.php';
require __DIR__ . '/../src/controllers/ContactController.php';
require __DIR__ . '/../src/controllers/SettingsController.php';

// 5) Router
$req = new Request();
$router = new Router();

// CSRF: her istekte token cookie'si güncel tut; mutasyonlarda header'ı doğrula.
Csrf::setCookie();
Csrf::verify($req);

// Mail
$router->add('POST', '/api/contact', fn($req) => ContactController::send($req));

// Auth
$router->add('POST', '/api/login', fn($req) => AuthController::login($req));
$router->add('POST', '/api/register', fn($req) => AuthController::register($req));
$router->add('GET',  '/api/me',    fn($req) => AuthController::me($req));
$router->add('POST', '/api/me/change-password', fn($req) => AuthController::changePassword($req));
$router->add('PUT',  '/api/me/profile', fn($req) => AuthController::updateProfile($req));

// Kulüp yöneticisi self-service (kendi kulübü)
$router->add('GET',    '/api/me/club', fn($req) => ClubController::myClub($req));
$router->add('PUT',    '/api/me/club', fn($req) => ClubController::updateMyClub($req));
$router->add('POST',   '/api/me/club/logo', fn($req) => ClubController::uploadLogo($req));
$router->add('DELETE', '/api/me/club/logo', fn($req) => ClubController::deleteLogo($req));

// Hakem profil yönetimi (self-service)
$router->add('GET',  '/api/referee-types', fn($req) => RefereeController::listTypes($req));
$router->add('GET',  '/api/me/referee-profile', fn($req) => RefereeController::getProfile($req));
$router->add('PUT',  '/api/me/referee-profile', fn($req) => RefereeController::updateProfile($req));
$router->add('POST', '/api/me/referee-profile/photo', fn($req) => RefereeController::uploadPhoto($req));
$router->add('GET',  '/api/me/referee/events', fn($req) => RefereeController::listEvents($req));
$router->add('PUT',  '/api/me/referee/events/{id}/preference', fn($req, $p) => RefereeController::setPreference($req, $p));
$router->add('POST', '/api/logout', fn($req) => AuthController::logout($req));

// Admin: kullanıcı yönetimi (öz-kayıt onay akışı + kulüp yöneticisi atama)
$router->add('GET',  '/api/admin/users', fn($req) => AdminController::listUsers($req));
$router->add('POST', '/api/admin/users/{id}/approve', fn($req, $p) => AdminController::approveUser($req, $p));
$router->add('POST', '/api/admin/users/{id}/reject', fn($req, $p) => AdminController::rejectUser($req, $p));
$router->add('POST', '/api/admin/users/{id}/assign-club', fn($req, $p) => AdminController::assignClubManager($req, $p));

// Admin: kulüp yönetimi (tüm kulüpler)
$router->add('GET',    '/api/admin/clubs', fn($req) => ClubController::adminList($req));
$router->add('POST',   '/api/admin/clubs', fn($req) => ClubController::adminCreate($req));
$router->add('PUT',    '/api/admin/clubs/{id}', fn($req, $p) => ClubController::adminUpdate($req, $p));
$router->add('DELETE', '/api/admin/clubs/{id}', fn($req, $p) => ClubController::adminDelete($req, $p));
$router->add('POST',   '/api/admin/clubs/{id}/logo', fn($req, $p) => ClubController::adminUploadLogo($req, $p));
$router->add('DELETE', '/api/admin/clubs/{id}/logo', fn($req, $p) => ClubController::adminDeleteLogo($req, $p));

// Admin: sporcu yönetimi (tüm kulüpler)
$router->add('GET',    '/api/admin/athletes', fn($req) => AthleteController::adminList($req));
$router->add('POST',   '/api/admin/athletes', fn($req) => AthleteController::adminCreate($req));
$router->add('PUT',    '/api/admin/athletes/{id}', fn($req, $p) => AthleteController::adminUpdate($req, $p));
$router->add('DELETE', '/api/admin/athletes/{id}', fn($req, $p) => AthleteController::adminDelete($req, $p));

// Public events
$router->add('GET', '/api/events', fn($req) => EventController::list($req));
$router->add('GET', '/api/events/{id}', fn($req, $p) => EventController::get($req, $p));

// Public registrations/results for event
$router->add('GET', '/api/events/{id}/registrations', fn($req, $p) => RegistrationController::listForEvent($req, $p));
$router->add('GET', '/api/events/{id}/results', fn($req, $p) => ResultController::listForEvent($req, $p));

$router->add('GET', '/api/clubs', fn($req) => ClubController::list($req));

// CMS public (Duyurular / Haberler)
$router->add('GET', '/api/posts', fn($req) => PostController::publicList($req));
$router->add('GET', '/api/posts/{slug}', fn($req, $p) => PostController::publicDetail($req, $p));

// Anasayfa carousel (public)
$router->add('GET', '/api/carousel', fn($req) => CarouselController::publicList($req));

// Kurumsal (public, veri-güdümlü)
$router->add('GET', '/api/kurumsal/hakemler', fn($req) => KurumsalController::hakemler($req));
$router->add('GET', '/api/kurumsal/kulupler', fn($req) => KurumsalController::kulupler($req));

// Kurumsal içerik sayfaları (public + admin)
$router->add('GET', '/api/pages/{slug}', fn($req, $p) => ContentPageController::publicGet($req, $p));
$router->add('GET', '/api/admin/pages', fn($req) => ContentPageController::adminList($req));
$router->add('PUT', '/api/admin/pages/{slug}', fn($req, $p) => ContentPageController::adminUpsert($req, $p));

// Admin: hakem atama (event_referees)
$router->add('GET',    '/api/admin/events/{id}/referees', fn($req, $p) => AdminController::listEventReferees($req, $p));
$router->add('POST',   '/api/admin/events/{id}/referees', fn($req, $p) => AdminController::assignReferee($req, $p));
$router->add('DELETE', '/api/admin/events/{id}/referees/{userId}', fn($req, $p) => AdminController::unassignReferee($req, $p));

// CMS admin
$router->add('GET',    '/api/admin/posts', fn($req) => PostController::adminList($req));
$router->add('GET',    '/api/admin/posts/{id}', fn($req, $p) => PostController::adminGet($req, $p));
$router->add('POST',   '/api/admin/posts', fn($req) => PostController::adminCreate($req));
$router->add('PUT',    '/api/admin/posts/{id}', fn($req, $p) => PostController::adminUpdate($req, $p));
$router->add('DELETE', '/api/admin/posts/{id}', fn($req, $p) => PostController::adminDelete($req, $p));
$router->add('POST',   '/api/admin/posts/{id}/cover', fn($req, $p) => PostController::uploadCover($req, $p));
$router->add('DELETE', '/api/admin/posts/{id}/cover', fn($req, $p) => PostController::deleteCover($req, $p));
$router->add('POST',   '/api/admin/posts/{id}/media', fn($req, $p) => PostController::uploadMedia($req, $p));
$router->add('DELETE', '/api/admin/posts/{id}/media/{mediaId}', fn($req, $p) => PostController::deleteMedia($req, $p));

// Anasayfa carousel admin
$router->add('GET',    '/api/admin/carousel', fn($req) => CarouselController::adminList($req));
$router->add('POST',   '/api/admin/carousel', fn($req) => CarouselController::create($req));
$router->add('POST',   '/api/admin/carousel/reorder', fn($req) => CarouselController::reorder($req));
$router->add('PUT',    '/api/admin/carousel/{id}', fn($req, $p) => CarouselController::update($req, $p));
$router->add('DELETE', '/api/admin/carousel/{id}', fn($req, $p) => CarouselController::delete($req, $p));

// Auth required
$router->add('GET',  '/api/me/athletes', fn($req) => AthleteController::listMine($req));
$router->add('POST',   '/api/athletes', fn($req) => AthleteController::create($req));
$router->add('PUT',    '/api/athletes/{id}', fn($req, $p) => AthleteController::update($req, $p));
$router->add('DELETE', '/api/athletes/{id}', fn($req, $p) => AthleteController::delete($req, $p));

$router->add('POST', '/api/registrations', fn($req) => RegistrationController::create($req));
$router->add('PUT', '/api/registrations/{id}', fn($req, $p) => RegistrationController::updateStatus($req, $p));
$router->add('DELETE', '/api/registrations/{id}', fn($req, $p) => RegistrationController::delete($req, $p));

$router->add('GET', '/api/categories', fn($req) => CategoryController::list($req));

// Panel CRUD (şimdilik açık: auth required)
$router->add('POST', '/api/events', fn($req) => EventController::create($req));
$router->add('PUT',    '/api/events/{id}', fn($req, $p) => EventController::update($req, $p));
$router->add('DELETE', '/api/events/{id}', fn($req, $p) => EventController::delete($req, $p));
$router->add('get', '/api/events/{id}/my-registrations', fn($req, $p) => RegistrationController::listMyForEvent($req, $p));

$router->add('POST', '/api/events/{id}/bulletin', fn($req, $p) => EventController::uploadBulletin($req, $p));
$router->add('POST', '/api/events/{id}/oncikis', fn($req, $p) => EventController::uploadOnCikis($req, $p));
$router->add('POST', '/api/events/{id}/kesincikis', fn($req, $p) => EventController::uploadKesinCikis($req, $p));
$router->add('DELETE', '/api/events/{id}/bulletin', fn($req, $p) => EventController::deleteBulletin($req, $p));
$router->add('DELETE', '/api/events/{id}/oncikis', fn($req, $p) => EventController::deleteOnCikis($req, $p));
$router->add('DELETE', '/api/events/{id}/kesincikis', fn($req, $p) => EventController::deleteKesinCikis($req, $p));
$router->add('GET', '/api/events/{id}/registrations/export-csv', fn($req, $p) => EventController::exportRegistrationsCsv($req, $p));

// Etkinlik dosyaları (admin): meta listesi, gizli SKB, sonuç dosyaları
$router->add('GET',    '/api/events/{id}/files', fn($req, $p) => EventController::listFiles($req, $p));
$router->add('POST',   '/api/events/{id}/skb', fn($req, $p) => EventController::uploadSkb($req, $p));
$router->add('GET',    '/api/events/{id}/skb', fn($req, $p) => EventController::downloadSkb($req, $p));
$router->add('DELETE', '/api/events/{id}/skb', fn($req, $p) => EventController::deleteSkb($req, $p));
$router->add('POST',   '/api/events/{id}/results/{type}', fn($req, $p) => EventController::uploadResultFile($req, $p));
$router->add('DELETE', '/api/events/{id}/results/{type}', fn($req, $p) => EventController::deleteResultFile($req, $p));

// Gizli depolama sağlık kontrolü (admin)
$router->add('GET', '/api/admin/storage-check', fn($req) => AdminController::storageCheck($req));

// Genel ayarlar (admin): sonuç yükleme FTP bilgileri
$router->add('GET', '/api/admin/settings/ftp', fn($req) => SettingsController::getFtp($req));
$router->add('PUT', '/api/admin/settings/ftp', fn($req) => SettingsController::updateFtp($req));

// Result upsert (auth required)
$router->add('PUT', '/api/results', fn($req) => ResultController::upsert($req));


// Dispatch
$router->dispatch($req);

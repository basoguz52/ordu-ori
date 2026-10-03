# orduoryantiring — Devam Kılavuzu (Handoff)

Bu dosya yeni bir sohbette kaldığımız yerden devam etmek için özet. Detay kararlar kalıcı
hafızada da var (`~/.claude/.../memory/` — yeni oturumda otomatik yüklenir).

## Proje nedir
`orduoryantiring.com.tr` — Ordu oryantiring tanıtım + yarışma kayıt/sonuç sistemi. Canlıda
çalışıyor. Mevcut kodu **davranışı koruyarak** iç mimariden yeniden yazıyoruz; artı yeni özellikler
(CMS, admin/rol, hakem profili) ve **yepyeni modern frontend**.

## Nasıl çalıştırılır
- **Backend (Docker):** repo kökünde `docker compose up`. Servisler: API `http://localhost:8000`,
  phpMyAdmin `http://localhost:8081`, DB `localhost:3307` (host XAMPP 3306'yı kullandığı için 3307).
  İlk kurulum: `docker compose run --rm php composer install` + `docker/db/init/` otomatik yüklenir.
- **Frontend (dev):** `npm --prefix tof-ui run dev` → `http://localhost:5173` (`/api` proxy → 8000).
  `.claude/launch.json`'da "tof-ui" tanımlı (Browser MCP preview_start ile de açılır).
- **DB'ye bağlanma (host):** localhost:3307, kullanıcı `root`, şifre `root`.

## Test hesapları (local DB)
- `admin@local.test` / `Test1234` — admin
- `yonetici@local.test` / `Parola123` — kulüp yöneticisi (Deneme Kulubu)
- `hakem@local.test` / `Test1234` — hakem (profil+foto dolu)

## Teknoloji / mimari
- **Backend:** elle yazılmış PHP MVC (`backend/`), `Router.php` + controller'lar, **Eloquent**
  (illuminate/database capsule, `backend/vendor/`), `.env` (phpdotenv). Modeller `backend/src/Models/`
  (namespace `App\Models`). İş kuralları servis sınıflarında (`App\Services`), hatalar
  `App\Support\ApiException`. Tek yetki katmanı: `backend/src/core/Auth.php`
  (`requireRole/requireAdmin/requireUser`; admin süper kullanıcı). Session-cookie auth.
- **Frontend:** `tof-ui/` — Vite + React 19 + **TypeScript** + Tailwind3 + shadcn/ui tarzı
  bileşenler (Radix'siz, `buttonVariants`) + **TanStack Query** + tek axios `apiClient`
  (`src/lib/apiClient.ts`, `withCredentials`, `ApiError`). Rota: `src/router/router.tsx`
  (createBrowserRouter). Auth: `src/auth/AuthContext.tsx` (`useQuery(['me'])` + login/logout
  mutation, `canManage`) + `ProtectedRoute`. Layout'lar responsive (mobil hamburger menü).
  Tasarım tokenları `src/index.css` (marka yeşili primary, light+dark).
- **Eski frontend:** `tof-ui-legacy/` (yedek, referans — sadece fikir almak için).

## DURUM

### Backend — FONKSİYONEL OLARAK TAMAM ✅ (hepsi canlı test edildi)
- Auth + öz-kayıt/admin-onay · Club/Category · Athletes · Events(+PDF upload/CSV) · Registrations
  (RegistrationService) · Contact (Composer PHPMailer) · CMS (posts + kapak + medya) · Hakem profili
  (referee_profiles + preferences) · Kurumsal (hakemler/kulupler) · content_pages · Admin hakem-atama.
- Migration'lar `backend/database/migrations/` + `docker/db/init/` (01 dump → 06 content_pages).
- **Kalan backend:** Faz 6 Results (canlı OE2010 HTML → JSON parse) ERTELENDİ; CSRF (frontend ile).

### Frontend — İSKELET + TÜM PUBLİK SAYFALAR TAMAM ✅
Tarayıcıda doğrulananlar:
- İskelet+Auth+Layout (admin login→/app, rol-bazlı nav, responsive)
- Anasayfa, **Duyurular/Haberler** (liste+detay), **Kurumsal** (Hakemlerimiz/Kulüplerimiz +
  Federasyonumuz/Antrenörlerimiz)
- **Yarışma Bülteni** (kayıt durumu rozeti, tarih aralığı, koşullu PDF linkleri, arama)
- **Yarışmacılar** (kulüp/kategori filtresi, responsive tablo/kart)
- **Yarışma Kayıt** (auth gate, iki panel, ekle/çıkar mutation + cache invalidation, kayıt penceresi)
- **İletişim** (form + honeypot + POST /api/contact; local'de SMTP boş→mail_failed, prod'da çalışır)
- **Sonuçlar** (yıla göre grupla + results.php probe/type butonları; "Canlı sonuçlar yakında" placeholder).
  Not: `results.php`'yi yerelde de servis etmek için prod referansı `backend/public/api/results.php`'ye
  kopyalandı (yoksa probe 404 verir). Happy path örnek dosyayla test edildi.

API hook'ları: `src/api/{posts,kurumsal,pages,events,registrations,me,contact}.ts`.
Ortak bileşenler: `components/ui/*` (button,input,label,card,badge,skeleton,textarea,native-select),
`components/common/{PageHeader,EmptyState}`, `lib/format.ts`.
**Not:** `src/api/events.ts`'e admin event mutation'ları zaten eklendi
(`useCreateEvent/useUpdateEvent/useDeleteEvent/useUploadEventFile/useDeleteEventFile` + `EventInput`,
`EventFileKind`) — admin Etkinlikler sayfası bunları kullanacak.

## KALAN İŞLER (öncelik sırası)

1. ~~**Sonuçlar sayfası** (`/sonuclar`)~~ ✅ TAMAM+doğrulandı. `results.php` yerelde de servis
   ediliyor (`backend/public/api/results.php`, prod referansından kopya). Canlı parse hâlâ ertelendi.
2. ~~**Öz-kayıt sayfası** (`/kayit`)~~ ✅ TAMAM+doğrulandı. `api/auth.ts` useRegister → POST /register;
   kart form + istemci doğrulama (şifre≥8, tekrar eşleşme) + pending başarı ekranı; hata kodları
   Türkçeye çevrildi. Login "Kayıt olun" linki buraya. (Test kaydı: yenikayit1@local.test/Parola123,
   local DB'de pending — Kullanıcılar sayfası testine hazır.)
3. **Admin panel sayfaları** (`/app/*`, ProtectedRoute + requireManage):
   - **Etkinlikler** (`/app/etkinlikler`) — liste + create/update/delete (mutation'lar hazır) + PDF
     upload/sil + kayıt aç/kapa toggle + kayıt bitiş inline + CSV indir. (Public Events'ten ayrı.)
   - ~~**Sporcular** (`/app/sporcular`)~~ ✅ TAMAM+doğrulandı — kulüp yöneticisi CRUD (inline form +
     responsive tablo/kart + arama). `api/athletes.ts`. CRUD tarayıcıda test (201/204/204).
     BACKEND: AthleteController::update whitelist'ine `category_id` eklendi (önce güncellenemiyordu).
   - ~~**İçerik/CMS** (`/app/icerik`)~~ ✅ TAMAM+doğrulandı — admin: posts CRUD + kapak/galeri upload/sil
     (2 sekme: Duyurular&Haberler + Kurumsal Sayfalar). `api/cms.ts`. Post/media/upsert hepsi test edildi.
     BACKEND: `GET /api/admin/posts/{id}` (adminGet, fullRow) eklendi — taslak gövdesini düzenlemede
     çekmek için gerekliydi.
   - ~~**Kullanıcılar** (`/app/kullanicilar`)~~ ✅ TAMAM+doğrulandı — admin: status filtre, bekleyen
     onay/red + kulüp yöneticisi atama (var olan veya yeni kulüp), aktif kullanıcıya kulüp atama.
     `api/admin.ts` (useAdminUsers/useApproveUser/useRejectUser/useAssignClub/useClubs). Hakem-atama
     (event_referees) BURADA DEĞİL — event bazlı, ileride Etkinlikler detay/ayrı sekmede ele alınacak.
   - ~~**Hakem Profilim** (`/app/hakem`)~~ ✅ TAMAM+doğrulandı — profil düzenle + foto + yarış görev
     tercihi (yaklaşan) + geçmiş. `api/referee.ts`. BACKEND: `GET /api/referee-types` (listTypes) eklendi.
   - ~~**Şifre Değiştir** (`/app/sifre-degistir`)~~ ✅ TAMAM+doğrulandı — POST /api/me/change-password.
     `api/auth.ts` useChangePassword. Erişim: header kullanıcı adı linki + Dashboard kartı.
     **NOT: Tüm admin/panel + public sayfalar bitti. Kalan: CSRF + deploy paketi.**
4. ~~**CSRF**~~ ✅ TAMAM+doğrulandı — `backend/src/core/Csrf.php` (session token → `XSRF-TOKEN` cookie;
   mutasyonlarda `X-CSRF-Token` header doğrulama, uyumsuz→403). index.php'de setCookie+verify.
   Muaf: GET/HEAD/OPTIONS + login/register/contact. Frontend `apiClient.ts` interceptor header ekler.
5. **Faz 6 Results canlı parse** (ertelendi) — OE2010 `canli_sonuclar.html`'i sunucuda parse edip
   JSON dönen endpoint; örnek dosya `C:\SportSoftware\OE2010\EventData\canli_sonuclar.html`, yapı
   notu memory'de (real-db-schema-and-prod-layout.md).
6. ~~**Deploy paketi**~~ ✅ HAZIR — `deploy/` klasörü (repo kökü): `backend/` (web-dışı), `public_html/`
   (dist + `.htaccess` SPA + `api/` shim + `uploads/`), `_KURULUM/sql/` (02-06 migration). Adım adım
   kılavuz: `deploy/OKU-BENI.md`. Genel-bakış web sayfası (Artifact) + tıklanabilir test checklist yayınlandı.
   KALAN (kullanıcıda): canlı FTP yükleme + SMTP şifre rotasyonu. 01_orienteering.sql canlıya YÜKLENMEZ.

## Önemli notlar / riskler
- **SMTP şifresi rotasyonu** gerekli: `mail.php`'de düz metin committed'dı, env'e taşındı ama
  cPanel'den `destek@orduoryantiring.com.tr` şifresi değiştirilmeli.
- **Git yok** (kullanıcı tercihi). Yedekleme rename ile. cPanel'de Git Version Control mevcut (ileride).
- Prod: PHP 7.0–8.5 mevcut (Docker 8.2), MariaDB 10.6.27. DB adı prod'da `orduory1_react_php`
  (local'de `orienteering`; dump'ta CREATE DATABASE yok, herhangi DB'ye import edilebilir).
- Local'de bazı test verileri var (test hesapları, birkaç duyuru/haber) — admin panelinden yönetilebilir.
- Frontend her sayfa sonrası `npx tsc --noEmit` + `npm --prefix tof-ui run build` ile doğrulandı.

## Çalışma ritmi (kullanıcı tercihi)
Adım adım, sayfa sayfa; her dilim sonrası tarayıcıda gerçek backend'e karşı doğrula, sonra devam.
Responsive'e özen. Onay almadan büyük yön değiştirme.

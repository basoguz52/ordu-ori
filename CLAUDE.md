# orduoryantiring.com.tr — Rewrite Projesi

Ordu oryantiring tanıtım + yarışma kayıt/sonuç sistemi. Canlıdaki eski sitenin davranışı korunarak
iç mimarisi baştan yazıldı, üstüne yeni özellikler eklendi (CMS, admin/rol, hakem profili, puanlı
sonuçlar, sezon tablosu). **Yeni sürüm canlıda çalışıyor**; iş artık bakım + yeni özellik.

- Çalıştırma, test hesapları, mimari ayrıntılar: `docs/HANDOFF.md`, `docs/DEVELOPMENT.md`
- Eski sitenin analizi (ekran envanteri, ilk şema): `orduoryantiring-analiz.md` — tarihsel referans

## Kısıtlar (değişmedi)

- **Hosting: paylaşımlı cPanel, yalnızca FTP.** Sunucuda SSH/Composer/CLI yok, CI/CD yok.
  `vendor/` yerelde üretilip FTP ile yüklenir. Deploy'u kullanıcı kendisi yapar.
- **Migration'lar phpMyAdmin'den elle** çalıştırılır. Her yeni SQL **tekrar çalıştırılabilir**
  yazılır (`ADD COLUMN IF NOT EXISTS`, `DROP ... IF EXISTS`, `CREATE TABLE IF NOT EXISTS`) ve
  yerelde en az iki kez üst üste çalıştırılarak doğrulanır.
- Prod: PHP 8.x, MariaDB 10.6. Yerel Docker da bununla eşleşir.

## Yapı

- `backend/` — elle yazılmış PHP: `public/index.php` (route'lar) + `src/core/Router.php`,
  `src/controllers/*` (namespace'siz), `src/Models` (`App\Models`, Eloquent capsule),
  `src/Services` (iş kuralları, `App\Services`), `src/Support` (`App\Support`; hatalar `ApiException`).
  Tek yetki katmanı `src/core/Auth.php` (`requireUser/requireRole/requireAdmin`; admin süper kullanıcı),
  CSRF `src/core/Csrf.php`, gizli dosya deposu `src/core/PrivateStorage.php`.
- `backend/database/migrations/NNN_*.sql` — kaynak migration'lar; kopyaları `docker/db/init/NN_*.sql`
  (Docker DB ilk oluşurken yüklenir; mevcut volume'a yenileri **elle** uygulanmalı).
- `tof-ui/` — yeni frontend: Vite + React + TypeScript + Tailwind + shadcn tarzı bileşenler +
  TanStack Query, tek axios istemcisi `src/lib/apiClient.ts`. Public sayfalar `src/pages/public`,
  panel `/app` altında `src/pages/app`, rol kapıları `auth/ProtectedRoute.tsx` (`RoleGate`).
- `tof-ui-legacy/` — eski frontend, yalnızca referans.
- `deploy/` — FTP paketi (**git'te yok**, `.gitignore`). Ana kılavuz `deploy/OKU-BENI.md`.

## Deploy akışı

1. `npm --prefix tof-ui run build` → `tof-ui/dist`.
2. `deploy/` tam paketini kaynakla senkronla (`backend/src`, `backend/public/index.php`,
   migration kopyaları, `public_html/index.html` + `assets/`).
3. Kullanıcıya **yalnızca değişen dosyaları** içeren `deploy/_GUNCELLEME_<tarih>[_konu]/` klasörü +
   içinde kısa `OKU-BENI.md` ver. SQL olarak sadece canlıya henüz uygulanmamış yeni dosyalar verilir;
   uygulananlar `deploy/_KURULUM/sql/_zaten_uygulandi/` altına taşınır.
4. `.env`, `uploads/`, `private_uploads/` ve `.htaccess` dosyalarına dokunulmaz.

## Önemli iş kuralları

- **Ferdi puan** = `round(birincinin süresi × 1000 / sporcunun süresi)`, yarış **günü** + kategori
  başına; MP/DNF/DSQ/DNS = 0. Çok günlü yarışta genel sıra = günlük puanların toplamı.
  (`App\Services\ResultImportService`, `ResultController`)
- Sonuç kaynağı OE2010 "Raporu dışa aktar" → CSV (noktalı virgül, Windows-1254). Kolonlar başlık adına
  göre değil **sıraya göre** okunur. Sporcu eşleştirme TC (Text1–3, checksum'lı) → kiralık olmayan çip;
  eşleşmeyenler ad/kulüp ile yine listelenir.
- **CSV TC kimlik no içerir → asla public klasöre konmaz.** Gizli depo:
  `private_uploads/results-inbox/<folder_key>/gun<N>.csv`. Panel yüklemesi ve ayrı FTP hesabı
  (`puan@`, dizini bu gelen kutusu) aynı yere yazar. Puanlar yalnızca admin "İçe aktar" deyince
  değişir (canlı/otomatik puan bilinçli olarak yok).
- **Sezon tablosu**: yalnızca `events.counts_for_season = 1` yarışlar; her yarış günü ayrı sütun;
  kayıtsız sporcular ad + kulüp ile birleştirilir. Sezon Eylül'de başlar.
- Public API yanıtlarında TC/çip numarası gibi kişisel veri dönülmez.

## Yerel ortam notları

- Docker (php 8.2 + mariadb 10.6, API :8000, DB host portu 3307). Bu makinede BIOS'ta SVM kapalıyken
  Docker açılmıyor; o durumda XAMPP'in `php.exe` + MariaDB'si ile **ayrı bir test DB'sinde**
  (`docker/db/init/*.sql` yüklenerek) `php -S 127.0.0.1:8000 -t backend/public backend/public/index.php`
  ile test edilir, iş bitince test DB'si silinir.
- Otomatik test yok; değişiklikler gerçek DB'ye karşı API + tarayıcıda doğrulanır.

## Durum

Tamamlandı ve canlıda: tüm backend modülleri (Auth, kulüp/kategori, sporcu, yarış + dosyalar/SKB,
kayıt, iletişim, CMS, kurumsal, hakem, admin), yeni frontend, CSRF, CORS whitelist, `.env`,
puanlı sonuçlar (migration 011), sezon puan tablosu (migration 012). Canlıya uygulanmış son
migration: **012**.

Kalan işler:
1. **SMTP şifre rotasyonu** (kullanıcı) — eski şifre repoda düz metin durmuştu.
2. **Legacy kolon temizliği**: `events.bulletin_path/oncikis_path/kesincikis_path` hâlâ `event_files`
   ile birlikte kullanılıyor; veriyi `event_files`'a taşıyıp kolonları ve kod yollarını kaldırmak.
3. Docker DB'sine 011–012'yi uygulamak (Docker çalışınca).
4. Puan hesabı / CSV okuyucu için otomatik testler.
5. Ertelendi: kulüp puanı (kural belirlenince), canlı sonuçların ham OE2010 HTML yerine düzgün sayfa
   olması, frontend bundle'ını sayfa bazlı bölmek (~600 KB).
6. Duyurular/Haberler/Kurumsal içerik girişi (kullanıcı, panelden).

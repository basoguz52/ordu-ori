# orduoryantiring.com.tr — Rewrite Projesi

Bu proje, canlıda çalışan `orduoryantiring.com.tr` sitesinin **davranışını/görünümünü değiştirmeden**, iç mimarisini baştan yazma çalışmasıdır. Kullanıcı deploy'u kendisi yapacak (FTP/cPanel), bu yüzden CI/CD veya SSH gerektiren araçlar kullanılmayacak.

Detaylı mevcut-durum analizi (ekran envanteri, mevcut DB şeması, gözlemler) için: `orduoryantiring-analiz.md`

## Hedef / Kısıtlar

- **Fonksiyonel davranış aynı kalacak**: aynı sayfalar, aynı roller (club_manager/referee/normal kullanıcı), aynı iş kuralları (kayıt penceresi, kategori-yaş/cinsiyet eşleşmesi, tekil kayıt kontrolü vb.)
- **Hosting: paylaşımlı hosting (cPanel/FTP)** — SSH/Composer sunucuda çalışmayacak. Composer bağımlılıkları yerelde derlenip `vendor/` klasörü FTP ile yüklenecek.
- Migration'lar sunucuda CLI ile değil, tek seferlik PHP script'i veya phpMyAdmin SQL import ile uygulanacak.

## Seçilen Backend Yaklaşımı

Tam framework değil (Laravel/Symfony gibi ağır, CLI'a bağımlı yapılar cPanel'de kullanışsız). Bunun yerine:

- Mevcut basit `Router.php` korunur (zaten yeterli, /api/* route tanımları).
- **Model katmanı: Illuminate/Database (Eloquent, standalone/capsule)** — Composer ile eklenir, sunucuda sadece `vendor/` dosyaları olarak durur. Gerçek modeller: `User`, `Club`, `Category`, `Athlete`, `Event`, `EventFile`, `EventRegistration`, `EventResult` + ilişkiler (hasMany/belongsTo).
- **PHPMailer**: manuel include yerine Composer (`phpmailer/phpmailer`).
- Controller'lar ham SQL yerine modelleri kullanır; iş kuralları (kategori uygunluğu, kayıt penceresi vb.) servis/use-case sınıflarına taşınır.

## Mevcut Kod Tabanındaki Sorunlar (revize edilecek)

1. **Güvenlik**: `backend/public/index.php` CORS ayarı gelen her `Origin`'i `Access-Control-Allow-Credentials: true` ile yansıtıyor — whitelist'e çevrilecek.
2. Config (DB/SMTP) düz PHP dosyasında committed — `.env` + `vlucas/phpdotenv` (Composer, sunucu tarafında sadece dosya okur, CLI gerekmez).
3. Yetkilendirme tutarsız (`RequireAuth::run()` vs `Auth::requireRole()` karışık kullanım) — tek middleware/policy katmanı.
4. CSRF koruması yok — state-changing endpoint'lere token eklenecek.
5. `results.php` router dışında ayrı bir dosya, canlı sonuçlar için ham OE2010 HTML'i tarayıcıya gönderip client-side DOM parse ettiriyor (`CanliSonuclar.jsx`) — sunucu tarafında parse edilip temiz JSON dönen bir endpoint'e çevrilecek.
6. `events.bulletin_path`/`oncikis_path`/`kesincikis_path` (legacy) ile yeni `event_files` sistemi aynı anda yaşıyor — migration sonrası legacy kolonlar temizlenecek.
7. Modeller şu an tamamen boş dosyalar (`backend/src/models/*.php`) — Eloquent modelleriyle doldurulacak.
8. Kullanılmayan `_old` / yedek dosyalar temizlenecek: `EventController_old.php`, `EventController.with_uploads_delete.php`, `Events_old.jsx`, `Events_last.jsx`, `EventModal_old.jsx`, `Sonuclar_old.jsx`, `YarismaBulteni_old.jsx`.
9. Frontend: `Events.jsx` hem `/events` (public) hem `/app/events` (admin) rotasında koşullu UI ile kullanılıyor — ayrı bileşenlere bölünecek, ortak veri hook'u paylaşacak.
10. Form doğrulama mantığı (telefon regex vb.) sayfalara dağılmış — ortak `lib/validation` içine taşınacak.
11. Login sayfasındaki test artığı default değerler (`admin@test.com`/`1234`) temizlenecek.
12. Duyurular/Haberler/4 Kurumsal sayfa şu an placeholder — içerik stratejisi netleştirilip doldurulacak (kullanıcıyla netleştirilecek).

## Veritabanı

Mevcut şema (aynı tablo/kolon isimleriyle korunacak, sadece eksik constraint/index'ler ve legacy kolon temizliği eklenecek):

- `users`, `clubs`, `categories`, `athletes`, `events`, `event_files`, `event_registrations`, `event_results`

Tam kolon listesi ve ilişkiler için: `orduoryantiring-analiz.md` → "Veritabanı Şeması" bölümü.

## Aşamalı Plan

1. Mevcut API sözleşmesi + DB şeması "sabit spesifikasyon" olarak dondurulur (bu dosya + analiz dosyası).
2. Yeni proje iskeleti ayrı klasör/branch'te kurulur (mevcut kod üzerine yazılmaz).
3. Backend modül modül yeniden yazılır: Auth → Club/Category → Athletes → Events (+upload) → Registrations → Results (+ results.php → JSON API) → Contact. Her modülde: migration + Eloquent model + controller + gerçek DB'ye karşı test.
4. Frontend modül modül, mevcut rotalarla birebir eşleşecek şekilde yeniden yazılır (Tailwind standardize edilir, public/admin Events ayrılır, validation ortaklanır).
5. Eski veriyi yeni şemaya taşıyan migration/temizlik script'i yazılır.
6. Yerel/staging ortamda uçtan uca test.
7. Deploy'a hazır çıktı (frontend `dist/` build + backend PHP dosyaları + `vendor/` + deployment checklist) teslim edilir; canlıya yükleme kullanıcı tarafından yapılır.

## Durum

Şu an: adım 1 tamamlandı (spesifikasyon donduruldu). Sıradaki adım: yeni proje iskeletinin kurulması.

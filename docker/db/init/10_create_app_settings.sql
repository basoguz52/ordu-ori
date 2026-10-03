-- Genel uygulama ayarları (anahtar/değer). İlk kullanım: sonuç yükleme FTP bilgileri.
-- Admin panelden düzenler; yarış "Dosyalar & Sonuçlar" sayfasındaki FTP kartında gösterilir.

CREATE TABLE IF NOT EXISTS `app_settings` (
  `key`        varchar(100) NOT NULL,
  `value`      text DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

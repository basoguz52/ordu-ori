-- Faz 8: CMS — Duyurular + Haberler (tek tablo, kind ile ayrışır)
--
-- Uygulama: phpMyAdmin > orienteering > SQL, veya local Docker'da otomatik (docker/db/init).

CREATE TABLE IF NOT EXISTS `posts` (
  `id`               int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `kind`             varchar(20)  NOT NULL DEFAULT 'announcement',  -- announcement | news
  `title`            varchar(190) NOT NULL,
  `slug`             varchar(200) NOT NULL,
  `body`             longtext     DEFAULT NULL,
  `cover_image_path` varchar(500) DEFAULT NULL,
  `status`           varchar(20)  NOT NULL DEFAULT 'published',     -- draft | published
  `published_at`     datetime     DEFAULT NULL,
  `author_id`        int(10) UNSIGNED DEFAULT NULL,
  `created_at`       datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at`       datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_posts_slug` (`slug`),
  KEY `idx_posts_kind_status` (`kind`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

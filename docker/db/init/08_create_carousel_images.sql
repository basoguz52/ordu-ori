-- Faz 9: Anasayfa carousel görselleri (admin panelden yönetilir)

CREATE TABLE IF NOT EXISTS `carousel_images` (
  `id`            int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `storage_key`   varchar(500) NOT NULL,
  `title`         varchar(190) DEFAULT NULL,
  `subtitle`      varchar(300) DEFAULT NULL,
  `link_url`      varchar(500) DEFAULT NULL,
  `sort_order`    int NOT NULL DEFAULT 0,
  `is_active`     tinyint(1) NOT NULL DEFAULT 1,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type`     varchar(100) DEFAULT NULL,
  `size_bytes`    int(10) UNSIGNED DEFAULT NULL,
  `created_at`    datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at`    datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_carousel_active_sort` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

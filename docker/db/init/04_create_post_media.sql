-- Faz 8: CMS medya galerisi (posts'a bağlı görseller)

CREATE TABLE IF NOT EXISTS `post_media` (
  `id`            int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id`       int(10) UNSIGNED NOT NULL,
  `storage_key`   varchar(500) NOT NULL,
  `original_name` varchar(255) DEFAULT NULL,
  `mime_type`     varchar(100) DEFAULT NULL,
  `size_bytes`    int(10) UNSIGNED DEFAULT NULL,
  `created_at`    datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_post_media_post` (`post_id`),
  CONSTRAINT `fk_post_media_post` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

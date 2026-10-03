-- Faz 8: Kurumsal serbest içerik sayfaları (Federasyonumuz, Antrenörlerimiz, ...)
-- Sabit slug'lı, admin tarafından düzenlenen tekil sayfalar.

CREATE TABLE IF NOT EXISTS `content_pages` (
  `id`         int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`       varchar(100) NOT NULL,
  `title`      varchar(190) NOT NULL,
  `body`       longtext DEFAULT NULL,
  `updated_by` int(10) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_content_pages_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

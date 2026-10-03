-- Faz 8: Hakem profil yönetimi
--   referee_profiles: hakemin kendi düzenlediği profil (lisans, sicil, foto, tip, bio)
--   referee_event_preferences: hakemin yarış başına "görev almak istiyorum" tercihi
-- Geçmiş görevler için ekstra tablo yok -> mevcut event_referees ⨝ events kullanılır.

CREATE TABLE IF NOT EXISTS `referee_profiles` (
  `id`                      int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`                 int(10) UNSIGNED NOT NULL,
  `license_no`              varchar(64)  DEFAULT NULL,
  `registry_no`             varchar(64)  DEFAULT NULL,
  `photo_path`              varchar(500) DEFAULT NULL,
  `default_referee_type_id` int(10) UNSIGNED DEFAULT NULL,
  `bio`                     text DEFAULT NULL,
  `created_at`              datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at`              datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refprof_user` (`user_id`),
  KEY `idx_refprof_type` (`default_referee_type_id`),
  CONSTRAINT `fk_refprof_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `referee_event_preferences` (
  `id`                        int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id`                  int(10) UNSIGNED NOT NULL,
  `user_id`                   int(10) UNSIGNED NOT NULL,
  `wants_to_serve`            tinyint(1) NOT NULL DEFAULT 0,
  `preferred_referee_type_id` int(10) UNSIGNED DEFAULT NULL,
  `note`                      varchar(500) DEFAULT NULL,
  `created_at`                datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at`                datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refpref_event_user` (`event_id`, `user_id`),
  KEY `idx_refpref_user` (`user_id`),
  CONSTRAINT `fk_refpref_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refpref_user`  FOREIGN KEY (`user_id`)  REFERENCES `users` (`id`)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

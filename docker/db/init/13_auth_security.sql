-- Giriş güvenliği: hatalı giriş denemesi sınırı + "şifremi unuttum" bağlantıları
--
-- login_attempts : hatalı giriş / şifre sıfırlama istekleri (e-posta + IP), 15 dk'lık pencerede sayılır.
--                  1 günden eski satırlar uygulama tarafından silinir.
-- password_resets: e-postayla gönderilen tek kullanımlık sıfırlama bağlantıları (kullanılınca silinir). Token'ın kendisi
--                  değil yalnızca SHA-256 özeti saklanır; 1 saat geçerlidir.
--
-- Tekrar çalıştırılabilir (CREATE TABLE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`         int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `kind`       varchar(16)  NOT NULL DEFAULT 'login',
  `email`      varchar(190) DEFAULT NULL,
  `ip`         varchar(45)  NOT NULL,
  `created_at` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_email` (`kind`, `email`, `created_at`),
  KEY `idx_login_attempts_ip` (`kind`, `ip`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `password_resets` (
  `id`         int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    int(10) UNSIGNED NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_password_resets_token` (`token_hash`),
  KEY `idx_password_resets_user` (`user_id`),
  CONSTRAINT `fk_password_resets_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

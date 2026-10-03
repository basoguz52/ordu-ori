-- Kulüp profili: logo, açıklama ve iletişim alanları (kulüp yöneticisi düzenler).
-- Uygulama: phpMyAdmin > SQL. YALNIZCA 1 KEZ çalıştır (ADD COLUMN idempotent değildir).

ALTER TABLE `clubs`
  ADD COLUMN `description`   TEXT         DEFAULT NULL AFTER `code`,
  ADD COLUMN `logo_path`     VARCHAR(500) DEFAULT NULL AFTER `description`,
  ADD COLUMN `contact_email` VARCHAR(190) DEFAULT NULL AFTER `logo_path`,
  ADD COLUMN `contact_phone` VARCHAR(40)  DEFAULT NULL AFTER `contact_email`,
  ADD COLUMN `website`       VARCHAR(255) DEFAULT NULL AFTER `contact_phone`;

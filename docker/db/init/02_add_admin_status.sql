-- Faz 1: users tablosuna admin rolü + hesap durumu
--
-- Uygulama: phpMyAdmin > orienteering > SQL sekmesi > bu dosyayı yapıştır/çalıştır.
-- (Sunucuda CLI/Composer olmadığı için migration'lar SQL import ile uygulanır.)
--
-- Mevcut kullanıcılar 'active' kalır; yeni öz-kayıt olanlar 'pending' başlar (admin onayına kadar).

ALTER TABLE `users`
  ADD COLUMN `is_admin` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_club_manager`,
  ADD COLUMN `status`   VARCHAR(20) NOT NULL DEFAULT 'active' AFTER `is_admin`;

-- İlk admin'i elle işaretlemek için (kendi e-postanı yaz):
-- UPDATE `users` SET `is_admin` = 1 WHERE `email` = 'senin@epostan.com';

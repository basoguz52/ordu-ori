-- Sezon puan tablosu: hangi yarışların sezona sayılacağı yarış bazında işaretlenir
-- (ör. Ordu Ligi kademeleri). Varsayılan: sayılmaz.
--
-- Tekrar çalıştırılabilir (IF NOT EXISTS).

ALTER TABLE `events`
  ADD COLUMN IF NOT EXISTS `counts_for_season` tinyint(1) NOT NULL DEFAULT 0 AFTER `season_end_year`;

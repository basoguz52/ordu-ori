-- Puanlı sonuçlar: OE2010 CSV içe aktarma
--
-- event_results artık yarış GÜNÜ (stage_no) bazında tutulur ve sitede kaydı olmayan
-- sporcuları da taşır (ad/kulüp/kategori kodu satırda saklanır, athlete_id boş kalabilir).
-- Ferdi puan içe aktarma anında hesaplanıp `points` kolonuna yazılır:
--   puan = round(birincinin süresi × 1000 / sporcunun süresi), OK dışı durumlar 0.
--
-- Tekrar çalıştırılabilir: tüm adımlar IF EXISTS / IF NOT EXISTS ile korunur (MariaDB 10.3+).

-- Sporcu FK'si "silinince sonuç da silinsin"den "boşalsın"a çevrilir (aşağıda yeniden eklenir).
ALTER TABLE `event_results`
  DROP FOREIGN KEY IF EXISTS `fk_event_results_athlete`;

ALTER TABLE `event_results`
  DROP INDEX IF EXISTS `uq_event_results_event_athlete`,
  MODIFY `athlete_id` int(10) UNSIGNED DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `stage_no` tinyint(3) UNSIGNED NOT NULL DEFAULT 1 AFTER `event_id`,
  ADD COLUMN IF NOT EXISTS `category_code` varchar(32) DEFAULT NULL AFTER `category_id`,
  ADD COLUMN IF NOT EXISTS `first_name` varchar(120) DEFAULT NULL AFTER `category_code`,
  ADD COLUMN IF NOT EXISTS `last_name` varchar(120) DEFAULT NULL AFTER `first_name`,
  ADD COLUMN IF NOT EXISTS `club_name` varchar(190) DEFAULT NULL AFTER `last_name`,
  ADD COLUMN IF NOT EXISTS `position` smallint(5) UNSIGNED DEFAULT NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `points` smallint(5) UNSIGNED NOT NULL DEFAULT 0 AFTER `position`,
  ADD KEY IF NOT EXISTS `idx_event_results_event_stage` (`event_id`, `stage_no`);

-- Sporcu silinirse sonuç satırı (ad/kulüp ile) kalsın.
ALTER TABLE `event_results`
  ADD CONSTRAINT `fk_event_results_athlete` FOREIGN KEY (`athlete_id`)
    REFERENCES `athletes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Her yarış günü için son içe aktarmanın özeti (panelde gösterilir).
CREATE TABLE IF NOT EXISTS `event_result_imports` (
  `id`             int(10) UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id`       int(10) UNSIGNED NOT NULL,
  `stage_no`       tinyint(3) UNSIGNED NOT NULL,
  `source`         varchar(16) NOT NULL,            -- upload | ftp
  `original_name`  varchar(255) DEFAULT NULL,
  `file_sha1`      char(40) DEFAULT NULL,
  `rows_total`     int(10) UNSIGNED NOT NULL DEFAULT 0,
  `rows_matched`   int(10) UNSIGNED NOT NULL DEFAULT 0,
  `unmatched_json` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`unmatched_json`)),
  `imported_by`    int(10) UNSIGNED DEFAULT NULL,
  `created_at`     datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_event_result_imports_stage` (`event_id`, `stage_no`),
  CONSTRAINT `fk_event_result_imports_event` FOREIGN KEY (`event_id`)
    REFERENCES `events` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

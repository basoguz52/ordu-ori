-- Etkinlik dosyaları: gizli SKB (yönetim) + panelden yüklenen sonuç dosyaları
--
-- `skb`             : zaman tutma yazılımı yedeği. Public'e hiç açılmaz, gizli depoda durur.
-- `results_official`: results.php'nin aradığı official.{html,pdf} dosyası.
-- (results_overall / results_splits / results_bulk / other zaten enum'da vardı.)

ALTER TABLE `event_files`
  MODIFY COLUMN `kind` enum(
    'bulletin',
    'oncikis',
    'kesincikis',
    'results_overall',
    'results_splits',
    'results_official',
    'results_bulk',
    'skb',
    'other'
  ) NOT NULL;

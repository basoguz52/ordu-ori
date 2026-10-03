# DB otomatik yükleme

Bu klasöre konan `*.sql` / `*.sql.gz` dosyaları, MariaDB **ilk kez oluştuğunda** (yani `dbdata`
volume boşken) alfabetik sırayla otomatik çalıştırılır.

## Prod verisini local'e almak

1. Canlıda **phpMyAdmin → `orienteering` DB → Export → SQL** (Custom, "Add DROP TABLE" işaretli).
2. İnen dosyayı buraya `orienteering.sql` olarak koy.
3. İlk kurulumda otomatik yüklenir:

   ```bash
   docker compose up
   ```

## Veriyi tazelemek (DB zaten oluştuysa)

Init script'leri yalnızca ilk oluşturmada çalışır. Yeniden yüklemek için:

```bash
docker compose down -v      # dbdata volume'unu siler (DİKKAT: local veriyi siler)
docker compose up           # init script'leri tekrar çalışır
```

Alternatif (volume silmeden import):

```bash
docker compose exec -T db mysql -uroot -proot orienteering < docker/db/init/orienteering.sql
```

> `.sql` dump'ları repoya commit etme (gerçek veri içerir).

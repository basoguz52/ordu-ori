# Geliştirme Ortamı (Local)

Local ortam Docker ile çalışır ve canlıyı (cPanel: Apache + PHP + MariaDB/MySQL) taklit eder.
Amaç: "bende çalışıyordu ama canlıda patladı" sorununu bitirmek.

## Gereksinimler
- **Docker Desktop** (Windows)
- **Node.js** (frontend için; zaten kurulu)

## İlk kurulum (tek sefer)

```bash
# 1) Ortam dosyalarını oluştur
cp .env.example .env                     # docker-compose için (local DB kimlikleri)
cp backend/.env.example backend/.env     # uygulama config'i (istersen; Docker'da şart değil)

# 2) PHP bağımlılıklarını kur (vendor/ üretir — sunucuya FTP'lenecek olan da budur)
docker compose run --rm php composer install

# 3) (Opsiyonel ama önerilir) Prod verisini yükle
#    Canlı phpMyAdmin > orienteering > Export > SQL  ->  docker/db/init/orienteering.sql

# 4) Ayağa kaldır
docker compose up
```

Servisler:
| Servis | Adres | Not |
|---|---|---|
| Backend API | http://localhost:8000 | Apache + PHP, docroot `backend/public` |
| phpMyAdmin | http://localhost:8081 | Sunucu: `db`, kullanıcı `root` / şifre `.env`'deki `DB_ROOT_PASSWORD` |
| MySQL/MariaDB | localhost:3306 | Host araçları (DBeaver vb.) buraya bağlanır |

## Frontend (ayrı terminal)

```bash
cd tof-ui
npm install
npm run dev            # http://localhost:5173  ('/api' -> 127.0.0.1:8000 proxy)
```

## Günlük kullanım
- Başlat: `docker compose up`  ·  Durdur: `Ctrl+C` / `docker compose down`
- Bağımlılık değişti: `docker compose run --rm php composer install`
- DB'yi sıfırdan yükle: `docker compose down -v && docker compose up`

## Sürüm notu (ÖNEMLİ)
`vendor/` local'de üretilip **canlının PHP sürümünde** çalışacak. Bu yüzden:
- `docker/php/Dockerfile` içindeki `FROM php:X.Y` **canlı cPanel PHP sürümüyle** eşleşmeli.
- `docker-compose.yml` içindeki `db` image'ı canlı MySQL/MariaDB sürümüyle eşleşmeli.
Canlı sürümleri cPanel → *Select PHP Version* ve phpMyAdmin ana ekranından teyit et.

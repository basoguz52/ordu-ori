# Prod (cPanel) PHP sürümüyle eşleşmeli. Teyit edince bu satırı güncelle.
FROM php:8.2-apache

# PHP eklentileri: pdo_mysql (DB), mbstring (Türkçe/UTF-8), zip (composer)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libzip-dev \
      libonig-dev \
      unzip \
 && docker-php-ext-install pdo_mysql mysqli mbstring zip \
 && a2enmod rewrite \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Composer (vendor/ bu imajdaki composer ile üretilir; sunucuda composer yok)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Apache: docroot backend/public + .htaccess (AllowOverride All)
COPY vhost.conf /etc/apache2/sites-available/000-default.conf

WORKDIR /var/www/html

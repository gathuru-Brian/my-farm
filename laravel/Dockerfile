FROM php:8.3-apache AS php-base

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libsqlite3-dev libxml2-dev unzip \
    && docker-php-ext-install -j"$(nproc)" mbstring pdo_sqlite sqlite3 xml \
    && rm -rf /var/lib/apt/lists/*

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN sed -ri "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/000-default.conf \
    && printf '<Directory %s>\n    AllowOverride All\n    Require all granted\n</Directory>\n' "$APACHE_DOCUMENT_ROOT" \
        > /etc/apache2/conf-available/laravel.conf \
    && a2enmod rewrite headers \
    && a2enconf laravel

WORKDIR /var/www/html

FROM php-base AS vendor

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-progress --no-scripts

COPY . .
RUN mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
        storage/framework/sessions storage/framework/testing storage/framework/views storage/logs \
    && composer dump-autoload --no-dev --optimize --no-interaction

FROM node:22-alpine AS frontend

WORKDIR /var/www/html

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM php-base AS app

WORKDIR /var/www/html

COPY --from=vendor --chown=www-data:www-data /var/www/html /var/www/html
COPY --from=frontend --chown=www-data:www-data /var/www/html/public/build /var/www/html/public/build

RUN mkdir -p /var/lib/laravel \
    storage/app/private storage/app/public storage/framework/cache/data \
    storage/framework/sessions storage/framework/testing storage/framework/views storage/logs \
    && touch /var/lib/laravel/database.sqlite \
    && php artisan storage:link --force \
    && chown -R www-data:www-data /var/lib/laravel /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R ug+rwX /var/lib/laravel /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80

CMD ["apache2-foreground"]

FROM php:8.2-apache

RUN docker-php-ext-install pdo pdo_mysql

RUN a2enmod rewrite
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

WORKDIR /var/www/html

COPY . /var/www/html

RUN mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/uploads

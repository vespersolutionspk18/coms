#!/bin/bash

# Laravel Application Deployment Script for AWS EC2
# Run this script after uploading your code to the server

set -e

echo "Starting deployment process..."

# Set correct permissions
echo "Setting file permissions..."
sudo chown -R www-data:www-data /var/www/coms
sudo chmod -R 755 /var/www/coms
sudo chmod -R 775 /var/www/coms/storage
sudo chmod -R 775 /var/www/coms/bootstrap/cache

# Create necessary directories if they don't exist
mkdir -p storage/framework/{cache,sessions,views}
mkdir -p storage/logs
mkdir -p storage/app/public
mkdir -p storage/app/private/documents
mkdir -p bootstrap/cache

# Install composer dependencies with optimization
echo "Installing composer dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# Generate optimized autoload files
composer dump-autoload --optimize

# Clear all caches
echo "Clearing caches..."
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Cache configuration for production
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Run database migrations
echo "Running database migrations..."
php artisan migrate --force

# Create storage symlink
echo "Creating storage symlink..."
php artisan storage:link

# Install and build frontend assets
echo "Building frontend assets..."
npm ci --production
npm run build

# Optimize Laravel
echo "Optimizing Laravel..."
php artisan optimize

# Clear OPcache
echo "Clearing OPcache..."
sudo service php8.2-fpm reload

# Set up cron job for Laravel scheduler
echo "Setting up cron job..."
(crontab -l 2>/dev/null; echo "* * * * * cd /var/www/coms && php artisan schedule:run >> /dev/null 2>&1") | crontab -

# Restart services
echo "Restarting services..."
sudo systemctl restart php8.2-fpm
sudo systemctl restart nginx
sudo systemctl restart redis-server

# Run queue workers (if using supervisor)
# sudo supervisorctl reread
# sudo supervisorctl update
# sudo supervisorctl restart all

echo "Deployment completed successfully!"
echo ""
echo "Post-deployment checklist:"
echo "1. Verify .env file is configured correctly"
echo "2. Ensure AWS credentials are set"
echo "3. Test Redis connection"
echo "4. Verify file upload functionality"
echo "5. Check error logs: tail -f storage/logs/laravel.log"
echo "6. Monitor PHP-FPM status: sudo systemctl status php8.2-fpm"
echo "7. Monitor Nginx status: sudo systemctl status nginx"
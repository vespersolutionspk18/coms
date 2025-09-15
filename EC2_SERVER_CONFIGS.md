# EC2 Server Configuration Files

## Nginx Configuration (/etc/nginx/sites-available/coms)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/coms/public;
    index index.php index.html;

    # Client body size for file uploads
    client_max_body_size 100M;
    client_body_buffer_size 128k;

    # Timeouts
    client_body_timeout 60;
    client_header_timeout 60;
    keepalive_timeout 65;
    send_timeout 60;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml application/atom+xml image/svg+xml 
               text/x-javascript text/x-cross-domain-policy application/x-font-ttf 
               application/x-font-opentype application/vnd.ms-fontobject 
               image/x-icon application/x-httpd-php;
    gzip_disable "msie6";

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting zones (define in http context)
    limit_req zone=general burst=20 nodelay;
    limit_req_status 429;

    # Static assets caching (30 days)
    location ~* \.(jpg|jpeg|png|gif|ico|svg|webp|css|js|woff|woff2|ttf|otf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        access_log off;
        etag on;
    }

    # Favicon and robots.txt
    location = /favicon.ico {
        access_log off;
        log_not_found off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location = /robots.txt {
        access_log off;
        log_not_found off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Login endpoint rate limiting
    location ~ ^/(login|auth|signin) {
        limit_req zone=login burst=5 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # API endpoints rate limiting
    location ~ ^/api/ {
        limit_req zone=api burst=100 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Laravel application
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # PHP-FPM configuration
    location ~ \.php$ {
        try_files $uri =404;
        fastcgi_split_path_info ^(.+\.php)(/.+)$;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param PATH_INFO $fastcgi_path_info;
        
        # FastCGI optimizations
        fastcgi_buffering on;
        fastcgi_buffer_size 128k;
        fastcgi_buffers 256 16k;
        fastcgi_busy_buffers_size 256k;
        fastcgi_temp_file_write_size 256k;
        fastcgi_read_timeout 300;
    }

    # PHP-FPM status page (for monitoring)
    location ~ ^/(fpm-status|fpm-ping)$ {
        access_log off;
        allow 127.0.0.1;
        deny all;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    # Deny access to sensitive files
    location ~ /\.(env|git|gitignore|gitattributes|lock)$ {
        deny all;
        return 404;
    }

    # Deny access to storage and vendor directories
    location ~ ^/(storage|vendor)/ {
        deny all;
        return 404;
    }

    # Health check endpoint
    location /health {
        access_log off;
        add_header Content-Type text/plain;
        return 200 "healthy\n";
    }

    # Error pages
    error_page 404 /index.php;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }

    # Logging
    access_log /var/log/nginx/coms_access.log combined buffer=32k flush=5m;
    error_log /var/log/nginx/coms_error.log error;
}
```

### Add to nginx.conf http context:
```nginx
http {
    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    
    # FastCGI cache (optional)
    fastcgi_cache_path /var/cache/nginx/fastcgi levels=1:2 keys_zone=FASTCGI_CACHE:100m inactive=60m max_size=500m;
    fastcgi_cache_key "$scheme$request_method$host$request_uri";
}
```

## PHP-FPM Configuration (/etc/php/8.2/fpm/pool.d/www.conf)

```ini
[www]
user = www-data
group = www-data
listen = /var/run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

; Process Management
pm = dynamic
pm.max_children = 50
pm.start_servers = 10
pm.min_spare_servers = 5
pm.max_spare_servers = 20
pm.max_requests = 500
pm.process_idle_timeout = 10s

; Memory and Execution Limits
php_admin_value[memory_limit] = 256M
php_admin_value[max_execution_time] = 300
php_admin_value[max_input_time] = 300
php_admin_value[post_max_size] = 100M
php_admin_value[upload_max_filesize] = 100M
php_admin_value[max_file_uploads] = 20

; OPcache Configuration
php_admin_value[opcache.enable] = 1
php_admin_value[opcache.memory_consumption] = 256
php_admin_value[opcache.interned_strings_buffer] = 16
php_admin_value[opcache.max_accelerated_files] = 20000
php_admin_value[opcache.revalidate_freq] = 2
php_admin_value[opcache.validate_timestamps] = 1
php_admin_value[opcache.save_comments] = 1
php_admin_value[opcache.jit] = tracing
php_admin_value[opcache.jit_buffer_size] = 100M

; Realpath Cache
php_admin_value[realpath_cache_size] = 4M
php_admin_value[realpath_cache_ttl] = 600

; Session Configuration
php_admin_value[session.save_handler] = redis
php_admin_value[session.save_path] = "tcp://127.0.0.1:6379"

; Error Handling
php_admin_value[display_errors] = 0
php_admin_value[log_errors] = 1
php_admin_value[error_log] = /var/log/php8.2-fpm.log

; Security
php_admin_value[expose_php] = 0
php_admin_value[disable_functions] = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source

; Status Page
pm.status_path = /fpm-status
ping.path = /fpm-ping
ping.response = pong

; Slow Log
slowlog = /var/log/php8.2-fpm-slow.log
request_slowlog_timeout = 5s

; Emergency restart settings
emergency_restart_threshold = 10
emergency_restart_interval = 1m
```

## Supervisor Configuration (/etc/supervisor/conf.d/coms.conf)

```ini
[program:coms-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/coms/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=4
redirect_stderr=true
stdout_logfile=/var/www/coms/storage/logs/worker.log
stopwaitsecs=3600
```

## Installation Commands

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
    nginx \
    php8.2-fpm php8.2-cli php8.2-common php8.2-mysql \
    php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip \
    php8.2-gd php8.2-redis php8.2-opcache php8.2-intl \
    php8.2-bcmath redis-server supervisor \
    git composer nodejs npm

# Configure nginx
sudo cp nginx.conf /etc/nginx/sites-available/coms
sudo ln -s /etc/nginx/sites-available/coms /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Configure PHP-FPM
sudo cp php-fpm.conf /etc/php/8.2/fpm/pool.d/www.conf
sudo systemctl restart php8.2-fpm

# Configure Supervisor
sudo cp supervisor.conf /etc/supervisor/conf.d/coms.conf
sudo supervisorctl reread
sudo supervisorctl update

# Set permissions
sudo chown -R www-data:www-data /var/www/coms
sudo chmod -R 755 /var/www/coms
sudo chmod -R 775 /var/www/coms/storage /var/www/coms/bootstrap/cache

# Enable services on boot
sudo systemctl enable nginx php8.2-fpm redis-server supervisor
```
#!/bin/bash

# Performance Monitoring Script for Laravel Application
# Run this script to check the health and performance of your application

echo "================================================"
echo "Laravel Application Performance Monitor"
echo "================================================"
echo ""

# Check system resources
echo "=== System Resources ==="
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "  Usage: " 100 - $1"%"}'
echo ""

echo "Memory Usage:"
free -h | grep "^Mem" | awk '{print "  Total: " $2 "\n  Used: " $3 "\n  Free: " $4 "\n  Usage: " ($3/$2)*100 "%"}'
echo ""

echo "Disk Usage:"
df -h /var/www/coms | tail -1 | awk '{print "  Total: " $2 "\n  Used: " $3 "\n  Available: " $4 "\n  Usage: " $5}'
echo ""

# Check PHP-FPM status
echo "=== PHP-FPM Status ==="
if systemctl is-active --quiet php8.2-fpm; then
    echo "Status: Running ✓"
    
    # Get PHP-FPM pool status if available
    if [ -S /var/run/php/php8.2-fpm.sock ]; then
        echo "Socket: Active ✓"
        
        # Check PHP-FPM processes
        ps aux | grep php-fpm | grep -v grep | wc -l | awk '{print "Active Processes: " $1}'
    fi
else
    echo "Status: Not Running ✗"
fi
echo ""

# Check nginx status
echo "=== Nginx Status ==="
if systemctl is-active --quiet nginx; then
    echo "Status: Running ✓"
    
    # Test nginx configuration
    nginx -t 2>&1 | grep -q "successful" && echo "Configuration: Valid ✓" || echo "Configuration: Invalid ✗"
    
    # Check active connections (requires stub_status module)
    # curl -s http://localhost/nginx_status 2>/dev/null | grep "Active connections" || echo "Stub status not configured"
else
    echo "Status: Not Running ✗"
fi
echo ""

# Check Redis status
echo "=== Redis Status ==="
if systemctl is-active --quiet redis-server; then
    echo "Status: Running ✓"
    
    # Get Redis info
    redis-cli ping > /dev/null 2>&1 && echo "Connection: OK ✓" || echo "Connection: Failed ✗"
    
    # Get memory usage
    redis-cli info memory 2>/dev/null | grep "used_memory_human" | cut -d: -f2 | awk '{print "Memory Used: " $1}'
    
    # Get connected clients
    redis-cli info clients 2>/dev/null | grep "connected_clients" | cut -d: -f2 | awk '{print "Connected Clients: " $1}'
else
    echo "Status: Not Running ✗"
fi
echo ""

# Check MySQL/Database connection
echo "=== Database Status ==="
cd /var/www/coms
php artisan tinker --execute="try { \DB::connection()->getPdo(); echo 'Connection: OK ✓'; } catch (\Exception \$e) { echo 'Connection: Failed ✗'; }" 2>/dev/null
echo ""

# Check Laravel application
echo "=== Laravel Application ==="
cd /var/www/coms

# Check if maintenance mode is enabled
if [ -f storage/framework/down ]; then
    echo "Maintenance Mode: Enabled ⚠"
else
    echo "Maintenance Mode: Disabled ✓"
fi

# Check cache status
php artisan cache:clear > /dev/null 2>&1 && echo "Cache: Accessible ✓" || echo "Cache: Not Accessible ✗"

# Check queue status
QUEUE_SIZE=$(php artisan queue:size 2>/dev/null | grep -oE '[0-9]+' | head -1)
if [ -n "$QUEUE_SIZE" ]; then
    echo "Queue Size: $QUEUE_SIZE jobs"
else
    echo "Queue: Not configured or empty"
fi

# Check failed jobs
FAILED_JOBS=$(php artisan queue:failed 2>/dev/null | grep -c "| [0-9]" || echo "0")
echo "Failed Jobs: $FAILED_JOBS"

# Check storage permissions
if [ -w storage/logs ] && [ -w storage/framework/cache ] && [ -w storage/framework/sessions ]; then
    echo "Storage Permissions: OK ✓"
else
    echo "Storage Permissions: Issues ✗"
fi
echo ""

# Check recent errors
echo "=== Recent Errors (Last 10) ==="
if [ -f storage/logs/laravel.log ]; then
    grep -i "error\|exception" storage/logs/laravel.log | tail -10 | head -5
    TOTAL_ERRORS=$(grep -c -i "error\|exception" storage/logs/laravel.log)
    echo "Total Errors in Log: $TOTAL_ERRORS"
else
    echo "Log file not found"
fi
echo ""

# Check OPcache status
echo "=== OPcache Status ==="
php -r "if(function_exists('opcache_get_status')) { \$status = opcache_get_status(); echo 'Status: Enabled ✓\n'; echo 'Memory Used: ' . round(\$status['memory_usage']['used_memory'] / 1024 / 1024, 2) . ' MB\n'; echo 'Hit Rate: ' . round(\$status['opcache_statistics']['hits'] / (\$status['opcache_statistics']['hits'] + \$status['opcache_statistics']['misses']) * 100, 2) . '%\n'; } else { echo 'Status: Not Available ✗\n'; }" 2>/dev/null
echo ""

# Performance recommendations
echo "=== Recommendations ==="
echo "1. Monitor slow queries: tail -f storage/logs/laravel.log | grep 'slow'"
echo "2. Check PHP-FPM status: curl http://localhost/fpm-status"
echo "3. Monitor Redis: redis-cli monitor"
echo "4. Check nginx access logs: tail -f /var/log/nginx/coms_access.log"
echo "5. Run performance test: ab -n 1000 -c 10 http://your-domain.com/"
echo ""

echo "================================================"
echo "Monitor completed at $(date)"
echo "================================================"
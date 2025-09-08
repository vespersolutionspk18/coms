<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

echo "Columns in project_firms table:\n";
$columns = Schema::getColumnListing('project_firms');
foreach ($columns as $column) {
    $type = Schema::getColumnType('project_firms', $column);
    echo "  - $column ($type)\n";
}

echo "\nSample data from project_firms:\n";
$data = DB::table('project_firms')->limit(5)->get();
foreach ($data as $row) {
    echo json_encode($row, JSON_PRETTY_PRINT) . "\n";
}
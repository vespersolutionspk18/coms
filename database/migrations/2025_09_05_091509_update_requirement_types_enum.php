<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change type from ENUM to VARCHAR to allow any requirement type
        Schema::table('requirements', function (Blueprint $table) {
            // First drop the old enum constraint
            DB::statement('ALTER TABLE requirements MODIFY COLUMN type VARCHAR(255)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to the previous enum values (this is just for rollback compatibility)
        DB::statement("ALTER TABLE requirements MODIFY COLUMN type ENUM(
            'document', 'personnel', 'financial', 'technical', 'legal', 'other'
        )");
    }
};
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
        Schema::table('requirements', function (Blueprint $table) {
            // Add title column after type
            $table->string('title')->after('type')->nullable();
            
            // Make description nullable
            $table->text('description')->nullable()->change();
        });
        
        // Update enum values to include more options
        DB::statement("ALTER TABLE requirements MODIFY COLUMN type ENUM('document', 'personnel', 'financial', 'technical', 'legal', 'other')");
        DB::statement("ALTER TABLE requirements MODIFY COLUMN priority ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Medium'");
        
        // Update existing data to lowercase for type
        DB::table('requirements')->where('type', 'Document')->update(['type' => 'document']);
        DB::table('requirements')->where('type', 'Personnel')->update(['type' => 'personnel']);
        DB::table('requirements')->where('type', 'Financial')->update(['type' => 'financial']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert type values to capitalized
        DB::table('requirements')->where('type', 'document')->update(['type' => 'Document']);
        DB::table('requirements')->where('type', 'personnel')->update(['type' => 'Personnel']);
        DB::table('requirements')->where('type', 'financial')->update(['type' => 'Financial']);
        
        // Revert enum columns
        DB::statement("ALTER TABLE requirements MODIFY COLUMN type ENUM('Document', 'Personnel', 'Financial')");
        DB::statement("ALTER TABLE requirements MODIFY COLUMN priority ENUM('High', 'Medium', 'Low') DEFAULT 'Medium'");
        
        Schema::table('requirements', function (Blueprint $table) {
            $table->dropColumn('title');
            // Keep description nullable in the down migration
            $table->text('description')->nullable()->change();
        });
    }
};
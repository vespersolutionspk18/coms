<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('project_firms', function (Blueprint $table) {
            $table->json('selected_documents')->nullable()->after('role_in_project');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_firms', function (Blueprint $table) {
            $table->dropColumn('selected_documents');
        });
    }
};
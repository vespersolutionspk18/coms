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
        Schema::table('documents', function (Blueprint $table) {
            // Drop existing foreign keys
            $table->dropForeign(['project_id']);
            $table->dropForeign(['requirement_id']);
            $table->dropForeign(['task_id']);

            // Re-add with cascade delete
            $table->foreign('project_id')
                  ->references('id')
                  ->on('projects')
                  ->onDelete('cascade');

            $table->foreign('requirement_id')
                  ->references('id')
                  ->on('requirements')
                  ->onDelete('cascade');

            $table->foreign('task_id')
                  ->references('id')
                  ->on('tasks')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            // Drop cascade foreign keys
            $table->dropForeign(['project_id']);
            $table->dropForeign(['requirement_id']);
            $table->dropForeign(['task_id']);

            // Restore original constraints without cascade
            $table->foreign('project_id')
                  ->references('id')
                  ->on('projects');

            $table->foreign('requirement_id')
                  ->references('id')
                  ->on('requirements');

            $table->foreign('task_id')
                  ->references('id')
                  ->on('tasks');
        });
    }
};

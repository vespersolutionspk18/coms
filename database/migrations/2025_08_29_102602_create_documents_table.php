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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('file_path')->nullable();
            $table->longText('parsed_text')->nullable();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->json('tags')->nullable();
            $table->foreignId('firm_id')->nullable()->constrained('firms');
            $table->foreignId('project_id')->nullable()->constrained('projects');
            $table->foreignId('requirement_id')->nullable()->constrained('requirements');
            $table->foreignId('task_id')->nullable()->constrained('tasks');
            $table->integer('version')->default(1);
            $table->enum('status', ['Pending Review', 'Approved', 'Rejected', 'AI-Reviewed'])->default('Pending Review');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};

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
        Schema::create('requirements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->enum('type', ['document', 'personnel', 'financial', 'technical', 'legal', 'other']);
            $table->text('description');
            $table->enum('priority', ['High', 'Medium', 'Low'])->default('Medium');
            $table->foreignId('assigned_firm_id')->nullable()->constrained('firms');
            $table->foreignId('assigned_user_id')->nullable()->constrained('users');
            $table->enum('status', ['Pending', 'In Progress', 'Complete'])->default('Pending');
            $table->foreignId('dependency_id')->nullable()->constrained('requirements');
            $table->json('ai_metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('requirements');
    }
};

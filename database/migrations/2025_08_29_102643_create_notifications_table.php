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
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['Task Due', 'Document Uploaded', 'Requirement Pending', 'Compliance Alert']);
            $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('cascade');
            $table->boolean('read_status')->default(false);
            $table->timestamps();
            
            $table->index(['user_id', 'read_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};

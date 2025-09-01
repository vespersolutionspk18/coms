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
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->text('content');
            $table->foreignId('author_id')->constrained('users');
            $table->enum('related_to_type', ['Task', 'Document', 'Requirement', 'Project']);
            $table->unsignedBigInteger('related_to_id');
            $table->timestamps();
            
            $table->index(['related_to_type', 'related_to_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};

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
        Schema::create('ai_metadata', function (Blueprint $table) {
            $table->id();
            $table->enum('entity_type', ['Project', 'Requirement', 'Task', 'Document']);
            $table->unsignedBigInteger('entity_id');
            $table->enum('suggestion_type', ['Requirement Extraction', 'Task Generation', 'Compliance Gap', 'Summary']);
            $table->json('data');
            $table->timestamps();
            
            $table->index(['entity_type', 'entity_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_metadata');
    }
};

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
        Schema::create('firms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', ['Internal', 'JV Partner']);
            $table->foreignId('primary_contact_id')->nullable()->constrained('users');
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->text('address')->nullable();
            $table->enum('status', ['Active', 'Inactive'])->default('Active');
            $table->text('notes')->nullable();
            $table->decimal('rating', 3, 1)->nullable();
            $table->json('ai_metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('firms');
    }
};

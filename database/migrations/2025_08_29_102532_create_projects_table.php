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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('sector')->nullable();
            $table->json('scope_of_work')->nullable();
            $table->string('client')->nullable();
            $table->enum('stage', ['Identification', 'Pre-Bid', 'Proposal', 'Award', 'Implementation'])->default('Identification');
            $table->date('submission_date')->nullable();
            $table->string('bid_security')->nullable();
            $table->enum('status', ['Active', 'Closed', 'On Hold'])->default('Active');
            $table->date('pre_bid_expected_date')->nullable();
            $table->string('advertisement')->nullable(); // Path to advertisement image
            $table->json('ai_metadata')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};

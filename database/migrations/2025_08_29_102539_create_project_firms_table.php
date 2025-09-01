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
        Schema::create('project_firms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('firm_id')->constrained('firms')->onDelete('cascade');
            $table->enum('role_in_project', ['Lead JV', 'Subconsultant', 'Internal'])->default('Internal');
            $table->timestamps();
            
            $table->unique(['project_id', 'firm_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_firms');
    }
};

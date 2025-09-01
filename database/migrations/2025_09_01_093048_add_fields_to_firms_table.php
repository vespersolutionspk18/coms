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
        Schema::table('firms', function (Blueprint $table) {
            // Add new fields if they don't exist
            if (!Schema::hasColumn('firms', 'website')) {
                $table->string('website')->nullable()->after('address');
            }
            if (!Schema::hasColumn('firms', 'tax_id')) {
                $table->string('tax_id')->nullable()->after('website');
            }
            if (!Schema::hasColumn('firms', 'registration_number')) {
                $table->string('registration_number')->nullable()->after('tax_id');
            }
            if (!Schema::hasColumn('firms', 'established_date')) {
                $table->date('established_date')->nullable()->after('registration_number');
            }
            if (!Schema::hasColumn('firms', 'capabilities')) {
                $table->json('capabilities')->nullable()->after('rating');
            }
            if (!Schema::hasColumn('firms', 'certifications')) {
                $table->json('certifications')->nullable()->after('capabilities');
            }
        });

        // Create pivot table for firm-user relationship if it doesn't exist
        if (!Schema::hasTable('firm_user')) {
            Schema::create('firm_user', function (Blueprint $table) {
                $table->id();
                $table->foreignId('firm_id')->constrained()->onDelete('cascade');
                $table->foreignId('user_id')->constrained()->onDelete('cascade');
                $table->timestamps();
                
                $table->unique(['firm_id', 'user_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('firms', function (Blueprint $table) {
            $table->dropColumn([
                'website',
                'tax_id',
                'registration_number',
                'established_date',
                'capabilities',
                'certifications'
            ]);
        });

        Schema::dropIfExists('firm_user');
    }
};
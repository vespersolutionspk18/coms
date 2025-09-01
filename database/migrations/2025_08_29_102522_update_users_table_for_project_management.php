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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['Admin', 'BD', 'Consultant', 'JV Partner User'])->default('Consultant')->after('email');
            $table->foreignId('firm_id')->nullable()->after('role')->constrained('firms');
            $table->enum('status', ['Active', 'Inactive'])->default('Active')->after('firm_id');
            $table->json('notification_preferences')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['firm_id']);
            $table->dropColumn(['role', 'firm_id', 'status', 'notification_preferences']);
        });
    }
};

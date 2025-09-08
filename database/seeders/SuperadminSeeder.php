<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperadminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'suadmin@suadmin.com'],
            [
                'name' => 'Super Admin',
                'email' => 'suadmin@suadmin.com',
                'password' => Hash::make('@Airplane1'),
                'role' => 'superadmin',
                'status' => 'Active',
                'firm_id' => null,
            ]
        );
    }
}

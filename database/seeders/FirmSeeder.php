<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Firm;
use App\Models\User;

class FirmSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::all();
        $primaryContact = $users->first();

        $firms = [
            [
                'name' => 'Turner Construction Company',
                'type' => 'JV Partner',
                'primary_contact_id' => $primaryContact ? $primaryContact->id : null,
                'contact_email' => 'info@turnerconstruction.com',
                'contact_phone' => '+1 (212) 229-6000',
                'address' => '375 Hudson Street, New York, NY 10014',
                'website' => 'https://www.turnerconstruction.com',
                'tax_id' => '13-1673425',
                'registration_number' => 'TC-2024-001',
                'established_date' => '1902-05-30',
                'status' => 'Active',
                'notes' => 'Leading construction services company with over 120 years of experience. Specialized in healthcare, education, and commercial projects.',
                'rating' => 4.5,
                'capabilities' => json_encode(['Construction Management', 'Design-Build', 'BIM/VDC', 'Lean Construction', 'Sustainable Building']),
                'certifications' => json_encode(['ISO 9001:2015', 'LEED AP', 'OSHA VPP Star', 'ENR Top Contractor']),
            ],
            [
                'name' => 'Gensler Architecture & Design',
                'type' => 'JV Partner',
                'primary_contact_id' => $users->skip(1)->first() ? $users->skip(1)->first()->id : null,
                'contact_email' => 'contact@gensler.com',
                'contact_phone' => '+1 (415) 433-3700',
                'address' => '45 Fremont Street, San Francisco, CA 94105',
                'website' => 'https://www.gensler.com',
                'tax_id' => '94-2523100',
                'registration_number' => 'GA-2024-002',
                'established_date' => '1965-07-01',
                'status' => 'Active',
                'notes' => 'Global architecture, design, and planning firm with 50 locations and over 6,000 professionals.',
                'rating' => 5.0,
                'capabilities' => json_encode(['Architecture', 'Interior Design', 'Brand Strategy', 'Urban Planning', 'Digital Experience Design']),
                'certifications' => json_encode(['WELL AP', 'LEED AP BD+C', 'AIA', 'IIDA', 'RIBA']),
            ],
            [
                'name' => 'AECOM Engineering Services',
                'type' => 'JV Partner',
                'primary_contact_id' => null,
                'contact_email' => 'info@aecom.com',
                'contact_phone' => '+1 (213) 593-8000',
                'address' => '300 South Grand Avenue, Los Angeles, CA 90071',
                'website' => 'https://www.aecom.com',
                'tax_id' => '61-1088522',
                'registration_number' => 'AE-2024-003',
                'established_date' => '1990-04-04',
                'status' => 'Active',
                'notes' => "World's premier infrastructure consulting firm delivering professional services throughout the project lifecycle.",
                'rating' => 4.0,
                'capabilities' => json_encode(['Civil Engineering', 'Environmental Services', 'Transportation Planning', 'Water Resources', 'Program Management']),
                'certifications' => json_encode(['ISO 14001:2015', 'ISO 45001:2018', 'SQF Level 2', 'CMAA Certified']),
            ],
            [
                'name' => 'Internal Design Team',
                'type' => 'Internal',
                'primary_contact_id' => $primaryContact ? $primaryContact->id : null,
                'contact_email' => 'design.team@company.com',
                'contact_phone' => '+1 (555) 123-4567',
                'address' => '100 Main Street, Suite 200, City, ST 12345',
                'website' => null,
                'tax_id' => null,
                'registration_number' => 'INT-2024-001',
                'established_date' => '2020-01-15',
                'status' => 'Active',
                'notes' => 'In-house design team specializing in conceptual design and project coordination.',
                'rating' => 4.5,
                'capabilities' => json_encode(['Conceptual Design', 'CAD Drafting', 'Project Coordination', '3D Visualization']),
                'certifications' => json_encode(['AutoCAD Certified', 'Revit Professional']),
            ],
            [
                'name' => 'Thornton Tomasetti Engineers',
                'type' => 'JV Partner',
                'primary_contact_id' => null,
                'contact_email' => 'info@thorntontomasetti.com',
                'contact_phone' => '+1 (917) 661-7800',
                'address' => '40 Wall Street, New York, NY 10005',
                'website' => 'https://www.thorntontomasetti.com',
                'tax_id' => '13-2914876',
                'registration_number' => 'TT-2024-004',
                'established_date' => '1949-09-01',
                'status' => 'Active',
                'notes' => 'Engineering firm known for innovative solutions in structural engineering and building performance.',
                'rating' => 4.5,
                'capabilities' => json_encode(['Structural Engineering', 'Facade Engineering', 'Forensics', 'Renewal', 'Construction Engineering']),
                'certifications' => json_encode(['SE License', 'PE License', 'LEED AP', 'AISC Certified']),
            ],
            [
                'name' => 'McKinsey & Company Consultants',
                'type' => 'JV Partner',
                'primary_contact_id' => null,
                'contact_email' => 'contact@mckinsey.com',
                'contact_phone' => '+1 (212) 446-7000',
                'address' => '3 World Trade Center, New York, NY 10007',
                'website' => 'https://www.mckinsey.com',
                'tax_id' => '13-1944611',
                'registration_number' => 'MC-2024-005',
                'established_date' => '1926-01-01',
                'status' => 'Active',
                'notes' => 'Global management consulting firm serving as trusted advisor to businesses and governments.',
                'rating' => 5.0,
                'capabilities' => json_encode(['Strategy Consulting', 'Digital Transformation', 'Operations Improvement', 'Risk Management', 'Sustainability']),
                'certifications' => json_encode(['ISO 27001', 'ISO 9001', 'SOC 2 Type II']),
            ],
            [
                'name' => 'Internal Project Management Office',
                'type' => 'Internal',
                'primary_contact_id' => null,
                'contact_email' => 'pmo@company.com',
                'contact_phone' => '+1 (555) 987-6543',
                'address' => '100 Main Street, Suite 300, City, ST 12345',
                'website' => null,
                'tax_id' => null,
                'registration_number' => 'INT-2024-002',
                'established_date' => '2021-03-10',
                'status' => 'Active',
                'notes' => 'Central project management office handling internal initiatives and coordination.',
                'rating' => 4.0,
                'capabilities' => json_encode(['Project Management', 'Resource Planning', 'Budget Control', 'Risk Assessment']),
                'certifications' => json_encode(['PMP Certified', 'Agile Certified']),
            ],
            [
                'name' => 'Skanska USA Building',
                'type' => 'JV Partner',
                'primary_contact_id' => null,
                'contact_email' => 'usa@skanska.com',
                'contact_phone' => '+1 (917) 438-4500',
                'address' => 'Empire State Building, 350 5th Avenue, New York, NY 10118',
                'website' => 'https://www.usa.skanska.com',
                'tax_id' => '13-3908995',
                'registration_number' => 'SK-2024-006',
                'established_date' => '1971-01-01',
                'status' => 'Active',
                'notes' => 'Leading construction and development company focusing on sustainable building practices.',
                'rating' => 4.5,
                'capabilities' => json_encode(['General Contracting', 'Construction Management', 'Design-Build', 'Public-Private Partnerships', 'Self-Perform Work']),
                'certifications' => json_encode(['ISO 14001', 'ISO 45001', 'LEED Platinum', 'B Corporation']),
            ],
            [
                'name' => 'WSP Global Engineering',
                'type' => 'JV Partner',
                'primary_contact_id' => null,
                'contact_email' => 'info@wsp.com',
                'contact_phone' => '+1 (212) 465-5000',
                'address' => 'One Penn Plaza, New York, NY 10119',
                'website' => 'https://www.wsp.com',
                'tax_id' => '98-0549188',
                'registration_number' => 'WSP-2024-007',
                'established_date' => '1959-01-01',
                'status' => 'Inactive',
                'notes' => 'Engineering professional services firm specializing in infrastructure and environmental projects.',
                'rating' => 3.5,
                'capabilities' => json_encode(['MEP Engineering', 'Structural Engineering', 'Environmental Consulting', 'Transportation', 'Energy Systems']),
                'certifications' => json_encode(['PE License', 'LEED AP', 'Envision SP', 'ISO 9001:2015']),
            ],
            [
                'name' => 'Jacobs Engineering Group',
                'type' => 'JV Partner',
                'primary_contact_id' => null,
                'contact_email' => 'info@jacobs.com',
                'contact_phone' => '+1 (214) 583-5500',
                'address' => '1999 Bryan Street, Dallas, TX 75201',
                'website' => 'https://www.jacobs.com',
                'tax_id' => '95-4081636',
                'registration_number' => 'JE-2024-008',
                'established_date' => '1947-08-01',
                'status' => 'Active',
                'notes' => 'Global technical professional services company providing solutions for complex challenges.',
                'rating' => 4.0,
                'capabilities' => json_encode(['Engineering Design', 'Construction Management', 'Operations & Maintenance', 'Scientific Consulting', 'Program Management']),
                'certifications' => json_encode(['ISO 9001', 'ISO 14001', 'OHSAS 18001', 'CMMI Level 3']),
            ],
        ];

        foreach ($firms as $firmData) {
            $firm = Firm::create($firmData);
            
            // Randomly attach 1-3 users to each firm
            if ($users->count() > 0) {
                $randomUsers = $users->random(min(rand(1, 3), $users->count()));
                $firm->users()->attach($randomUsers->pluck('id'));
            }
        }
    }
}
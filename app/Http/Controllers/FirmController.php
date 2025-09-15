<?php

namespace App\Http\Controllers;

use App\Models\Firm;
use App\Models\User;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FirmController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Non-superadmins should be redirected to their own firm
        if (!$user->isSuperadmin()) {
            if ($user->firm_id) {
                return redirect()->route('firms.show', $user->firm_id);
            } else {
                abort(403, 'Access denied: You are not assigned to any firm.');
            }
        }
        
        // Check if this is specifically an API call from the modal
        // by checking for a specific header or query parameter
        if ($request->header('X-Requested-For') === 'modal' || $request->query('for') === 'modal') {
            $firms = Firm::where('status', 'Active')->get();
            return response()->json($firms);
        }
        
        $firms = Firm::with('primaryContact', 'users')->paginate(20);
        
        return Inertia::render('firms/index', [
            'firms' => $firms
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        $user = auth()->user();
        
        // Only superadmins can create firms and see all users/projects
        if (!$user->isSuperadmin()) {
            abort(403, 'Access denied: Only superadmins can create firms.');
        }
        
        // Superadmins can see all users and projects when creating a firm
        $users = User::orderBy('name')->get();
        $projects = Project::orderBy('title')->get();
        
        return Inertia::render('firms/form', [
            'users' => $users,
            'projects' => $projects
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = auth()->user();
        
        // Only superadmins can create firms
        if (!$user->isSuperadmin()) {
            abort(403, 'Access denied: Only superadmins can create firms.');
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:Internal,JV Partner',
            'primary_contact_id' => 'nullable|exists:users,id',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'address' => 'nullable|string',
            'website' => 'nullable|url',
            'tax_id' => 'nullable|string',
            'registration_number' => 'nullable|string',
            'established_date' => 'nullable|date',
            'status' => 'required|in:Active,Inactive',
            'notes' => 'nullable|string',
            'rating' => 'nullable|numeric|min:0|max:5',
            'capabilities' => 'nullable|json',
            'certifications' => 'nullable|json',
            'users' => 'nullable|array',
            'users.*' => 'exists:users,id',
        ]);

        // Parse JSON fields
        if (isset($validated['capabilities']) && is_string($validated['capabilities'])) {
            $validated['capabilities'] = json_decode($validated['capabilities'], true);
        }
        if (isset($validated['certifications']) && is_string($validated['certifications'])) {
            $validated['certifications'] = json_decode($validated['certifications'], true);
        }

        // Extract users for many-to-many relationship
        $users = $validated['users'] ?? [];
        unset($validated['users']);

        $firm = Firm::create($validated);

        // Attach users if provided
        if (!empty($users)) {
            $firm->users()->attach($users);
        }

        return redirect()->route('firms.edit', $firm)->with('success', 'Firm created successfully');
    }

    /**
     * Display the specified resource.
     */
    public function show(Firm $firm)
    {
        $user = auth()->user();
        
        // Non-superadmins can only access their own firm
        if (!$user->isSuperadmin() && $user->firm_id !== $firm->id) {
            abort(403, 'Access denied: You can only access your own firm.');
        }

        $firm->load('primaryContact', 'users', 'projects', 'documents');
        
        // Superadmins see all users, regular users only see users from their firm
        if ($user->isSuperadmin()) {
            $users = User::orderBy('name')->get();
            $projects = Project::orderBy('title')->get();
        } else {
            $users = User::where('firm_id', $firm->id)->orderBy('name')->get();
            $projects = Project::whereHas('firms', function($query) use ($firm) {
                $query->where('firms.id', $firm->id);
            })->orderBy('title')->get();
        }
        
        return Inertia::render('firms/form', [
            'firm' => $firm,
            'users' => $users,
            'projects' => $projects
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Firm $firm)
    {
        $user = auth()->user();
        
        // Non-superadmins can only access their own firm
        if (!$user->isSuperadmin() && $user->firm_id !== $firm->id) {
            abort(403, 'Access denied: You can only access your own firm.');
        }

        $firm->load('primaryContact', 'users', 'projects', 'documents');
        
        // Superadmins see all users, regular users only see users from their firm
        if ($user->isSuperadmin()) {
            $users = User::orderBy('name')->get();
            $projects = Project::orderBy('title')->get();
        } else {
            $users = User::where('firm_id', $firm->id)->orderBy('name')->get();
            $projects = Project::whereHas('firms', function($query) use ($firm) {
                $query->where('firms.id', $firm->id);
            })->orderBy('title')->get();
        }
        
        return Inertia::render('firms/form', [
            'firm' => $firm,
            'users' => $users,
            'projects' => $projects
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Firm $firm)
    {
        $user = auth()->user();
        
        // Non-superadmins can only update their own firm
        if (!$user->isSuperadmin() && $user->firm_id !== $firm->id) {
            abort(403, 'Access denied: You can only update your own firm.');
        }
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:Internal,JV Partner',
            'primary_contact_id' => 'nullable|exists:users,id',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'address' => 'nullable|string',
            'website' => 'nullable|url',
            'tax_id' => 'nullable|string',
            'registration_number' => 'nullable|string',
            'established_date' => 'nullable|date',
            'status' => 'sometimes|required|in:Active,Inactive',
            'notes' => 'nullable|string',
            'rating' => 'nullable|numeric|min:0|max:5',
            'capabilities' => 'nullable|json',
            'certifications' => 'nullable|json',
            'users' => 'nullable|array',
            'users.*' => 'exists:users,id',
        ]);

        // Parse JSON fields
        if (isset($validated['capabilities']) && is_string($validated['capabilities'])) {
            $validated['capabilities'] = json_decode($validated['capabilities'], true);
        }
        if (isset($validated['certifications']) && is_string($validated['certifications'])) {
            $validated['certifications'] = json_decode($validated['certifications'], true);
        }

        // Extract users for many-to-many relationship
        $users = $validated['users'] ?? [];
        unset($validated['users']);

        $firm->update($validated);

        // Sync users if provided
        if (isset($request->users)) {
            $firm->users()->sync($users);
        }

        return redirect()->route('firms.edit', $firm)->with('success', 'Firm updated successfully');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Firm $firm)
    {
        $firm->delete();
        
        return redirect()->route('firms.index');
    }
}
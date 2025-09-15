<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Firm;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Illuminate\Validation\Rule;

class UserController extends Controller
{

    public function index()
    {
        $user = auth()->user();
        
        // Superadmins can see all users
        if ($user->isSuperadmin()) {
            $users = User::with('firm')->get();
        } else {
            // Regular users can only see users from their own firm
            $users = User::with('firm')
                ->where('firm_id', $user->firm_id)
                ->get();
        }
        
        return Inertia::render('users/index', [
            'users' => [
                'data' => $users,
                'current_page' => 1,
                'last_page' => 1,
                'per_page' => 50,
                'total' => $users->count(),
            ],
        ]);
    }

    public function create()
    {
        $user = auth()->user();
        
        // Superadmins can see all firms
        if ($user->isSuperadmin()) {
            $firms = Firm::all();
        } else {
            // Regular users can only assign to their own firm
            $firms = Firm::where('id', $user->firm_id)->get();
        }
        
        return Inertia::render('users/form', [
            'firms' => $firms,
        ]);
    }

    public function store(Request $request)
    {
        $currentUser = auth()->user();
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'nullable|string|min:8|confirmed',
            'phone' => 'nullable|string|max:255',
            'firm_id' => 'nullable|exists:firms,id',
            'role' => ['nullable', 'string', Rule::in(\App\Enums\UserRole::all())],
        ]);

        // Non-superadmins can only create users in their own firm
        if (!$currentUser->isSuperadmin()) {
            $validated['firm_id'] = $currentUser->firm_id;
        }

        // If no password provided, generate a random one
        if (empty($validated['password'])) {
            $validated['password'] = Hash::make(Str::random(16));
        } else {
            $validated['password'] = Hash::make($validated['password']);
        }
        
        // Handle role assignment
        $roleToAssign = $validated['role'] ?? 'user';
        
        // Only superadmins can assign superadmin role
        if ($roleToAssign === 'superadmin' && !$currentUser->isSuperadmin()) {
            return redirect()->back()->withErrors(['role' => 'Only superadmins can create other superadmins']);
        }
        
        // Remove role from validated data to prevent mass assignment
        unset($validated['role']);
        $validated['status'] = 'Active'; // Default status

        // Create user with specified role
        $user = new User($validated);
        $user->role = $roleToAssign; // Set role explicitly (not through mass assignment)
        $user->save();

        return redirect()->route('users.index')->with('success', 'User created successfully');
    }

    public function show(User $user)
    {
        $currentUser = auth()->user();
        
        // Check if user can access this user
        if (!$currentUser->canManageUser($user)) {
            abort(403, 'Access denied: You can only view users from your own firm.');
        }
        
        $user->load('firm', 'tasks', 'documents');
        
        // Ensure role is included in the user data
        $userData = $user->toArray();
        $userData['role'] = $user->role; // Explicitly include role
        
        // Superadmins can see all firms
        if ($currentUser->isSuperadmin()) {
            $firms = Firm::all();
        } else {
            // Regular users can only see their own firm
            $firms = Firm::where('id', $currentUser->firm_id)->get();
        }
        
        return Inertia::render('users/form', [
            'user' => $userData,
            'firms' => $firms,
        ]);
    }

    public function edit(User $user)
    {
        $currentUser = auth()->user();
        
        // Check if user can access this user
        if (!$currentUser->canManageUser($user)) {
            abort(403, 'Access denied: You can only edit users from your own firm.');
        }
        
        $user->load('firm');
        
        // Ensure role is included in the user data
        $userData = $user->toArray();
        $userData['role'] = $user->role; // Explicitly include role
        
        // Superadmins can see all firms
        if ($currentUser->isSuperadmin()) {
            $firms = Firm::all();
        } else {
            // Regular users can only see their own firm
            $firms = Firm::where('id', $currentUser->firm_id)->get();
        }
        
        return Inertia::render('users/form', [
            'user' => $userData,
            'firms' => $firms,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        // Check if user can manage this user
        if (!$currentUser->canManageUser($user)) {
            abort(403, 'Access denied: You can only update users from your own firm.');
        }
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'phone' => 'nullable|string|max:255',
            'firm_id' => 'nullable|exists:firms,id',
            'status' => 'nullable|in:Active,Inactive',
            'role' => ['nullable', 'string', Rule::in(\App\Enums\UserRole::all())],
        ]);

        // Non-superadmins cannot change firm_id
        if (!$currentUser->isSuperadmin()) {
            unset($validated['firm_id']);
        }

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Handle role changes - only superadmins can change roles
        if (isset($validated['role'])) {
            if (!$currentUser->isSuperadmin()) {
                return redirect()->back()->withErrors(['role' => 'Only superadmins can change user roles']);
            }
            
            // Prevent changing own role
            if ($currentUser->id === $user->id) {
                return redirect()->back()->withErrors(['role' => 'You cannot change your own role']);
            }
            
            // Store old role for audit
            $oldRole = $user->role;
            $newRole = $validated['role'];
            
            // Update role directly (not through mass assignment)
            $user->role = $newRole;
            
            // Log the role change
            \Log::info('User role changed via update', [
                'user_id' => $user->id,
                'changed_by' => $currentUser->id,
                'old_role' => $oldRole,
                'new_role' => $newRole,
                'timestamp' => now(),
            ]);
            
            // Remove role from validated array to prevent mass assignment
            unset($validated['role']);
        }
        
        // Status can be updated but validate it's provided
        if (!isset($validated['status'])) {
            $validated['status'] = $user->status ?: 'Active';
        }

        $user->update($validated);
        
        // Save any role changes
        if (isset($newRole)) {
            $user->save();
        }

        return redirect()->route('users.index')->with('success', 'User updated successfully');
    }

    public function destroy(User $user)
    {
        $currentUser = auth()->user();
        
        // Check if user can manage this user
        if (!$currentUser->canManageUser($user)) {
            abort(403, 'Access denied: You can only delete users from your own firm.');
        }
        
        // Prevent users from deleting themselves
        if ($currentUser->id === $user->id) {
            return redirect()->route('users.index')->with('error', 'You cannot delete your own account.');
        }
        
        $user->delete();

        return redirect()->route('users.index')->with('success', 'User deleted successfully');
    }

    /**
     * Update user's role - requires special authorization
     */
    public function updateRole(Request $request, User $user)
    {
        $currentUser = auth()->user();
        
        // Only superadmins can change roles
        if (!$currentUser->isSuperadmin()) {
            abort(403, 'Access denied: Only superadmins can change user roles.');
        }
        
        // Prevent users from changing their own role
        if ($currentUser->id === $user->id) {
            return response()->json(['error' => 'You cannot change your own role.'], 403);
        }
        
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::in(\App\Enums\UserRole::all())],
        ]);
        
        // Store old role for audit
        $oldRole = $user->role;
        
        // Update role directly (not through mass assignment)
        $user->role = $validated['role'];
        $user->save();
        
        // Log the role change for audit
        \Log::info('User role changed', [
            'user_id' => $user->id,
            'changed_by' => $currentUser->id,
            'old_role' => $oldRole,
            'new_role' => $validated['role'],
            'timestamp' => now(),
        ]);
        
        // Create audit log entry
        \App\Models\AuditLog::create([
            'user_id' => $currentUser->id,
            'action_type' => 'role_change',
            'entity_type' => 'User',
            'entity_id' => $user->id,
            'metadata' => [
                'old_role' => $oldRole,
                'new_role' => $validated['role'],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
            'timestamp' => now(),
        ]);
        
        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user->fresh(),
        ]);
    }
}
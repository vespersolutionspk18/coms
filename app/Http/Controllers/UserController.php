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
        $users = User::with('firm')->get();
        
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
        $firms = Firm::all();
        
        return Inertia::render('users/form', [
            'firms' => $firms,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'nullable|string|min:8|confirmed',
            'phone' => 'nullable|string|max:255',
            'firm_id' => 'nullable|exists:firms,id',
        ]);

        // If no password provided, generate a random one
        if (empty($validated['password'])) {
            $validated['password'] = Hash::make(Str::random(16));
        } else {
            $validated['password'] = Hash::make($validated['password']);
        }
        
        $validated['role'] = 'User'; // Default role
        $validated['status'] = 'Active'; // Default status

        User::create($validated);

        return redirect()->route('users.index')->with('success', 'User created successfully');
    }

    public function show(User $user)
    {
        $user->load('firm', 'tasks', 'documents');
        $firms = Firm::all();
        
        return Inertia::render('users/form', [
            'user' => $user,
            'firms' => $firms,
        ]);
    }

    public function edit(User $user)
    {
        $user->load('firm');
        $firms = Firm::all();
        
        return Inertia::render('users/form', [
            'user' => $user,
            'firms' => $firms,
        ]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:8|confirmed',
            'phone' => 'nullable|string|max:255',
            'firm_id' => 'nullable|exists:firms,id',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Keep existing role and status
        $validated['role'] = $user->role ?: 'User';
        $validated['status'] = $user->status ?: 'Active';

        $user->update($validated);

        return redirect()->route('users.index')->with('success', 'User updated successfully');
    }

    public function destroy(User $user)
    {
        $user->delete();

        return redirect()->route('users.index')->with('success', 'User deleted successfully');
    }
}
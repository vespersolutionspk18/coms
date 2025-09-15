<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Firm;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        $firms = Firm::where('status', 'Active')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('auth/register', [
            'firms' => $firms,
        ]);
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'firm_id' => 'required|exists:firms,id',
        ]);

        // Create user without role in mass assignment
        $user = new User([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'firm_id' => $request->firm_id,
        ]);
        
        // Set role explicitly (not through mass assignment) to prevent privilege escalation
        $user->role = 'consultant'; // Default role for self-registered users
        $user->save();

        event(new Registered($user));

        Auth::login($user);

        return redirect()->intended(route('dashboard', absolute: false));
    }
}

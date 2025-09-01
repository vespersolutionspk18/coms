<?php

namespace App\Http\Controllers;

use App\Models\Firm;
use Illuminate\Http\Request;
use Inertia\Inertia;

class FirmController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
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
        return Inertia::render('firms/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:Internal,JV Partner',
            'primary_contact_id' => 'nullable|exists:users,id',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'required|in:Active,Inactive',
            'notes' => 'nullable|string',
            'rating' => 'nullable|numeric|min:0|max:10',
        ]);

        $firm = Firm::create($validated);

        return redirect()->route('firms.show', $firm);
    }

    /**
     * Display the specified resource.
     */
    public function show(Firm $firm)
    {
        $firm->load('primaryContact', 'users', 'projects', 'documents');
        
        return Inertia::render('firms/show', [
            'firm' => $firm
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Firm $firm)
    {
        return Inertia::render('firms/edit', [
            'firm' => $firm
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Firm $firm)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:Internal,JV Partner',
            'primary_contact_id' => 'nullable|exists:users,id',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'address' => 'nullable|string',
            'status' => 'sometimes|required|in:Active,Inactive',
            'notes' => 'nullable|string',
            'rating' => 'nullable|numeric|min:0|max:10',
        ]);

        $firm->update($validated);

        return redirect()->route('firms.show', $firm);
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
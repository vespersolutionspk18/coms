<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\FirmController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\RequirementController;
use App\Http\Controllers\TaskController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\CommentController;
use App\Http\Controllers\MilestoneController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OverviewGenerationController;
use App\Http\Controllers\RequirementsGenerationController;
use App\Http\Controllers\UserController;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

// SSE route with web middleware for session support but no auth middleware
// Security is handled inside the controller with session validation
Route::middleware(['web'])->get('projects/generate-requirements-sse', [RequirementsGenerationController::class, 'generateRequirementsSSE'])->name('projects.generate-requirements-sse');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Resource routes for project management with tenant isolation
    
    // User management - permission-based access with tenant isolation
    Route::resource('users', UserController::class)
        ->middleware(['permission:users.view.all', 'tenant.isolation'])
        ->only(['index']);
    Route::resource('users', UserController::class)
        ->middleware(['permission:users.create', 'tenant.isolation'])
        ->only(['create', 'store']);
    Route::resource('users', UserController::class)
        ->middleware(['tenant.isolation'])
        ->only(['show', 'edit', 'update', 'destroy']);
    Route::patch('users/{user}/role', [UserController::class, 'updateRole'])
        ->name('users.updateRole')
        ->middleware(['permission:users.change_role', 'tenant.isolation']);
    
    // Firm management - permission-based access with tenant isolation
    Route::resource('firms', FirmController::class)
        ->middleware(['permission:firms.view.all', 'tenant.isolation'])
        ->only(['index']);
    Route::resource('firms', FirmController::class)
        ->middleware(['permission:firms.create', 'tenant.isolation'])
        ->only(['create', 'store']);
    Route::resource('firms', FirmController::class)
        ->middleware(['permission:firms.delete', 'tenant.isolation'])
        ->only(['destroy']);
    Route::resource('firms', FirmController::class)
        ->middleware(['tenant.isolation'])
        ->only(['show', 'edit', 'update']);
    
    // Projects - all operations require tenant isolation
    Route::resource('projects', ProjectController::class)->middleware('tenant.isolation');
    Route::post('projects/bulk-destroy', [ProjectController::class, 'bulkDestroy'])->name('projects.bulk-destroy')->middleware('tenant.isolation');
    
    // Requirements - all operations require tenant isolation
    Route::resource('requirements', RequirementController::class)->middleware('tenant.isolation');
    Route::delete('requirements/clear-all/{projectId}', [RequirementController::class, 'clearAll'])->name('requirements.clear-all')->middleware('tenant.isolation');
    
    // Tasks - all operations require tenant isolation
    Route::resource('tasks', TaskController::class)->middleware('tenant.isolation');
    Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('tasks.updateStatus')->middleware('tenant.isolation');
    Route::post('tasks/update-order', [TaskController::class, 'updateOrder'])->name('tasks.updateOrder')->middleware('tenant.isolation');
    
    // Documents - all operations require tenant isolation
    Route::resource('documents', DocumentController::class)->middleware('tenant.isolation');
    Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download')->middleware('tenant.isolation');
    
    // Firm document routes - all require tenant isolation
    Route::get('firms/{firm}/documents', [DocumentController::class, 'firmDocuments'])->name('firms.documents.index')->middleware('tenant.isolation');
    Route::post('firms/{firm}/documents', [DocumentController::class, 'storeFirmDocument'])->name('firms.documents.store')->middleware('tenant.isolation');
    Route::put('firms/{firm}/documents/{document}', [DocumentController::class, 'updateFirmDocument'])->name('firms.documents.update')->middleware('tenant.isolation');
    Route::delete('firms/{firm}/documents/{document}', [DocumentController::class, 'destroyFirmDocument'])->name('firms.documents.destroy')->middleware('tenant.isolation');
    
    // Comments - all operations require tenant isolation
    Route::resource('comments', CommentController::class)->middleware('tenant.isolation');
    
    // Milestones - all operations require tenant isolation
    Route::resource('milestones', MilestoneController::class)->middleware('tenant.isolation');
    Route::patch('milestones/{milestone}/status', [MilestoneController::class, 'updateStatus'])->name('milestones.updateStatus')->middleware('tenant.isolation');
    Route::post('milestones/update-order', [MilestoneController::class, 'updateOrder'])->name('milestones.updateOrder')->middleware('tenant.isolation');
    
    // Notifications - user-specific, require authentication but handle their own isolation
    Route::resource('notifications', NotificationController::class);
    
    // Overview generation route - requires tenant isolation for project access
    Route::post('projects/generate-overview', [OverviewGenerationController::class, 'generateOverview'])->name('projects.generate-overview')->middleware('tenant.isolation');
    
    // Requirements generation route (GET for SSE support) - requires tenant isolation
    Route::get('projects/generate-requirements', [RequirementsGenerationController::class, 'generateRequirements'])->name('projects.generate-requirements')->middleware('tenant.isolation');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

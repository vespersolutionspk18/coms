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

    // Resource routes for project management
    Route::resource('firms', FirmController::class);
    Route::resource('projects', ProjectController::class);
    Route::resource('requirements', RequirementController::class);
    Route::delete('requirements/clear-all/{projectId}', [RequirementController::class, 'clearAll'])->name('requirements.clear-all');
    Route::resource('tasks', TaskController::class);
    Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('tasks.updateStatus');
    Route::post('tasks/update-order', [TaskController::class, 'updateOrder'])->name('tasks.updateOrder');
    Route::resource('documents', DocumentController::class);
    Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
    
    // Firm document routes
    Route::get('firms/{firm}/documents', [DocumentController::class, 'firmDocuments'])->name('firms.documents.index');
    Route::post('firms/{firm}/documents', [DocumentController::class, 'storeFirmDocument'])->name('firms.documents.store');
    Route::put('firms/{firm}/documents/{document}', [DocumentController::class, 'updateFirmDocument'])->name('firms.documents.update');
    Route::delete('firms/{firm}/documents/{document}', [DocumentController::class, 'destroyFirmDocument'])->name('firms.documents.destroy');
    Route::resource('comments', CommentController::class);
    Route::resource('milestones', MilestoneController::class);
    Route::patch('milestones/{milestone}/status', [MilestoneController::class, 'updateStatus'])->name('milestones.updateStatus');
    Route::post('milestones/update-order', [MilestoneController::class, 'updateOrder'])->name('milestones.updateOrder');
    Route::resource('notifications', NotificationController::class);
    
    // Overview generation route
    Route::post('projects/generate-overview', [OverviewGenerationController::class, 'generateOverview'])->name('projects.generate-overview');
    
    // Requirements generation route (GET for SSE support)
    Route::get('projects/generate-requirements', [RequirementsGenerationController::class, 'generateRequirements'])->name('projects.generate-requirements');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

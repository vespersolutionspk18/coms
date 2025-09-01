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
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // Resource routes for project management
    Route::resource('firms', FirmController::class);
    Route::resource('projects', ProjectController::class);
    Route::resource('requirements', RequirementController::class);
    Route::resource('tasks', TaskController::class);
    Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('tasks.updateStatus');
    Route::post('tasks/update-order', [TaskController::class, 'updateOrder'])->name('tasks.updateOrder');
    Route::resource('documents', DocumentController::class);
    Route::get('documents/{document}/download', [DocumentController::class, 'download'])->name('documents.download');
    Route::resource('comments', CommentController::class);
    Route::resource('milestones', MilestoneController::class);
    Route::patch('milestones/{milestone}/status', [MilestoneController::class, 'updateStatus'])->name('milestones.updateStatus');
    Route::post('milestones/update-order', [MilestoneController::class, 'updateOrder'])->name('milestones.updateOrder');
    Route::resource('notifications', NotificationController::class);
    
    // Overview generation route
    Route::post('projects/generate-overview', [OverviewGenerationController::class, 'generateOverview'])->name('projects.generate-overview');
    
    // Requirements generation route
    Route::post('projects/generate-requirements', [RequirementsGenerationController::class, 'generateRequirements'])->name('projects.generate-requirements');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

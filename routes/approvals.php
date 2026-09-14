<?php

use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\ProfileSettingsController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::get('/approvals', fn () => Inertia::render('Approvals/Workspace'))->name('approvals');
    // Same-origin JSON API: Laravel's web middleware supplies secure sessions and CSRF protection.
    Route::prefix('api/approvals')->name('api.approvals.')->group(function () {
        Route::get('/summary', [ApprovalController::class, 'summary']);
        Route::get('/export', [ApprovalController::class, 'export']);
        Route::get('/notifications', [ApprovalController::class, 'notifications']);
        Route::patch('/notifications/read', [ApprovalController::class, 'readNotifications']);
        Route::patch('/preferences', [ApprovalController::class, 'preferences']);
        Route::post('/profile-photo', [ProfileSettingsController::class, 'upload'])->middleware('throttle:20,1');
        Route::delete('/profile-photo', [ProfileSettingsController::class, 'remove']);
        Route::get('/avatars/{user}', [ProfileSettingsController::class, 'show'])->whereNumber('user');
        Route::put('/password', [ProfileSettingsController::class, 'password'])->middleware('throttle:6,1');
        Route::get('/', [ApprovalController::class, 'index']);
        Route::post('/', [ApprovalController::class, 'store'])->middleware('throttle:60,1');
        Route::get('/{approval}', [ApprovalController::class, 'show'])->whereNumber('approval');
        Route::put('/{approval}', [ApprovalController::class, 'update'])->whereNumber('approval');
        Route::delete('/{approval}', [ApprovalController::class, 'destroy'])->whereNumber('approval');
        Route::post('/{approval}/decision', [ApprovalController::class, 'decision'])->whereNumber('approval');
        Route::post('/{approval}/cancel', [ApprovalController::class, 'cancel'])->whereNumber('approval');
        Route::post('/{approval}/comments', [ApprovalController::class, 'comment'])->whereNumber('approval')->middleware('throttle:60,1');
    });
});

<?php

use App\Http\Controllers\Api\ProfileSettingsController;
use App\Http\Controllers\ProfileController;
use App\Http\Middleware\UseOrganization;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| หน้าเว็บสาธารณะ
|--------------------------------------------------------------------------
*/

Route::get('/', fn () => auth()->check() ? redirect('/approvals') : Inertia::render('Approvals/Auth', ['mode' => 'login']))->name('home');

/*
|--------------------------------------------------------------------------
| ระบบสมาชิก
|--------------------------------------------------------------------------
*/

Route::get('/dashboard', fn () => Inertia::render('Approvals/Workspace'))
    ->middleware(['auth', 'verified', UseOrganization::class])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', fn () => redirect('/approvals?view=settings'))->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::patch('/api/locale', [ProfileSettingsController::class, 'locale'])->middleware('throttle:30,1');
});

require __DIR__.'/auth.php';
require __DIR__.'/approvals.php';
require __DIR__.'/organizations.php';

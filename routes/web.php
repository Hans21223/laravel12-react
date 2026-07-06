<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/smart-door', function () {
    return Inertia::render('SmartDoor');
})->name('smart-door');

// Route สำหรับเรียกหน้าเกม Mini RTS
Route::get('/mini-rts', function () {
    return Inertia::render('MiniRTS');
})->name('mini-rts');

Route::get('/drone-system', function () {
    return Inertia::render('DroneDashboard');
})->name('drone.system');

Route::get('/quiz4', function () {
    return Inertia::render('DroneDatabase');
})->name('quiz4');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';

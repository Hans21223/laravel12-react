<?php

use App\Http\Controllers\DroneController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SimulatorController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| หน้าเว็บสาธารณะ
|--------------------------------------------------------------------------
*/

Route::get('/', fn () => auth()->check() ? redirect('/approvals') : Inertia::render('Approvals/Auth', ['mode'=>'login']))->name('home');

/*
|--------------------------------------------------------------------------
| A.E.G.I.S. — ระบบจัดการฝูงโดรน
|--------------------------------------------------------------------------
*/

Route::controller(DroneController::class)->group(function () {
    Route::get('/drone-system', 'dashboard')->name('drones.dashboard');
    Route::get('/fleet', 'index')->name('drones.index');

    Route::post('/drones', 'store')->name('drones.store');
    Route::put('/drones/{drone}', 'update')->name('drones.update');
    Route::delete('/drones/{drone}', 'destroy')->name('drones.destroy');
    Route::post('/drones/{drone}/command', 'command')->name('drones.command');
});

// ลิงก์เดิมของงาน Quiz 4 ให้ชี้มาที่หน้าตารางใหม่
Route::redirect('/quiz4', '/fleet')->name('quiz4');

/*
|--------------------------------------------------------------------------
| หน้าจำลองการทำงาน (Simulator)
|--------------------------------------------------------------------------
*/

Route::controller(SimulatorController::class)->group(function () {
    Route::get('/smart-door', 'smartDoor')->name('smart-door');
    Route::get('/mini-rts', 'miniRts')->name('mini-rts');
});

/*
|--------------------------------------------------------------------------
| ระบบสมาชิก
|--------------------------------------------------------------------------
*/

Route::get('/dashboard', fn () => Inertia::render('Approvals/Workspace'))
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
require __DIR__.'/approvals.php';

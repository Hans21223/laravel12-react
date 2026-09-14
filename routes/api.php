<?php

use App\Http\Controllers\Api\DroneApiController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| JSON API
|--------------------------------------------------------------------------
| ไฟล์นี้ถูก mount ด้วย prefix "api" อยู่แล้ว (bootstrap/app.php)
| จึงเขียน path เป็น "/drones" ไม่ต้องใส่ "/api" ซ้ำ
*/

Route::controller(DroneApiController::class)->group(function () {
    Route::get('/drones', 'index')->name('api.drones.index');
    Route::get('/drones/stats', 'stats')->name('api.drones.stats');
    Route::get('/drones/{drone}', 'show')->name('api.drones.show');
    Route::post('/drones/telemetry', 'syncTelemetry')->name('api.drones.telemetry');
});

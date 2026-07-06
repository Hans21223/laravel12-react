<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

// 1. หน้า Dashboard
Route::get('/drone-system', function () {
    return Inertia::render('DroneDashboard');
})->name('drone.system');

// 2. ดึงข้อมูลโดรน
Route::get('/api/drones', function () {
    $drones = DB::table('drone_fleets')->get();
    return response()->json($drones);
});

// 3. บันทึกข้อมูลโดรนตัวใหม่
Route::post('/api/drones', function (Request $request) {
    try {
        $id = DB::table('drone_fleets')->insertGetId([
            'drone_code' => strtoupper($request->input('id')),
            'model_name' => $request->input('name'),
            'battery_capacity' => 10000,
            'max_speed' => 60.50,
            'payload_module' => $request->input('payload'),
            'status' => 'Standby',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        return response()->json(['success' => true, 'db_id' => $id]);
    } catch (\Exception $e) {
        // ดักจับ Error กรณีรหัสโดรน (drone_code) ซ้ำ
        return response()->json(['success' => false, 'message' => $e->getMessage()], 400);
    }
});
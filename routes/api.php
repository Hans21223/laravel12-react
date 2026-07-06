<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

// 1. Route สำหรับดึงข้อมูลโดรนทั้งหมด (ทำงานตอนเปิดหน้าเว็บครั้งแรก)
Route::get('/drones', function () {
    $drones = DB::table('drone_fleets')->get();
    return response()->json($drones);
});

// 2. Route สำหรับรับข้อมูลจาก React มาบันทึกลง SQLite
Route::post('/drones', function (Request $request) {
    // นำข้อมูลที่ React ส่งมา (JSON) บันทึกลงตาราง drone_fleets
    $id = DB::table('drone_fleets')->insertGetId([
        'drone_code' => $request->input('id'),
        'model_name' => $request->input('name'),
        'battery_capacity' => 10000,           // สมมติค่าเริ่มต้นไปก่อน
        'max_speed' => 60.50,                  // สมมติค่าเริ่มต้น
        'payload_module' => $request->input('payload'),
        'status' => 'Standby',                 // โดรนใหม่ให้สถานะสแตนด์บายเสมอ
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    return response()->json(['success' => true, 'db_id' => $id]);
});
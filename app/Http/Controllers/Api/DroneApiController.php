<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Drone;
use App\Support\FleetSummary;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DroneApiController extends Controller
{
    /**
     * รายชื่อโดรนทั้งหมดในรูปแบบ JSON (ใช้โดยหน้า SPA และเรียกจากภายนอกได้)
     */
    public function index(Request $request): JsonResponse
    {
        $drones = Drone::query()
            ->search($request->string('search')->trim()->value() ?: null)
            ->status($request->string('status')->toString() ?: null)
            ->orderBy('drone_code')
            ->get();

        return response()->json([
            'data' => $drones,
            'meta' => ['count' => $drones->count()],
        ]);
    }

    public function show(Drone $drone): JsonResponse
    {
        return response()->json(['data' => $drone]);
    }

    public function stats(): JsonResponse
    {
        return response()->json(['data' => FleetSummary::stats()]);
    }

    /**
     * รับค่า telemetry ที่จำลองฝั่ง React มาบันทึกเป็นระยะ
     * ส่งมาเป็นชุดครั้งเดียว เพื่อไม่ให้ยิงฐานข้อมูลทุกวินาที
     */
    public function syncTelemetry(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'readings' => ['required', 'array', 'min:1', 'max:100'],
            'readings.*.id' => ['required', 'integer', 'exists:drone_fleets,id'],
            'readings.*.battery_level' => ['required', 'integer', 'between:0,100'],
            'readings.*.altitude' => ['required', 'numeric', 'between:0,10000'],
            'readings.*.speed' => ['required', 'numeric', 'between:0,999'],
            'readings.*.heading' => ['required', 'numeric', 'between:0,360'],
            'readings.*.latitude' => ['required', 'numeric', 'between:-90,90'],
            'readings.*.longitude' => ['required', 'numeric', 'between:-180,180'],
            'readings.*.signal_strength' => ['required', 'integer', 'between:0,100'],
        ]);

        $readings = collect($validated['readings'])->keyBy('id');

        $drones = Drone::whereIn('id', $readings->keys())->get();

        foreach ($drones as $drone) {
            $reading = $readings[$drone->id];

            // อัปเดตเฉพาะยูนิตที่ยังบินอยู่ กันข้อมูลเก่าย้อนกลับมาทับหลังสั่งลงจอด
            if (! $drone->isAirborne()) {
                continue;
            }

            $drone->forceFill([
                'battery_level' => $reading['battery_level'],
                'altitude' => $reading['altitude'],
                'speed' => $reading['speed'],
                'heading' => $reading['heading'],
                'latitude' => $reading['latitude'],
                'longitude' => $reading['longitude'],
                'signal_strength' => $reading['signal_strength'],
                'last_contact_at' => now(),
            ]);

            // แบตหมดกลางอากาศ ให้ระบบบังคับลงจอดอัตโนมัติ
            if ($drone->battery_level <= 0) {
                $drone->forceFill([
                    'status' => Drone::STATUS_STANDBY,
                    'altitude' => 0,
                    'speed' => 0,
                ]);
            }

            $drone->save();
        }

        return response()->json([
            'data' => ['synced' => $drones->count()],
        ]);
    }
}

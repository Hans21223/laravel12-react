<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreDroneRequest;
use App\Http\Requests\UpdateDroneRequest;
use App\Models\Drone;
use App\Support\FleetSummary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DroneController extends Controller
{
    /**
     * คอลัมน์ที่อนุญาตให้เรียงลำดับได้ (กัน SQL injection จาก query string)
     */
    private const SORTABLE = [
        'drone_code',
        'model_name',
        'aircraft_type',
        'battery_capacity',
        'max_speed',
        'payload_module',
        'status',
        'battery_level',
        'created_at',
    ];

    /**
     * หน้าตารางฐานข้อมูล พร้อมค้นหา / กรอง / เรียง / แบ่งหน้า
     */
    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        $drones = Drone::query()
            ->search($filters['search'])
            ->status($filters['status'])
            ->aircraftType($filters['type'])
            ->orderBy($filters['sort'], $filters['direction'])
            ->paginate($filters['perPage'])
            ->withQueryString();

        return Inertia::render('Fleet/Index', [
            'drones' => $drones,
            'filters' => $filters,
            'stats' => FleetSummary::stats(),
            'options' => FleetSummary::options(),
        ]);
    }

    /**
     * หน้าศูนย์บัญชาการ (Command Dashboard)
     */
    public function dashboard(): Response
    {
        return Inertia::render('Fleet/Dashboard', [
            'drones' => Drone::orderBy('drone_code')->get(),
            'stats' => FleetSummary::stats(),
            'options' => FleetSummary::options(),
        ]);
    }

    public function store(StoreDroneRequest $request): RedirectResponse
    {
        $drone = Drone::create([
            ...$request->validated(),
            'status' => Drone::STATUS_STANDBY,
            'battery_level' => 100,
            'signal_strength' => 100,
            'altitude' => 0,
            'speed' => 0,
            'last_contact_at' => now(),
        ]);

        return back()->with('flash', [
            'type' => 'success',
            'message' => "ลงทะเบียนยูนิต {$drone->drone_code} เข้าสู่ฐานข้อมูลแล้ว",
        ]);
    }

    public function update(UpdateDroneRequest $request, Drone $drone): RedirectResponse
    {
        $drone->fill($request->validated());

        // ลงจอดแล้วต้องไม่มีความเร็ว/ความสูงค้างอยู่
        if (! $drone->isAirborne()) {
            $drone->altitude = 0;
            $drone->speed = 0;
        }

        $drone->last_contact_at = now();
        $drone->save();

        return back()->with('flash', [
            'type' => 'success',
            'message' => "อัปเดตข้อมูลยูนิต {$drone->drone_code} เรียบร้อย",
        ]);
    }

    public function destroy(Drone $drone): RedirectResponse
    {
        $code = $drone->drone_code;
        $drone->delete();

        return back()->with('flash', [
            'type' => 'success',
            'message' => "ถอนยูนิต {$code} ออกจากฐานข้อมูลแล้ว",
        ]);
    }

    /**
     * สั่งการบิน แล้วบันทึกสถานะลงฐานข้อมูลทันที
     */
    public function command(Request $request, Drone $drone): RedirectResponse
    {
        $validated = $request->validate([
            'command' => ['required', 'in:LAUNCH,LAND,RTL'],
        ]);

        if ($validated['command'] === 'LAUNCH' && $drone->status !== Drone::STATUS_STANDBY) {
            return back()->withErrors(['command' => 'ยูนิตนี้ไม่ได้อยู่ในสถานะ Standby จึงขึ้นบินไม่ได้']);
        }

        if ($validated['command'] === 'LAUNCH' && $drone->battery_level < 20) {
            return back()->withErrors(['command' => 'แบตเตอรี่ต่ำกว่า 20% ไม่อนุญาตให้ขึ้นบิน']);
        }

        if (in_array($validated['command'], ['LAND', 'RTL'], true) && ! $drone->isAirborne()) {
            return back()->withErrors(['command' => 'ยูนิตนี้ไม่ได้อยู่กลางอากาศ']);
        }

        match ($validated['command']) {
            'LAUNCH' => $drone->forceFill([
                'status' => Drone::STATUS_IN_FLIGHT,
                'altitude' => 5,
                'speed' => 10,
            ]),
            'RTL' => $drone->forceFill([
                'status' => Drone::STATUS_RETURNING,
            ]),
            'LAND' => $drone->forceFill([
                'status' => Drone::STATUS_STANDBY,
                'altitude' => 0,
                'speed' => 0,
            ]),
        };

        $drone->last_contact_at = now();
        $drone->save();

        return back()->with('flash', [
            'type' => 'success',
            'message' => "ส่งคำสั่ง {$validated['command']} ไปยัง {$drone->drone_code} แล้ว",
        ]);
    }

    /**
     * อ่านค่าตัวกรองจาก query string พร้อมค่าเริ่มต้นที่ปลอดภัย
     *
     * @return array{search: ?string, status: ?string, type: ?string, sort: string, direction: string, perPage: int}
     */
    private function filters(Request $request): array
    {
        $sort = $request->string('sort')->toString();
        $direction = strtolower($request->string('direction')->toString());

        $status = $request->string('status')->toString();
        $type = $request->string('type')->toString();

        return [
            'search' => $request->string('search')->trim()->value() ?: null,
            'status' => in_array($status, Drone::STATUSES, true) ? $status : null,
            'type' => in_array($type, Drone::AIRCRAFT_TYPES, true) ? $type : null,
            'sort' => in_array($sort, self::SORTABLE, true) ? $sort : 'drone_code',
            'direction' => in_array($direction, ['asc', 'desc'], true) ? $direction : 'asc',
            'perPage' => (int) min(max($request->integer('perPage', 10), 5), 100),
        ];
    }
}

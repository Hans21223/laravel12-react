<?php

namespace App\Support;

use App\Models\Drone;

/**
 * สรุปภาพรวมของฝูงบิน ใช้ร่วมกันระหว่างหน้าเว็บ (Inertia) และ JSON API
 */
class FleetSummary
{
    public static function stats(): array
    {
        $byStatus = Drone::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byType = Drone::query()
            ->selectRaw('aircraft_type, count(*) as total')
            ->groupBy('aircraft_type')
            ->orderByDesc('total')
            ->pluck('total', 'aircraft_type');

        return [
            'total' => Drone::count(),
            'airborne' => Drone::whereIn('status', Drone::AIRBORNE_STATUSES)->count(),
            'lowBattery' => Drone::where('battery_level', '<', 30)->count(),
            'averageBattery' => (int) round(Drone::avg('battery_level') ?? 0),
            'byStatus' => collect(Drone::STATUSES)
                ->mapWithKeys(fn (string $status) => [$status => (int) ($byStatus[$status] ?? 0)])
                ->all(),
            'byType' => $byType->map(fn ($total) => (int) $total)->all(),
        ];
    }

    public static function options(): array
    {
        return [
            'statuses' => Drone::STATUSES,
            'aircraftTypes' => Drone::AIRCRAFT_TYPES,
            'payloadModules' => Drone::PAYLOAD_MODULES,
        ];
    }
}

<?php

namespace Database\Seeders;

use App\Models\Drone;
use Illuminate\Database\Seeder;

class DroneSeeder extends Seeder
{
    public function run(): void
    {
        $fleet = [
            ['DN-01', 'Falcon-X', 'Quad-Copter', 'Optical Camera', 12000, 72.50, Drone::STATUS_IN_FLIGHT, 87, 120.5, 42.3],
            ['DN-02', 'Raven-S', 'Hexa-Copter', 'Thermal Imaging', 16000, 88.00, Drone::STATUS_STANDBY, 100, 0, 0],
            ['DN-03', 'Kestrel-II', 'Fixed-Wing', 'LiDAR Scanner', 22000, 165.75, Drone::STATUS_RETURNING, 41, 260.0, 96.4],
            ['DN-04', 'Osprey-V', 'VTOL', 'Multispectral Sensor', 19500, 140.00, Drone::STATUS_STANDBY, 64, 0, 0],
            ['DN-05', 'Condor-H', 'Octo-Copter', 'Delivery Cargo', 21000, 55.25, Drone::STATUS_MAINTENANCE, 18, 0, 0],
            ['DN-06', 'Harrier-L', 'Quad-Copter', 'Optical Camera', 9000, 64.00, Drone::STATUS_STANDBY, 92, 0, 0],
        ];

        foreach ($fleet as [$code, $model, $type, $payload, $capacity, $speed, $status, $battery, $altitude, $velocity]) {
            Drone::updateOrCreate(
                ['drone_code' => $code],
                [
                    'model_name' => $model,
                    'aircraft_type' => $type,
                    'payload_module' => $payload,
                    'battery_capacity' => $capacity,
                    'max_speed' => $speed,
                    'status' => $status,
                    'battery_level' => $battery,
                    'altitude' => $altitude,
                    'speed' => $velocity,
                    'heading' => fake()->randomFloat(2, 0, 359),
                    'latitude' => fake()->latitude(13.6, 14.1),
                    'longitude' => fake()->longitude(100.4, 100.8),
                    'signal_strength' => fake()->numberBetween(60, 100),
                    'last_contact_at' => now(),
                ]
            );
        }
    }
}

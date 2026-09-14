<?php

namespace Database\Factories;

use App\Models\Drone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Drone>
 */
class DroneFactory extends Factory
{
    protected $model = Drone::class;

    public function definition(): array
    {
        $status = fake()->randomElement(Drone::STATUSES);
        $airborne = in_array($status, Drone::AIRBORNE_STATUSES, true);

        return [
            'drone_code' => strtoupper(fake()->unique()->bothify('??-##')),
            'model_name' => fake()->randomElement(['Falcon', 'Raven', 'Kestrel', 'Osprey', 'Harrier', 'Condor']).'-'.fake()->randomLetter(),
            'aircraft_type' => fake()->randomElement(Drone::AIRCRAFT_TYPES),
            'battery_capacity' => fake()->numberBetween(5000, 22000),
            'max_speed' => fake()->randomFloat(2, 30, 180),
            'payload_module' => fake()->randomElement(Drone::PAYLOAD_MODULES),
            'status' => $status,
            'battery_level' => fake()->numberBetween(15, 100),
            'altitude' => $airborne ? fake()->randomFloat(2, 20, 400) : 0,
            'speed' => $airborne ? fake()->randomFloat(2, 10, 90) : 0,
            'heading' => fake()->randomFloat(2, 0, 359),
            'latitude' => fake()->latitude(13.5, 14.2),
            'longitude' => fake()->longitude(100.3, 100.9),
            'signal_strength' => fake()->numberBetween(45, 100),
            'last_contact_at' => now(),
        ];
    }

    public function airborne(): static
    {
        return $this->state(fn () => [
            'status' => Drone::STATUS_IN_FLIGHT,
            'altitude' => fake()->randomFloat(2, 40, 320),
            'speed' => fake()->randomFloat(2, 20, 80),
        ]);
    }

    public function standby(): static
    {
        return $this->state(fn () => [
            'status' => Drone::STATUS_STANDBY,
            'altitude' => 0,
            'speed' => 0,
        ]);
    }
}

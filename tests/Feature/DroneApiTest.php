<?php

namespace Tests\Feature;

use App\Models\Drone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DroneApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_api_lists_drones(): void
    {
        Drone::factory()->count(3)->create();

        $this->getJson('/api/drones')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('meta.count', 3);
    }

    public function test_the_api_returns_fleet_statistics(): void
    {
        Drone::factory()->count(2)->airborne()->create();

        $this->getJson('/api/drones/stats')
            ->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.airborne', 2);
    }

    public function test_the_api_returns_a_single_drone(): void
    {
        $drone = Drone::factory()->create(['drone_code' => 'DN-77']);

        $this->getJson("/api/drones/{$drone->id}")
            ->assertOk()
            ->assertJsonPath('data.drone_code', 'DN-77');
    }

    public function test_a_missing_drone_returns_404(): void
    {
        $this->getJson('/api/drones/999')->assertNotFound();
    }

    /* ---------------------------------------------------------------
     * การบันทึก telemetry
     * ------------------------------------------------------------- */

    private function reading(Drone $drone, array $overrides = []): array
    {
        return array_merge([
            'id' => $drone->id,
            'battery_level' => 55,
            'altitude' => 123.45,
            'speed' => 40.5,
            'heading' => 180.0,
            'latitude' => 13.75,
            'longitude' => 100.5,
            'signal_strength' => 88,
        ], $overrides);
    }

    public function test_telemetry_is_saved_for_airborne_drones(): void
    {
        $drone = Drone::factory()->airborne()->create();

        $this->postJson('/api/drones/telemetry', ['readings' => [$this->reading($drone)]])
            ->assertOk()
            ->assertJsonPath('data.synced', 1);

        $drone->refresh();

        $this->assertSame(55, $drone->battery_level);
        $this->assertSame(123.45, $drone->altitude);
        $this->assertNotNull($drone->last_contact_at);
    }

    public function test_telemetry_is_ignored_for_grounded_drones(): void
    {
        // กันข้อมูลเก่าที่ค้างอยู่ในเบราว์เซอร์ย้อนกลับมาทับหลังสั่งลงจอดแล้ว
        $drone = Drone::factory()->standby()->create(['battery_level' => 100, 'altitude' => 0]);

        $this->postJson('/api/drones/telemetry', ['readings' => [$this->reading($drone)]])->assertOk();

        $drone->refresh();

        $this->assertSame(100, $drone->battery_level);
        $this->assertSame(0.0, $drone->altitude);
    }

    public function test_an_empty_battery_forces_an_automatic_landing(): void
    {
        $drone = Drone::factory()->airborne()->create();

        $this->postJson('/api/drones/telemetry', [
            'readings' => [$this->reading($drone, ['battery_level' => 0])],
        ])->assertOk();

        $drone->refresh();

        $this->assertSame(Drone::STATUS_STANDBY, $drone->status);
        $this->assertSame(0.0, $drone->altitude);
        $this->assertSame(0.0, $drone->speed);
    }

    public function test_out_of_range_telemetry_is_rejected(): void
    {
        $drone = Drone::factory()->airborne()->create();

        $this->postJson('/api/drones/telemetry', [
            'readings' => [$this->reading($drone, ['battery_level' => 500, 'latitude' => 999])],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['readings.0.battery_level', 'readings.0.latitude']);
    }

    public function test_telemetry_requires_at_least_one_reading(): void
    {
        $this->postJson('/api/drones/telemetry', ['readings' => []])
            ->assertStatus(422)
            ->assertJsonValidationErrors('readings');
    }
}

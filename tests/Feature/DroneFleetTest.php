<?php

namespace Tests\Feature;

use App\Models\Drone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DroneFleetTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'drone_code' => 'DN-01',
            'model_name' => 'Falcon',
            'aircraft_type' => 'Hexa-Copter',
            'payload_module' => 'Thermal Imaging',
            'battery_capacity' => 12000,
            'max_speed' => 72.5,
        ], $overrides);
    }

    /* ---------------------------------------------------------------
     * หน้าเว็บ
     * ------------------------------------------------------------- */

    public function test_the_fleet_page_renders(): void
    {
        Drone::factory()->count(3)->create();

        $this->get('/fleet')->assertOk();
    }

    public function test_the_command_dashboard_renders(): void
    {
        Drone::factory()->create();

        $this->get('/drone-system')->assertOk();
    }

    public function test_the_old_quiz4_link_redirects_to_the_fleet_page(): void
    {
        $this->get('/quiz4')->assertRedirect('/fleet');
    }

    /* ---------------------------------------------------------------
     * สร้าง / แก้ไข / ลบ
     * ------------------------------------------------------------- */

    public function test_a_drone_can_be_registered(): void
    {
        $this->post('/drones', $this->payload())->assertRedirect();

        $this->assertDatabaseHas('drone_fleets', [
            'drone_code' => 'DN-01',
            'model_name' => 'Falcon',
            'aircraft_type' => 'Hexa-Copter',
            'status' => Drone::STATUS_STANDBY,
            'battery_level' => 100,
        ]);
    }

    public function test_the_call_sign_is_stored_in_upper_case(): void
    {
        $this->post('/drones', $this->payload(['drone_code' => ' dn-07 ']))->assertRedirect();

        $this->assertDatabaseHas('drone_fleets', ['drone_code' => 'DN-07']);
    }

    public function test_a_duplicate_call_sign_is_rejected_regardless_of_case(): void
    {
        Drone::factory()->create(['drone_code' => 'DN-09']);

        $this->post('/drones', $this->payload(['drone_code' => 'dn-09']))
            ->assertSessionHasErrors('drone_code');

        $this->assertSame(1, Drone::count());
    }

    public function test_incomplete_registrations_are_rejected(): void
    {
        $this->post('/drones', [])
            ->assertSessionHasErrors(['drone_code', 'model_name', 'aircraft_type', 'payload_module']);

        $this->assertSame(0, Drone::count());
    }

    public function test_an_unknown_aircraft_type_is_rejected(): void
    {
        $this->post('/drones', $this->payload(['aircraft_type' => 'Spaceship']))
            ->assertSessionHasErrors('aircraft_type');
    }

    public function test_a_drone_can_be_updated(): void
    {
        $drone = Drone::factory()->standby()->create(['drone_code' => 'DN-11']);

        $this->put("/drones/{$drone->id}", $this->payload([
            'drone_code' => 'DN-11',
            'model_name' => 'Renamed',
            'status' => Drone::STATUS_MAINTENANCE,
        ]))->assertRedirect();

        $this->assertDatabaseHas('drone_fleets', [
            'id' => $drone->id,
            'model_name' => 'Renamed',
            'status' => Drone::STATUS_MAINTENANCE,
        ]);
    }

    public function test_a_drone_can_keep_its_own_call_sign_when_updated(): void
    {
        $drone = Drone::factory()->create(['drone_code' => 'DN-12']);

        $this->put("/drones/{$drone->id}", $this->payload([
            'drone_code' => 'DN-12',
            'status' => Drone::STATUS_STANDBY,
        ]))->assertSessionHasNoErrors();
    }

    public function test_a_drone_can_be_deleted(): void
    {
        $drone = Drone::factory()->create();

        $this->delete("/drones/{$drone->id}")->assertRedirect();

        $this->assertDatabaseMissing('drone_fleets', ['id' => $drone->id]);
    }

    /* ---------------------------------------------------------------
     * คำสั่งการบิน — ต้องถูกบันทึกลงฐานข้อมูล
     * ------------------------------------------------------------- */

    public function test_launching_persists_the_flight_state(): void
    {
        $drone = Drone::factory()->standby()->create(['battery_level' => 90]);

        $this->post("/drones/{$drone->id}/command", ['command' => 'LAUNCH'])->assertRedirect();

        $drone->refresh();

        $this->assertSame(Drone::STATUS_IN_FLIGHT, $drone->status);
        $this->assertGreaterThan(0, $drone->altitude);
        $this->assertNotNull($drone->last_contact_at);
    }

    public function test_landing_resets_altitude_and_speed(): void
    {
        $drone = Drone::factory()->airborne()->create();

        $this->post("/drones/{$drone->id}/command", ['command' => 'LAND'])->assertRedirect();

        $drone->refresh();

        $this->assertSame(Drone::STATUS_STANDBY, $drone->status);
        $this->assertSame(0.0, $drone->altitude);
        $this->assertSame(0.0, $drone->speed);
    }

    public function test_a_drone_that_is_already_airborne_cannot_launch_again(): void
    {
        $drone = Drone::factory()->airborne()->create();

        $this->post("/drones/{$drone->id}/command", ['command' => 'LAUNCH'])
            ->assertSessionHasErrors('command');

        $this->assertSame(Drone::STATUS_IN_FLIGHT, $drone->refresh()->status);
    }

    public function test_a_drone_with_a_low_battery_cannot_launch(): void
    {
        $drone = Drone::factory()->standby()->create(['battery_level' => 12]);

        $this->post("/drones/{$drone->id}/command", ['command' => 'LAUNCH'])
            ->assertSessionHasErrors('command');

        $this->assertSame(Drone::STATUS_STANDBY, $drone->refresh()->status);
    }

    public function test_a_grounded_drone_cannot_be_told_to_land(): void
    {
        $drone = Drone::factory()->standby()->create();

        $this->post("/drones/{$drone->id}/command", ['command' => 'LAND'])
            ->assertSessionHasErrors('command');
    }

    public function test_an_unknown_command_is_rejected(): void
    {
        $drone = Drone::factory()->create();

        $this->post("/drones/{$drone->id}/command", ['command' => 'SELF_DESTRUCT'])
            ->assertSessionHasErrors('command');
    }
}

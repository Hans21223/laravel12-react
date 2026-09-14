<?php

namespace Tests\Feature;

use App\Models\Drone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class FleetFilteringTest extends TestCase
{
    use RefreshDatabase;

    public function test_drones_can_be_searched_by_call_sign(): void
    {
        Drone::factory()->create(['drone_code' => 'DN-AAA', 'model_name' => 'Falcon']);
        Drone::factory()->create(['drone_code' => 'DN-BBB', 'model_name' => 'Raven']);

        $this->get('/fleet?search=AAA')->assertInertia(
            fn (AssertableInertia $page) => $page
                ->component('Fleet/Index')
                ->has('drones.data', 1)
                ->where('drones.data.0.drone_code', 'DN-AAA')
        );
    }

    public function test_drones_can_be_searched_by_model_name(): void
    {
        Drone::factory()->create(['drone_code' => 'DN-AAA', 'model_name' => 'Falcon']);
        Drone::factory()->create(['drone_code' => 'DN-BBB', 'model_name' => 'Raven']);

        $this->get('/fleet?search=Raven')->assertInertia(
            fn (AssertableInertia $page) => $page->has('drones.data', 1)
                ->where('drones.data.0.model_name', 'Raven')
        );
    }

    public function test_drones_can_be_filtered_by_status(): void
    {
        Drone::factory()->count(2)->airborne()->create();
        Drone::factory()->count(3)->standby()->create();

        $this->get('/fleet?status=In_Flight')->assertInertia(
            fn (AssertableInertia $page) => $page->has('drones.data', 2)
        );
    }

    public function test_drones_can_be_filtered_by_aircraft_type(): void
    {
        Drone::factory()->count(2)->create(['aircraft_type' => 'VTOL']);
        Drone::factory()->count(4)->create(['aircraft_type' => 'Quad-Copter']);

        $this->get('/fleet?type=VTOL')->assertInertia(
            fn (AssertableInertia $page) => $page->has('drones.data', 2)
        );
    }

    public function test_results_can_be_sorted(): void
    {
        Drone::factory()->create(['drone_code' => 'DN-002']);
        Drone::factory()->create(['drone_code' => 'DN-001']);

        $this->get('/fleet?sort=drone_code&direction=desc')->assertInertia(
            fn (AssertableInertia $page) => $page->where('drones.data.0.drone_code', 'DN-002')
        );
    }

    public function test_an_unknown_sort_column_falls_back_to_the_default(): void
    {
        Drone::factory()->count(2)->create();

        // ป้องกันการยิงชื่อคอลัมน์มั่วๆ เข้ามาทาง query string
        $this->get('/fleet?sort=password&direction=evil')->assertOk()->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('filters.sort', 'drone_code')
                ->where('filters.direction', 'asc')
        );
    }

    public function test_results_are_paginated(): void
    {
        Drone::factory()->count(15)->create();

        $this->get('/fleet?perPage=10')->assertInertia(
            fn (AssertableInertia $page) => $page
                ->has('drones.data', 10)
                ->where('drones.total', 15)
        );
    }

    public function test_the_page_size_is_clamped_to_a_safe_range(): void
    {
        Drone::factory()->count(3)->create();

        $this->get('/fleet?perPage=99999')->assertInertia(
            fn (AssertableInertia $page) => $page->where('filters.perPage', 100)
        );
    }

    public function test_fleet_statistics_are_calculated(): void
    {
        Drone::factory()->count(2)->airborne()->create(['battery_level' => 80]);
        Drone::factory()->standby()->create(['battery_level' => 20]);

        $this->get('/fleet')->assertInertia(
            fn (AssertableInertia $page) => $page
                ->where('stats.total', 3)
                ->where('stats.airborne', 2)
                ->where('stats.lowBattery', 1)
                ->where('stats.averageBattery', 60)
        );
    }
}

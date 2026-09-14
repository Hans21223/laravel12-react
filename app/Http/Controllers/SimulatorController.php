<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

/**
 * หน้าจำลองการทำงานที่ประมวลผลทั้งหมดฝั่ง React (ไม่ต้องใช้ฐานข้อมูล)
 */
class SimulatorController extends Controller
{
    public function smartDoor(): Response
    {
        return Inertia::render('Simulator/SmartDoor');
    }

    public function miniRts(): Response
    {
        return Inertia::render('Simulator/MiniRts');
    }
}

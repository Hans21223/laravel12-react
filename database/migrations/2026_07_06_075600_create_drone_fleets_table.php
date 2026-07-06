<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drone_fleets', function (Blueprint $table) {
            $table->id();
            $table->string('drone_code')->unique(); // 1. รหัสเรียกขานเครื่อง (เช่น DN-01)
            $table->string('model_name');           // 2. ชื่อรุ่นโดรน
            $table->integer('battery_capacity');    // 3. ความจุแบตเตอรี่ (mAh)
            $table->decimal('max_speed', 5, 2);     // 4. ความเร็วสูงสุด (km/h)
            $table->string('payload_module');       // 5. โมดูลอุปกรณ์เสริม (เช่น กล้องจับความร้อน)
            $table->string('status');               // 6. สถานะเริ่มต้น
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drone_fleets');
    }
};
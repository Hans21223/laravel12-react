<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('drone_fleets', function (Blueprint $table) {
            // ชนิดอากาศยานที่ผู้ใช้เลือกตอน Deploy (เดิมถูกส่งมาแต่ไม่ได้ถูกบันทึก)
            $table->string('aircraft_type')->default('Quad-Copter')->after('model_name');
        });
    }

    public function down(): void
    {
        Schema::table('drone_fleets', function (Blueprint $table) {
            $table->dropColumn('aircraft_type');
        });
    }
};

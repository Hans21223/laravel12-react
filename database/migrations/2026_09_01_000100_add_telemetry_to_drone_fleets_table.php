<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * เก็บสถานะการบินลงฐานข้อมูล เพื่อให้ค่าไม่หายเมื่อรีเฟรชหน้าเว็บ
     */
    public function up(): void
    {
        Schema::table('drone_fleets', function (Blueprint $table) {
            $table->unsignedTinyInteger('battery_level')->default(100);
            $table->decimal('altitude', 8, 2)->default(0);
            $table->decimal('speed', 6, 2)->default(0);
            $table->decimal('heading', 6, 2)->default(90);
            $table->decimal('latitude', 10, 7)->default(13.7563);
            $table->decimal('longitude', 10, 7)->default(100.5018);
            $table->unsignedTinyInteger('signal_strength')->default(100);
            $table->timestamp('last_contact_at')->nullable();

            $table->index('status');
            $table->index('aircraft_type');
        });
    }

    public function down(): void
    {
        Schema::table('drone_fleets', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropIndex(['aircraft_type']);

            $table->dropColumn([
                'battery_level',
                'altitude',
                'speed',
                'heading',
                'latitude',
                'longitude',
                'signal_strength',
                'last_contact_at',
            ]);
        });
    }
};

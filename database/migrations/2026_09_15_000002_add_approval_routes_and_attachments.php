<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('approval_requests', function (Blueprint $table) {
            $table->string('route_mode', 20)->default('standard');
            $table->unsignedInteger('approval_round')->default(1);
        });
        Schema::create('approval_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewer_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('round');
            $table->unsignedInteger('position');
            $table->string('status', 20)->default('waiting');
            $table->text('note')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->unique(['approval_request_id', 'round', 'position']);
            $table->index(['reviewer_id', 'status']);
        });
        Schema::create('approval_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('original_name');
            $table->string('storage_path');
            $table->string('mime_type', 100);
            $table->unsignedInteger('size');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_attachments');
        Schema::dropIfExists('approval_steps');
        Schema::table('approval_requests', fn (Blueprint $table) => $table->dropColumn(['route_mode', 'approval_round']));
    }
};

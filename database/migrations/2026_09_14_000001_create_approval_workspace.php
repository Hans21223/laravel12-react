<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('employee');
            $table->string('department')->default('Operations');
            $table->string('locale', 5)->default('en');
        });
        Schema::create('approval_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title', 180);
            $table->text('description');
            $table->string('type', 20);
            $table->string('priority', 20)->default('normal');
            $table->string('status', 20)->default('draft');
            $table->string('department');
            $table->decimal('amount', 12, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->date('due_date')->nullable();
            $table->string('document_url', 2048)->nullable();
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('decision_note')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });
        Schema::create('approval_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->text('body')->nullable();
            $table->timestamps();
        });
        Schema::create('approval_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $table->string('action');
            $table->string('title');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('approval_notifications');
        Schema::dropIfExists('approval_events');
        Schema::dropIfExists('approval_requests');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['role', 'department', 'locale']));
    }
};

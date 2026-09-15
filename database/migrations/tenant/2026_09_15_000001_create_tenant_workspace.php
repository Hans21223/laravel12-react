<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('approval_requests', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('user_id')->index();
            $t->string('title', 180);
            $t->text('description');
            $t->string('type', 20);
            $t->string('priority', 20)->default('normal');
            $t->string('status', 20)->default('draft');
            $t->string('department');
            $t->decimal('amount', 12, 2)->nullable();
            $t->date('start_date')->nullable();
            $t->date('end_date')->nullable();
            $t->date('due_date')->nullable();
            $t->string('document_url', 2048)->nullable();
            $t->unsignedBigInteger('reviewer_id')->nullable();
            $t->text('decision_note')->nullable();
            $t->timestamp('submitted_at')->nullable();
            $t->timestamp('decided_at')->nullable();
            $t->unsignedInteger('version')->default(1);
            $t->string('route_mode', 20)->default('standard');
            $t->unsignedInteger('approval_round')->default(1);
            $t->timestamps();
            $t->softDeletes();
            $t->index(['user_id', 'status']);
            $t->index(['status', 'created_at']);
        });
        Schema::create('approval_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('user_id')->nullable();
            $t->string('action');
            $t->text('body')->nullable();
            $t->timestamps();
        });
        Schema::create('approval_notifications', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('user_id');
            $t->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $t->string('action');
            $t->string('title');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['user_id', 'read_at']);
        });
        Schema::create('approval_steps', function (Blueprint $t) {
            $t->id();
            $t->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('reviewer_id');
            $t->unsignedInteger('round');
            $t->unsignedInteger('position');
            $t->string('status', 20)->default('waiting');
            $t->text('note')->nullable();
            $t->timestamp('decided_at')->nullable();
            $t->timestamps();
            $t->unique(['approval_request_id', 'round', 'position']);
            $t->index(['reviewer_id', 'status']);
        });
        Schema::create('approval_attachments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('user_id');
            $t->string('original_name');
            $t->string('storage_path');
            $t->string('mime_type', 100);
            $t->unsignedInteger('size');
            $t->timestamps();
        });
        Schema::create('direct_messages', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('sender_id');
            $t->unsignedBigInteger('recipient_id');
            $t->text('body');
            $t->timestamp('read_at')->nullable();
            $t->timestamps();
            $t->index(['sender_id', 'recipient_id', 'id']);
            $t->index(['recipient_id', 'read_at']);
        });
        Schema::create('workspace_calls', function (Blueprint $t) {
            $t->id();
            $t->unsignedBigInteger('caller_id');
            $t->unsignedBigInteger('recipient_id');
            $t->string('mode', 10);
            $t->string('status', 20)->default('ringing');
            $t->timestamp('expires_at');
            $t->timestamps();
            $t->index(['recipient_id', 'status']);
        });
        Schema::create('call_signals', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_call_id')->constrained()->cascadeOnDelete();
            $t->unsignedBigInteger('sender_id');
            $t->string('type', 20);
            $t->longText('payload');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['call_signals', 'workspace_calls', 'direct_messages', 'approval_attachments', 'approval_steps', 'approval_notifications', 'approval_events', 'approval_requests'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};

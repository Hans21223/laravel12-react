<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name', 100);
            $table->foreignId('owner_user_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('status', 20)->default('provisioning');
            $table->boolean('is_legacy')->default(false);
            $table->text('database_credentials')->nullable();
            $table->timestamps();
        });
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('active_organization_id')->nullable()->constrained('organizations')->nullOnDelete();
        });
        Schema::create('organization_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('role', 20)->default('employee');
            $table->string('department', 40)->default('Operations');
            $table->boolean('suspended')->default(false);
            $table->timestamps();
            $table->unique(['organization_id', 'user_id']);
        });
        Schema::create('organization_invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $table->string('key_hash', 64)->unique();
            $table->string('label', 100);
            $table->string('email')->nullable();
            $table->unsignedInteger('max_uses')->default(1);
            $table->unsignedInteger('uses')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();
        });
        $owner = DB::table('users')->where('email', 'karn@accord.test')->value('id') ?? DB::table('users')->where('role', 'manager')->value('id');
        $id = DB::table('organizations')->insertGetId(['uuid' => (string) Str::uuid(), 'name' => 'Anaheim Electronics', 'owner_user_id' => $owner, 'status' => 'ready', 'is_legacy' => true, 'created_at' => now(), 'updated_at' => now()]);
        foreach (DB::table('users')->orderBy('id')->get(['id', 'role', 'department']) as $user) {
            DB::table('organization_memberships')->insert(['organization_id' => $id, 'user_id' => $user->id, 'role' => $user->role, 'department' => $user->department, 'created_at' => now(), 'updated_at' => now()]);
        }
        DB::table('users')->update(['active_organization_id' => $id]);
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_invites');
        Schema::dropIfExists('organization_memberships');
        Schema::table('users', fn (Blueprint $table) => $table->dropConstrainedForeignId('active_organization_id'));
        Schema::dropIfExists('organizations');
    }
};

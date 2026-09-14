<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function photo(): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('portrait.png', file_get_contents(__DIR__.'/../Fixtures/avatar.png'));
    }

    public function test_photo_upload_is_private_replaces_previous_and_can_be_removed(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $this->postJson('/api/approvals/profile-photo', ['photo' => $this->photo()])->assertUnauthorized();
        $first = $this->actingAs($user)->postJson('/api/approvals/profile-photo', ['photo' => $this->photo()])->assertOk()->assertJsonMissingPath('avatar_path')->json('avatar_url');
        $path = $user->fresh()->avatar_path;
        Storage::disk('local')->assertExists($path);
        $this->get($first)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $second = $this->postJson('/api/approvals/profile-photo', ['photo' => $this->photo()])->assertOk()->json('avatar_url');
        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($path);
        $path = $user->fresh()->avatar_path;
        $this->deleteJson('/api/approvals/profile-photo')->assertOk()->assertJsonPath('avatar_url', null);
        Storage::disk('local')->assertMissing($path);
        $this->get($second)->assertNotFound();
    }

    public function test_photo_rejects_unsafe_formats_and_oversized_files_and_never_updates_another_user(): void
    {
        Storage::fake('local');
        $user = User::factory()->create();
        $other = User::factory()->create();
        $this->actingAs($user)->postJson('/api/approvals/profile-photo', ['photo' => UploadedFile::fake()->createWithContent('bad.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')])->assertUnprocessable();
        $this->postJson('/api/approvals/profile-photo', ['photo' => $this->photo()->size(2049)])->assertUnprocessable();
        $this->postJson('/api/approvals/profile-photo', ['photo' => $this->photo(), 'user_id' => $other->id])->assertOk();
        $this->assertNull($other->fresh()->avatar_path);
        $url = $user->fresh()->avatar_url;
        $this->post('/logout');
        $this->getJson($url)->assertUnauthorized();
    }

    public function test_preferences_persist_merge_and_cannot_escalate_roles(): void
    {
        $user = User::factory()->create();
        $payload = ['name' => 'Profile Test', 'department' => 'Engineering', 'locale' => 'ja', 'role' => 'manager',
            'preferences' => ['theme' => 'system', 'density' => 'compact', 'page_size' => 24, 'default_view' => 'board', 'reduce_motion' => true]];
        $this->actingAs($user)->patchJson('/api/approvals/preferences', $payload)->assertOk()->assertJsonPath('preferences.theme', 'system')->assertJsonPath('role', 'employee');
        $this->assertSame($payload['preferences'], $user->fresh()->preferences);
        $payload['preferences'] = ['page_size' => 16];
        $this->patchJson('/api/approvals/preferences', $payload)->assertOk()->assertJsonPath('preferences.theme', 'system')->assertJsonPath('preferences.page_size', 16);
        $payload['preferences'] = ['page_size' => 1000];
        $this->patchJson('/api/approvals/preferences', $payload)->assertUnprocessable();
        $payload['preferences'] = ['role' => 'manager'];
        $this->patchJson('/api/approvals/preferences', $payload)->assertUnprocessable();
    }

    public function test_password_change_requires_current_password_and_confirmation(): void
    {
        $user = User::factory()->create(['password' => Hash::make('OriginalSecret123!')]);
        $payload = ['current_password' => 'wrong', 'password' => 'NewSecurePassword123!', 'password_confirmation' => 'NewSecurePassword123!'];
        $this->actingAs($user)->putJson('/api/approvals/password', $payload)->assertUnprocessable();
        $payload['current_password'] = 'OriginalSecret123!';
        $payload['password_confirmation'] = 'does-not-match';
        $this->putJson('/api/approvals/password', $payload)->assertUnprocessable();
        $payload['password_confirmation'] = $payload['password'];
        $this->putJson('/api/approvals/password', $payload)->assertNoContent();
        $this->assertTrue(Hash::check($payload['password'], $user->fresh()->password));
        $this->assertFalse(Hash::check('OriginalSecret123!', $user->fresh()->password));
    }
}

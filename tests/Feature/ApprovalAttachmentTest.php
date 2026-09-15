<?php

namespace Tests\Feature;

use App\Models\ApprovalAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ApprovalAttachmentTest extends TestCase
{
    use RefreshDatabase;

    private function payload(): array
    {
        return ['title' => 'Blueprint review', 'description' => 'Please review the attached engineering blueprint.', 'type' => 'document', 'priority' => 'normal', 'submit' => false];
    }

    private function file(): UploadedFile
    {
        return new UploadedFile(base_path('tests/Fixtures/avatar.png'), 'blueprint.png', 'image/png', null, true);
    }

    public function test_files_are_private_persisted_and_frozen_after_submission(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create(['avatar_path' => 'avatars/owner.png'])->fresh();
        $manager = User::factory()->create(['role' => 'manager'])->fresh();
        $a = $this->actingAs($owner)->postJson('/api/approvals', $this->payload())->assertCreated()->assertJsonPath('owner.avatar_url', '/api/approvals/avatars/'.$owner->id.'?v='.substr(sha1('avatars/owner.png'), 0, 12))->json();
        $url = '/api/approvals/'.$a['id'];
        $r = $this->postJson($url.'/attachments', ['version' => 1, 'file' => $this->file()])->assertCreated()->assertJsonPath('version', 2)->assertJsonPath('attachments.0.original_name', 'blueprint.png')->json();
        $file = ApprovalAttachment::firstOrFail();
        Storage::disk('local')->assertExists($file->storage_path);
        $this->assertArrayNotHasKey('storage_path', $r['attachments'][0]);
        $this->assertDatabaseHas('approval_attachments', ['id' => $file->id, 'original_name' => 'blueprint.png']);
        $download = $url.'/attachments/'.$file->id;
        $this->get($download)->assertOk()->assertDownload('blueprint.png')->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->actingAs($manager)->getJson($download)->assertNotFound();
        $this->actingAs(User::factory()->create()->fresh())->getJson($download)->assertNotFound();
        $this->actingAs($owner)->putJson($url, [...$this->payload(), 'submit' => true, 'version' => 2])->assertOk();
        $this->postJson($url.'/attachments', ['version' => 3, 'file' => $this->file()])->assertConflict();
        $this->deleteJson($download, ['version' => 3])->assertConflict();
        $this->actingAs($manager)->get($download)->assertOk();
        $this->deleteJson($download, ['version' => 3])->assertForbidden();
        $this->postJson($url.'/decision', ['version' => 3, 'decision' => 'rejected', 'note' => 'Replace the blueprint.'])->assertOk();
        $this->actingAs($owner)->deleteJson($download, ['version' => 4])->assertOk()->assertJsonPath('version', 5)->assertJsonCount(0, 'attachments');
        $this->assertDatabaseMissing('approval_attachments', ['id' => $file->id]);
        Storage::disk('local')->assertMissing($file->storage_path);
        $this->assertDatabaseHas('approval_events', ['approval_request_id' => $a['id'], 'action' => 'attachment_removed']);
        $this->getJson($download)->assertNotFound();
    }

    public function test_validation_limits_and_stale_writes_leave_no_extra_files_or_rows(): void
    {
        Storage::fake('local');
        $a = $this->actingAs(User::factory()->create()->fresh())->postJson('/api/approvals', $this->payload())->assertCreated()->json();
        $url = '/api/approvals/'.$a['id'];
        $this->postJson($url.'/attachments', ['version' => 1, 'file' => UploadedFile::fake()->createWithContent('attack.svg', '<svg onload="alert(1)"/>')])->assertUnprocessable();
        $this->postJson($url.'/attachments', ['version' => 1, 'file' => UploadedFile::fake()->create('huge.pdf', 2049, 'application/pdf')])->assertUnprocessable();
        $fakePdf = tempnam(sys_get_temp_dir(), 'ae-file-');
        file_put_contents($fakePdf, '<?php echo 1;');
        try {
            $this->postJson($url.'/attachments', ['version' => 1, 'file' => new UploadedFile($fakePdf, 'fake.pdf', null, null, true)])->assertUnprocessable();
        } finally {
            unlink($fakePdf);
        }
        for ($version = 1; $version <= 5; $version++) {
            $this->postJson($url.'/attachments', ['version' => $version, 'file' => $this->file()])->assertCreated();
        }
        $this->postJson($url.'/attachments', ['version' => 6, 'file' => $this->file()])->assertUnprocessable();
        $this->deleteJson($url.'/attachments/'.ApprovalAttachment::first()->id, ['version' => 1])->assertConflict();
        $this->assertDatabaseHas('approval_requests', ['id' => $a['id'], 'version' => 6]);
        $this->assertDatabaseCount('approval_attachments', 5);
        $this->assertCount(5, Storage::disk('local')->allFiles());
        $this->deleteJson($url, ['version' => 6])->assertNoContent();
        $this->getJson($url.'/attachments/'.ApprovalAttachment::first()->id)->assertNotFound();
    }
}

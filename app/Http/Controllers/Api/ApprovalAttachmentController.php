<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ApprovalAttachmentController extends Controller
{
    private function editable(Request $request, int $id): ApprovalRequest
    {
        $request->validate(['version' => 'required|integer|min:1']);
        $item = ApprovalRequest::visibleTo($request->user())->lockForUpdate()->findOrFail($id);
        abort_unless($item->user_id === $request->user()->id, 403);
        abort_unless(in_array($item->status, ['draft', 'rejected']), 409, 'Files can only be changed before submission.');
        $updated = ApprovalRequest::whereKey($id)->where('version', $request->integer('version'))->update(['version' => DB::raw('version + 1')]);
        abort_unless($updated === 1, 409, 'Refresh this request before changing files.');

        return $item->refresh();
    }

    public function store(Request $request, int $approval)
    {
        $request->validate(['file' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|extensions:pdf,jpg,jpeg,png,webp|max:2048']);
        $path = null;
        try {
            return app(TenantContext::class)->db()->transaction(function () use ($request, $approval, &$path) {
                $item = $this->editable($request, $approval);
                abort_if($item->attachments()->count() >= 5, 422, 'A request can have up to five files.');
                $file = $request->file('file');
                $path = $file->store('approval-attachments', 'local');
                abort_unless($path, 500, 'The file could not be saved.');
                $name = mb_substr(preg_replace('/[\x00-\x1F\x7F\/\\\\]/u', '_', $file->getClientOriginalName()), 0, 200);
                $item->attachments()->create(['user_id' => $request->user()->id, 'original_name' => $name, 'storage_path' => $path, 'mime_type' => $file->getMimeType(), 'size' => $file->getSize()]);
                $item->events()->create(['user_id' => $request->user()->id, 'action' => 'attachment_added', 'body' => $name]);

                return response()->json($item->load('owner', 'reviewer', 'events.actor', 'steps.reviewer', 'attachments'), 201);
            });
        } catch (\Throwable $error) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $error;
        }
    }

    public function show(Request $request, int $approval, int $attachment)
    {
        $item = ApprovalRequest::visibleTo($request->user())->findOrFail($approval);
        $file = $item->attachments()->findOrFail($attachment);
        abort_unless(Storage::disk('local')->exists($file->storage_path), 404);

        return Storage::disk('local')->download($file->storage_path, $file->original_name, [
            'Content-Type' => $file->mime_type, 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store',
        ]);
    }

    public function destroy(Request $request, int $approval, int $attachment)
    {
        $path = null;
        $result = app(TenantContext::class)->db()->transaction(function () use ($request, $approval, $attachment, &$path) {
            $item = $this->editable($request, $approval);
            $file = $item->attachments()->findOrFail($attachment);
            $path = $file->storage_path;
            $item->events()->create(['user_id' => $request->user()->id, 'action' => 'attachment_removed', 'body' => $file->original_name]);
            $file->delete();

            return $item->load('owner', 'reviewer', 'events.actor', 'steps.reviewer', 'attachments');
        });
        Storage::disk('local')->delete($path);

        return $result;
    }
}

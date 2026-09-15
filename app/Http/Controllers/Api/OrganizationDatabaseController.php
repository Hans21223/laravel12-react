<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalRequest;
use App\Services\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OrganizationDatabaseController extends Controller
{
    public function index(Request $r)
    {
        abort_unless($r->user()->role === 'manager', 403);
        $tables = [
            'approval_requests' => ['id', 'title', 'user_id', 'type', 'status', 'amount', 'version', 'created_at', 'deleted_at'],
            'approval_steps' => ['id', 'approval_request_id', 'reviewer_id', 'round', 'position', 'status', 'decided_at'],
            'approval_events' => ['id', 'approval_request_id', 'user_id', 'action', 'created_at'],
            'approval_attachments' => ['id', 'approval_request_id', 'original_name', 'mime_type', 'size', 'created_at'],
        ];
        $r->validate(['table' => ['nullable', Rule::in(array_keys($tables))], 'page' => 'nullable|integer|min:1']);
        $table = $r->input('table', 'approval_requests');
        $db = app(TenantContext::class)->db();
        $visible = ApprovalRequest::withTrashed()->visibleTo($r->user())->select('id');
        $rows = $db->table($table)->whereIn($table === 'approval_requests' ? 'id' : 'approval_request_id', $visible)->select($tables[$table])->orderByDesc('id')->paginate(25);

        return ['engine' => $db->getDriverName(), 'database' => basename($db->getDatabaseName()), 'tables' => array_keys($tables), 'columns' => $tables[$table], 'rows' => $rows, 'read_only' => true];
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalNotification;
use App\Models\ApprovalRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ApprovalController extends Controller
{
    private function query(Request $request)
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:180', 'status' => ['nullable', Rule::in(['draft', 'pending', 'approved', 'rejected', 'cancelled'])],
            'type' => ['nullable', Rule::in(['leave', 'budget', 'document'])],
            'priority' => ['nullable', Rule::in(['normal', 'high', 'urgent'])],
            'scope' => ['nullable', Rule::in(['all', 'mine', 'review'])],
            'sort' => ['nullable', Rule::in(['newest', 'oldest', 'due', 'amount'])],
            'page' => 'nullable|integer|min:1', 'per_page' => 'nullable|integer|min:1|max:100',
        ]);
        $q = ApprovalRequest::visibleTo($request->user())->with('owner', 'reviewer');
        foreach (['status', 'type', 'priority'] as $field) {
            if (! empty($data[$field])) {
                $q->where($field, $data[$field]);
            }
        }
        if (($data['scope'] ?? '') === 'mine') {
            $q->where('user_id', $request->user()->id);
        }
        if (($data['scope'] ?? '') === 'review') {
            abort_unless($request->user()->role === 'manager', 403);
            $q->where('status', 'pending')->where('user_id', '!=', $request->user()->id);
        }
        if (! empty($data['search'])) {
            $term = '%'.$data['search'].'%';
            $q->where(fn ($q) => $q->where('title', 'like', $term)->orWhere('description', 'like', $term)->orWhere('id', preg_replace('/^REQ-0*/i', '', $data['search']))->orWhereHas('owner', fn ($u) => $u->where('name', 'like', $term)));
        }
        match ($data['sort'] ?? 'newest') {
            'oldest' => $q->orderBy('created_at'),
            'due' => $q->orderByRaw('due_date IS NULL')->orderBy('due_date'),
            'amount' => $q->orderByDesc('amount'),
            default => $q->orderByDesc('created_at'),
        };

        return $q->orderByDesc('id');
    }

    public function index(Request $request)
    {
        return $this->query($request)->paginate($request->integer('per_page', 8));
    }

    public function show(Request $request, int $approval)
    {
        return ApprovalRequest::visibleTo($request->user())->with('owner', 'reviewer', 'events.actor')->findOrFail($approval);
    }

    private function fields(Request $request): array
    {
        $data = $request->validate([
            'title' => 'required|string|min:3|max:180', 'description' => 'required|string|min:10|max:10000',
            'type' => ['required', Rule::in(['leave', 'budget', 'document'])],
            'priority' => ['required', Rule::in(['normal', 'high', 'urgent'])],
            'amount' => 'exclude_unless:type,budget|required|numeric|min:0.01|max:999999999.99|decimal:0,2',
            'start_date' => 'exclude_unless:type,leave|required|date_format:Y-m-d',
            'end_date' => 'exclude_unless:type,leave|required|date_format:Y-m-d|after_or_equal:start_date',
            'due_date' => 'nullable|date_format:Y-m-d',
            'document_url' => 'exclude_unless:type,document|nullable|url:http,https|max:2048',
            'submit' => 'sometimes|boolean',
        ]);
        unset($data['submit']);

        return array_merge(['amount' => null, 'start_date' => null, 'end_date' => null, 'document_url' => null, 'due_date' => null], $data);
    }

    private function event(ApprovalRequest $item, User $actor, string $action, ?string $body = null): void
    {
        $item->events()->create(['user_id' => $actor->id, 'action' => $action, 'body' => $body]);
    }

    private function notify(ApprovalRequest $item, string $action, array $ids): void
    {
        foreach (array_unique($ids) as $id) {
            ApprovalNotification::create(['user_id' => $id, 'approval_request_id' => $item->id, 'action' => $action, 'title' => $item->title]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->fields($request);
        $item = DB::transaction(function () use ($request, $data) {
            $submit = $request->boolean('submit');
            $item = ApprovalRequest::create([...$data, 'user_id' => $request->user()->id, 'department' => $request->user()->department, 'status' => $submit ? 'pending' : 'draft', 'submitted_at' => $submit ? now() : null]);
            $this->event($item, $request->user(), $submit ? 'submitted' : 'created');
            if ($submit) {
                $this->notify($item, 'submitted', User::where('role', 'manager')->where('id', '!=', $request->user()->id)->pluck('id')->all());
            }

            return $item;
        });

        return response()->json($item->refresh()->load('owner', 'reviewer', 'events.actor'), 201);
    }

    // The version predicate also protects SQLite, where SELECT FOR UPDATE is not supported.
    private function change(ApprovalRequest $item, int $version, array $data): void
    {
        $updated = ApprovalRequest::whereKey($item->id)->where('version', $version)->update([...$data, 'version' => $version + 1]);
        abort_unless($updated === 1, 409, 'This request changed. Refresh and try again.');
        $item->refresh();
    }

    private function locked(Request $request, int $id): ApprovalRequest
    {
        $request->validate(['version' => 'required|integer|min:1']);
        $item = ApprovalRequest::visibleTo($request->user())->lockForUpdate()->findOrFail($id);
        abort_unless($item->version === $request->integer('version'), 409, 'This request changed. Refresh and try again.');

        return $item;
    }

    public function update(Request $request, int $approval)
    {
        $data = $this->fields($request);

        return DB::transaction(function () use ($request, $approval, $data) {
            $item = $this->locked($request, $approval);
            abort_unless($item->user_id === $request->user()->id, 403);
            abort_unless(in_array($item->status, ['draft', 'pending', 'rejected']), 409, 'This request can no longer be edited.');
            $status = $request->boolean('submit') ? 'pending' : ($item->status === 'pending' ? 'pending' : 'draft');
            $resubmit = $status === 'pending' && $item->status !== 'pending';
            $this->change($item, $item->version, [...$data, 'status' => $status, 'reviewer_id' => null, 'decision_note' => null, 'decided_at' => null, 'submitted_at' => $status === 'pending' ? ($resubmit ? now() : $item->submitted_at) : null]);
            $this->event($item, $request->user(), $resubmit ? 'submitted' : 'updated');
            if ($resubmit) {
                $this->notify($item, 'submitted', User::where('role', 'manager')->where('id', '!=', $item->user_id)->pluck('id')->all());
            }

            return $item->load('owner', 'reviewer', 'events.actor');
        });
    }

    public function destroy(Request $request, int $approval)
    {
        DB::transaction(function () use ($request, $approval) {
            $item = $this->locked($request, $approval);
            abort_unless($item->user_id === $request->user()->id, 403);
            abort_if($item->status === 'approved', 409, 'Approved records are retained.');
            $this->change($item, $item->version, ['deleted_at' => now()]);
            $this->event($item, $request->user(), 'deleted');
        });

        return response()->noContent();
    }

    public function decision(Request $request, int $approval)
    {
        abort_unless($request->user()->role === 'manager', 403);
        $data = $request->validate(['decision' => ['required', Rule::in(['approved', 'rejected'])], 'note' => 'required_if:decision,rejected|nullable|string|max:2000']);

        return DB::transaction(function () use ($request, $approval, $data) {
            $item = $this->locked($request, $approval);
            abort_if($item->user_id === $request->user()->id, 403, 'You cannot review your own request.');
            abort_unless($item->status === 'pending', 409, 'Only pending requests can be reviewed.');
            $this->change($item, $item->version, ['status' => $data['decision'], 'decision_note' => $data['note'] ?? null, 'reviewer_id' => $request->user()->id, 'decided_at' => now()]);
            $this->event($item, $request->user(), $data['decision'], $data['note'] ?? null);
            $this->notify($item, $data['decision'], [$item->user_id]);

            return $item->load('owner', 'reviewer', 'events.actor');
        });
    }

    public function cancel(Request $request, int $approval)
    {
        return DB::transaction(function () use ($request, $approval) {
            $item = $this->locked($request, $approval);
            abort_unless($item->user_id === $request->user()->id, 403);
            abort_unless($item->status === 'pending', 409);
            $this->change($item, $item->version, ['status' => 'cancelled']);
            $this->event($item, $request->user(), 'cancelled');

            return $item->load('owner', 'reviewer', 'events.actor');
        });
    }

    public function comment(Request $request, int $approval)
    {
        $data = $request->validate(['body' => 'required|string|min:1|max:2000']);

        return DB::transaction(function () use ($request, $approval, $data) {
            $item = ApprovalRequest::visibleTo($request->user())->lockForUpdate()->findOrFail($approval);
            $this->event($item, $request->user(), 'commented', $data['body']);
            if ($item->user_id !== $request->user()->id) {
                $this->notify($item, 'commented', [$item->user_id]);
            }

            return $item->load('owner', 'reviewer', 'events.actor');
        });
    }

    public function summary(Request $request)
    {
        $base = ApprovalRequest::visibleTo($request->user());
        $counts = (clone $base)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $weeks = collect(range(5, 0))->map(function ($offset) use ($base) {
            $start = now()->startOfWeek()->subWeeks($offset);
            $end = $start->copy()->endOfWeek();

            return [
                'week' => $start->toDateString(),
                'total' => (clone $base)->whereBetween('submitted_at', [$start, $end])->count(),
                'approved' => (clone $base)->where('status', 'approved')->whereBetween('decided_at', [$start, $end])->count(),
                'pending' => (clone $base)->where('status', 'pending')->whereBetween('submitted_at', [$start, $end])->count(),
                'rejected' => (clone $base)->where('status', 'rejected')->whereBetween('decided_at', [$start, $end])->count(),
            ];
        });

        return [
            'counts' => $counts, 'total' => $counts->sum(), 'weeks' => $weeks,
            'types' => (clone $base)->selectRaw('type, count(*) as total')->groupBy('type')->pluck('total', 'type'),
            'overdue' => (clone $base)->where('status', 'pending')->whereDate('due_date', '<', today())->count(),
            'review_count' => $request->user()->role === 'manager' ? (clone $base)->where('status', 'pending')->where('user_id', '!=', $request->user()->id)->count() : 0,
            'approved_budget' => (clone $base)->where('status', 'approved')->where('type', 'budget')->sum('amount'),
            'recent' => (clone $base)->with('owner', 'reviewer')->latest('updated_at')->limit(5)->get(),
        ];
    }

    public function notifications(Request $request)
    {
        $q = ApprovalNotification::where('user_id', $request->user()->id);

        return ['unread' => (clone $q)->whereNull('read_at')->count(), 'items' => $q->latest('id')->limit(50)->get()];
    }

    public function readNotifications(Request $request)
    {
        $request->validate(['id' => 'nullable|integer']);
        ApprovalNotification::where('user_id', $request->user()->id)->when($request->filled('id'), fn ($q) => $q->whereKey($request->integer('id')))->whereNull('read_at')->update(['read_at' => now()]);

        return $this->notifications($request);
    }

    public function preferences(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'department' => ['required', Rule::in(['Operations', 'Engineering', 'Design', 'Finance', 'People', 'Marketing'])],
            'locale' => ['required', Rule::in(['en', 'th', 'ja'])],
            'preferences' => 'sometimes|array:theme,density,page_size,default_view,reduce_motion',
            'preferences.theme' => ['sometimes', Rule::in(['light', 'dark', 'system'])],
            'preferences.density' => ['sometimes', Rule::in(['comfortable', 'compact'])],
            'preferences.page_size' => ['sometimes', 'integer', Rule::in([8, 16, 24])],
            'preferences.default_view' => ['sometimes', Rule::in(['list', 'board'])],
            'preferences.reduce_motion' => 'sometimes|boolean',
        ]);
        if (isset($data['preferences'])) {
            if (array_key_exists('page_size', $data['preferences'])) {
                $data['preferences']['page_size'] = (int) $data['preferences']['page_size'];
            }
            if (array_key_exists('reduce_motion', $data['preferences'])) {
                $data['preferences']['reduce_motion'] = (bool) $data['preferences']['reduce_motion'];
            }
            $data['preferences'] = array_replace($request->user()->preferences ?? [], $data['preferences']);
        }
        $request->user()->forceFill($data)->save();

        return $request->user()->fresh()->settingsPayload();
    }

    public function export(Request $request)
    {
        $q = $this->query($request);

        return response()->streamDownload(function () use ($q) {
            $file = fopen('php://output', 'w');
            fwrite($file, "\xEF\xBB\xBF");
            fputcsv($file, ['ID', 'Title', 'Employee', 'Department', 'Type', 'Status', 'Priority', 'Amount (THB)', 'Due date', 'Created at'], ',', '"', '');
            foreach ($q->lazy(200) as $item) {
                $row = [$item->id, $item->title, $item->owner?->name, $item->department, $item->type, $item->status, $item->priority, $item->amount, $item->due_date, $item->created_at->toIso8601String()];
                $row = array_map(fn ($v) => preg_match('/^[\s]*[=+@\-]/u', (string) $v) ? "'".$v : $v, $row);
                fputcsv($file, $row, ',', '"', '');
            }
            fclose($file);
        }, 'approvals-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}

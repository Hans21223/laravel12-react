<?php

namespace Database\Seeders;

use App\Models\ApprovalNotification;
use App\Models\ApprovalRequest;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ApprovalDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            throw new \RuntimeException('Demo accounts must not be seeded in production.');
        }
        $people = [
            ['Karn Chaiwiseskul', 'karn@accord.test', 'manager', 'Operations'],
            ['Maya Chen', 'maya@accord.test', 'employee', 'Design'],
            ['Yuki Tanaka', 'yuki@accord.test', 'employee', 'Engineering'],
            ['Narin Srisuk', 'narin@accord.test', 'employee', 'Marketing'],
            ['Alex Morgan', 'alex@accord.test', 'employee', 'Finance'],
        ];
        $users = [];
        foreach ($people as [$name,$email,$role,$department]) {
            $user = User::firstOrNew(['email' => $email]);
            if (! $user->exists) {
                $user->forceFill(['name' => $name, 'password' => Hash::make('AccordDemo2026!'), 'role' => $role, 'department' => $department, 'email_verified_at' => now()])->save();
            }
            $users[] = $user;
        }
        $titles = [
            ['Brand refresh · creative production', 'budget', 1, 45000],
            ['Annual leave · a little time to recharge', 'leave', 2, null],
            ['Q4 campaign proposal', 'document', 3, null],
            ['Design team · Figma annual licenses', 'budget', 1, 18500],
            ['Supplier agreement · final review', 'document', 4, null],
            ['Conference travel · Bangkok Design Week', 'budget', 1, 12000],
            ['Personal leave · family appointment', 'leave', 3, null],
            ['Engineering equipment upgrade', 'budget', 2, 68000],
            ['Updated employee handbook', 'document', 0, null],
            ['Quarterly planning workshop', 'budget', 0, 24000],
            ['休暇申請 · 家族旅行', 'leave', 2, null],
            ['ขออนุมัติงบกิจกรรมทีม', 'budget', 3, 8500],
            ['Finance reporting guidelines', 'document', 4, null],
            ['Medical appointment · morning leave', 'leave', 1, null],
            ['New starter equipment', 'budget', 0, 32000],
            ['Partnership proposal · autumn launch', 'document', 3, null],
            ['Team offsite · Chiang Mai', 'budget', 1, 56000],
            ['Long weekend · annual leave', 'leave', 4, null],
        ];
        foreach ($titles as $i => [$title,$type,$person,$amount]) {
            if (ApprovalRequest::withTrashed()->where('title', $title)->where('user_id', $users[$person]->id)->exists()) {
                continue;
            }
            $status = $i < 8 ? 'pending' : ['approved', 'draft', 'approved', 'approved', 'rejected', 'approved', 'pending', 'approved', 'rejected', 'approved'][$i - 8];
            $created = now()->subDays($i < 8 ? $i + 1 : ($i - 6) * 3)->setTime(9 + ($i % 7), 15);
            $item = ApprovalRequest::create([
                'user_id' => $users[$person]->id, 'title' => $title, 'description' => [
                    'budget' => 'Requesting approval for the proposed budget to support our upcoming team initiative. The estimate includes all essential costs. Please review the allocation and share any questions before we proceed.',
                    'leave' => 'I would like to request time off during the dates below. I have coordinated coverage with the team and will prepare a handover of outstanding work before my leave begins.',
                    'document' => 'Please review this document for approval. The latest revision incorporates the team’s feedback and is ready for a final check. Your comments are welcome before we move to the next stage.',
                ][$type],
                'type' => $type, 'priority' => ['high', 'normal', 'urgent', 'normal', 'high', 'normal'][$i % 6], 'status' => $status,
                'department' => $users[$person]->department, 'amount' => $amount,
                'start_date' => $type === 'leave' ? now()->addDays(7 + $i)->toDateString() : null,
                'end_date' => $type === 'leave' ? now()->addDays(9 + $i)->toDateString() : null,
                'due_date' => now()->addDays($i === 2 ? -1 : ($i % 9) + 1)->toDateString(),
                'submitted_at' => $status === 'draft' ? null : $created,
                'reviewer_id' => in_array($status, ['approved', 'rejected']) ? $users[0]->id : null,
                'decision_note' => $status === 'rejected' ? 'Please add a more detailed breakdown and consider a smaller initial scope. Happy to review an updated proposal.' : ($status === 'approved' ? 'Everything looks good. Please proceed with the next steps.' : null),
                'decided_at' => in_array($status, ['approved', 'rejected']) ? $created->copy()->addHours(6) : null,
                'created_at' => $created, 'updated_at' => $created,
            ]);
            // Historical demo record owned by the manager is left pending, never self-approved.
            if ($person === 0 && $status === 'approved') {
                $item->update(['status' => 'pending', 'reviewer_id' => null, 'decided_at' => null, 'decision_note' => null]);
                $status = 'pending';
            }
            $item->events()->create(['user_id' => $item->user_id, 'action' => $status === 'draft' ? 'created' : 'submitted', 'created_at' => $created, 'updated_at' => $created]);
            if (in_array($status, ['approved', 'rejected'])) {
                $item->events()->create(['user_id' => $users[0]->id, 'action' => $status, 'body' => $item->decision_note, 'created_at' => $item->decided_at, 'updated_at' => $item->decided_at]);
                ApprovalNotification::create(['user_id' => $item->user_id, 'approval_request_id' => $item->id, 'action' => $status, 'title' => $title]);
            } elseif ($status === 'pending' && $person !== 0) {
                ApprovalNotification::create(['user_id' => $users[0]->id, 'approval_request_id' => $item->id, 'action' => 'submitted', 'title' => $title]);
            }
        }
    }
}

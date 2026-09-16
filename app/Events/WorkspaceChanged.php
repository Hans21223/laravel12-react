<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

// A content-free hint: the browser re-fetches through the authorized API, so no private data travels over the socket.
class WorkspaceChanged implements ShouldBroadcastNow
{
    public function __construct(public int $organization, public int $user, public string $kind, public ?int $reference = null) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel("workspace.{$this->organization}.{$this->user}");
    }

    public function broadcastAs(): string
    {
        return 'changed';
    }

    public function broadcastWith(): array
    {
        return ['kind' => $this->kind, 'reference' => $this->reference];
    }
}

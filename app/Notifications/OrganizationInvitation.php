<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

// Sent only for invitations locked to one address, so a forwarded key still cannot be used by someone else.
class OrganizationInvitation extends Notification
{
    public function __construct(public string $organization, public string $inviter, public string $key, public string $expires) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject("Join {$this->organization} on Anaheim Electronics")
            ->greeting('You have been invited')
            ->line("{$this->inviter} invited you to join {$this->organization}.")
            ->line('Create an account or sign in with this email address, open Organizations, choose "Join with an invitation" and enter this key:')
            ->line($this->key)
            ->action('Open Anaheim Electronics', url('/organizations'))
            ->line("The key expires on {$this->expires} and works only for this email address.");
    }
}

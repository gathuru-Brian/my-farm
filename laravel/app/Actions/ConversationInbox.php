<?php

namespace App\Actions;

use App\Models\Conversation;
use App\Models\User;

class ConversationInbox
{
    /** @return array<int, array<string, mixed>> */
    public function handle(User $user): array
    {
        if (! in_array($user->role, ['customer', 'producer'], true)) {
            return [];
        }

        $participantColumn = $user->role === 'customer' ? 'customer_id' : 'producer_id';

        return Conversation::query()
            ->where($participantColumn, $user->id)
            ->with([
                'customer:id,full_name,status',
                'producer:id,full_name,status',
                'messages.sender:id,full_name',
            ])
            ->withCount(['messages as unread_count' => fn ($query) => $query
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at')])
            ->latest('updated_at')
            ->limit(50)
            ->get()
            ->map(function (Conversation $conversation) use ($user): array {
                $peer = $user->role === 'customer' ? $conversation->producer : $conversation->customer;
                $messages = $conversation->messages->sortBy('id')->values()->map(fn ($message): array => [
                    'id' => $message->id,
                    'sender_id' => $message->sender_id,
                    'sender_name' => $message->sender?->full_name ?? 'User',
                    'body' => $message->body,
                    'created_at' => $message->created_at?->toIso8601String(),
                    'read_at' => $message->read_at?->toIso8601String(),
                ]);

                return [
                    'id' => $conversation->id,
                    'peer' => [
                        'id' => $peer?->id,
                        'name' => $peer?->full_name ?? 'User',
                        'role' => $user->role === 'customer' ? 'producer' : 'customer',
                        'is_active' => $peer?->status === 'active',
                    ],
                    'updated_at' => $conversation->updated_at?->toIso8601String(),
                    'unread_count' => $conversation->unread_count,
                    'last_message' => $messages->last(),
                    'messages' => $messages,
                ];
            })
            ->values()
            ->all();
    }
}

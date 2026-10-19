<?php

namespace App\Http\Controllers;

use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $customer = $request->user();
        abort_unless($customer->role === 'customer' && $customer->status === 'active', 403);

        $data = $request->validate(['producer_id' => ['required', 'integer', 'exists:users,id']]);
        $producer = User::query()
            ->whereKey($data['producer_id'])
            ->where('role', 'producer')
            ->where('status', 'active')
            ->whereHas('farms', fn ($farmsQuery) => $farmsQuery->where('status', 'active'))
            ->firstOrFail();

        $conversation = Conversation::firstOrCreate([
            'customer_id' => $customer->id,
            'producer_id' => $producer->id,
        ]);
        $conversation->touch();

        return to_route('dashboard')->with('status', 'Conversation opened with '.$producer->full_name.'.');
    }

    public function send(Request $request, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['customer', 'producer'], true) && $user->status === 'active', 403);
        $this->authorizeParticipant($conversation, $user);
        $peer = $user->role === 'customer' ? $conversation->producer : $conversation->customer;
        abort_unless($peer?->status === 'active', 403, 'This account is not available for messaging.');

        $data = $request->validate(['body' => ['required', 'string', 'max:2000']]);
        $body = trim($data['body']);
        abort_if($body === '', 422, 'Message text is required.');

        DB::transaction(function () use ($conversation, $user, $body): void {
            $conversation->messages()->create([
                'sender_id' => $user->id,
                'body' => $body,
            ]);
            $conversation->touch();
        });

        return to_route('dashboard')->with('status', 'Message sent.');
    }

    public function markRead(Request $request, Conversation $conversation): RedirectResponse
    {
        $user = $request->user();
        abort_unless(
            in_array($user->role, ['customer', 'producer'], true) && $user->status === 'active',
            403,
        );
        $this->authorizeParticipant($conversation, $user);

        DirectMessage::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return to_route('dashboard');
    }

    private function authorizeParticipant(Conversation $conversation, User $user): void
    {
        abort_unless(
            $conversation->customer_id === $user->id || $conversation->producer_id === $user->id,
            404,
            'Conversation not found.'
        );
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\DirectMessage;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageApiController extends Controller
{
    private const MAX_MESSAGE_LENGTH = 2000;

    public function producers(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'customer', 403, 'Only customers can browse producers to message');

        $producers = User::query()
            ->where('role', 'producer')
            ->where('status', 'active')
            ->whereHas('farms', fn ($farms) => $farms->where('status', 'active'))
            ->with(['farms' => fn ($farms) => $farms->where('status', 'active')])
            ->orderBy('full_name')
            ->get()
            ->map(fn (User $producer) => [
                'id' => $producer->id,
                'name' => $producer->full_name,
                'farms' => $producer->farms->map(fn (Farm $farm) => [
                    'id' => $farm->id,
                    'name' => $farm->farm_name,
                    'location' => $farm->location,
                    'county' => $farm->county,
                ])->values(),
            ]);

        return response()->json(['success' => true, 'producers' => $producers]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(in_array($user->role, ['customer', 'producer'], true), 403, 'Only customers and producers can use direct messages');
        $column = $user->role === 'customer' ? 'customer_id' : 'producer_id';

        $conversations = Conversation::where($column, $user->id)
            ->with(['customer', 'producer'])
            ->latest('updated_at')
            ->get()
            ->map(fn (Conversation $conversation) => $this->summary($conversation, $user));

        return response()->json(['success' => true, 'conversations' => $conversations]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->role === 'customer', 403, 'Only customers can start a producer conversation');
        abort_unless($user->status === 'active', 403, 'Your account is not active');
        $data = $request->validate(['producer_id' => ['required', 'integer']]);

        $producer = User::whereKey($data['producer_id'])
            ->where('role', 'producer')
            ->where('status', 'active')
            ->whereHas('farms', fn ($farms) => $farms->where('status', 'active'))
            ->firstOrFail();

        $conversation = Conversation::firstOrCreate([
            'customer_id' => $user->id,
            'producer_id' => $producer->id,
        ]);
        $conversation->load(['customer', 'producer']);

        return response()->json([
            'success' => true,
            'conversation' => $this->summary($conversation, $user),
        ]);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $this->authorizeParticipant($conversation, $user);

        $messages = $conversation->messages()->with('sender')->oldest()->get();
        DB::transaction(function () use ($messages, $user) {
            DirectMessage::whereIn('id', $messages->pluck('id'))
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        });
        $messages->each(fn (DirectMessage $message) => $message->refresh());

        return response()->json([
            'success' => true,
            'conversation' => [
                'id' => $conversation->id,
                'peer' => $this->peer($conversation, $user),
            ],
            'messages' => $messages->map(fn (DirectMessage $message) => $this->message($message))->values(),
        ]);
    }

    public function send(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            in_array($user->role, ['customer', 'producer'], true) && $user->status === 'active',
            403,
            'Your account cannot send direct messages'
        );
        $this->authorizeParticipant($conversation, $user);
        $peer = $conversation->customer_id === $user->id
            ? $conversation->producer
            : $conversation->customer;
        abort_unless($peer?->status === 'active', 403, 'This account is not available for messaging');
        $data = $request->validate([
            'body' => ['required', 'string', 'max:'.self::MAX_MESSAGE_LENGTH],
        ]);
        $body = trim($data['body']);
        abort_if($body === '', 422, 'Message text is required');

        $message = DB::transaction(function () use ($conversation, $user, $body) {
            $message = $conversation->messages()->create([
                'sender_id' => $user->id,
                'body' => $body,
            ]);
            $conversation->touch();

            return $message->load('sender');
        });

        return response()->json([
            'success' => true,
            'message' => $this->message($message),
        ], 201);
    }

    private function authorizeParticipant(Conversation $conversation, User $user): void
    {
        abort_unless(
            $conversation->customer_id === $user->id || $conversation->producer_id === $user->id,
            404,
            'Conversation not found'
        );
    }

    private function peer(Conversation $conversation, User $user): array
    {
        $peer = $conversation->customer_id === $user->id
            ? $conversation->producer
            : $conversation->customer;

        return ['id' => $peer->id, 'name' => $peer->full_name, 'role' => $peer->role];
    }

    private function summary(Conversation $conversation, User $user): array
    {
        $latest = $conversation->messages()->with('sender')->latest('id')->first();

        return [
            'id' => $conversation->id,
            'peer' => $this->peer($conversation, $user),
            'updated_at' => $conversation->updated_at?->toISOString(),
            'last_message' => $latest ? $this->message($latest) : null,
            'unread_count' => $conversation->messages()
                ->where('sender_id', '!=', $user->id)
                ->whereNull('read_at')
                ->count(),
        ];
    }

    private function message(DirectMessage $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'sender_id' => $message->sender_id,
            'sender_name' => $message->sender?->full_name ?? '',
            'body' => $message->body,
            'created_at' => $message->created_at?->toISOString(),
            'read_at' => $message->read_at?->toISOString(),
        ];
    }
}

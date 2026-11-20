<script>
  import { router, useForm } from "@inertiajs/svelte";

  let { user, producers = [], conversations = [], errors = {}, accent = "customer" } = $props();
  const palettes = {
    customer: { button: "bg-[#276f45] hover:bg-[#1b5636]", bubble: "bg-[#276f45]", badge: "bg-[#276f45]", focus: "focus:border-[#4caf50] focus:ring-[#4caf50]/20" },
    producer: { button: "bg-[#a84c2d] hover:bg-[#873b24]", bubble: "bg-[#a84c2d]", badge: "bg-[#a84c2d]", focus: "focus:border-[#c46a45] focus:ring-[#c46a45]/20" },
  };
  let theme = $derived(palettes[accent] ?? palettes.customer);
  let selectedId = $state(null);
  let selectedProducerId = $state("");
  let newConversationForm = useForm({ producer_id: "" });
  let messageForm = useForm({ body: "" });
  let selectedConversation = $derived(conversations.find((conversation) => conversation.id === (selectedId ?? conversations[0]?.id)) ?? null);

  const formatTime = (value) => value
    ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "";

  function startConversation(event) {
    event.preventDefault();
    const producerId = selectedProducerId || producers[0]?.id;
    if (!producerId) return;

    newConversationForm.producer_id = String(producerId);
    newConversationForm.post("/dashboard/messages/conversations", {
      preserveScroll: true,
      onSuccess: (page) => {
        const matching = page.props.conversations?.find((conversation) => conversation.peer.id === Number(producerId));
        selectedId = matching?.id ?? page.props.conversations?.[0]?.id ?? null;
      },
    });
  }

  function openConversation(conversation) {
    selectedId = conversation.id;
    if (conversation.unread_count > 0) {
      router.post(`/dashboard/messages/conversations/${conversation.id}/read`, {}, {
        preserveScroll: true,
        preserveState: true,
      });
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!selectedConversation || !messageForm.body.trim()) return;

    messageForm.post(`/dashboard/messages/conversations/${selectedConversation.id}`, {
      preserveScroll: true,
      onSuccess: () => { messageForm.resetAndClearErrors(); },
    });
  }
</script>

<div class="message-inbox grid min-h-[520px] overflow-hidden rounded-2xl border border-[#e3ebe5] bg-white shadow-sm md:grid-cols-[280px_minmax(0,1fr)]">
  <aside class="border-b border-[#e3ebe5] md:border-b-0 md:border-r">
    <div class="border-b border-slate-100 p-4">
      <h2 class="font-bold">Conversations</h2>
      {#if user.role === "customer" && producers.length > 0}
        <form onsubmit={startConversation} class="mt-3 flex gap-2">
          <select value={selectedProducerId || producers[0]?.id || ""} onchange={(event) => selectedProducerId = event.currentTarget.value} aria-label="Choose a producer" class="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm">
            {#each producers as producer (producer.id)}<option value={producer.id}>{producer.name}</option>{/each}
          </select>
          <button type="submit" disabled={newConversationForm.processing} class={`rounded-lg px-3 py-2 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60 ${theme.button}`}>{newConversationForm.processing ? "…" : "New"}</button>
        </form>
        {#if newConversationForm.errors.producer_id}<p class="px-4 pb-3 text-xs text-red-700" role="alert">{newConversationForm.errors.producer_id}</p>{/if}
      {:else if user.role === "customer"}
        <p class="mt-2 text-xs text-slate-500">No active producers are available to message.</p>
      {/if}
    </div>
    {#if conversations.length === 0}
      <p class="p-4 text-sm text-slate-500">Your conversations will appear here.</p>
    {:else}
      <ul class="max-h-[430px] overflow-y-auto p-2">
        {#each conversations as conversation (conversation.id)}
          <li>
            <button type="button" class={`w-full rounded-xl px-3 py-3 text-left hover:bg-[#f4f8f5] ${selectedConversation?.id === conversation.id ? "bg-[#edf5ed]" : ""}`} onclick={() => openConversation(conversation)}>
              <span class="flex items-center justify-between gap-2">
                <span class="truncate font-semibold">{conversation.peer.name}</span>
                {#if conversation.unread_count > 0}<span class={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${theme.badge}`}>{conversation.unread_count}</span>{/if}
              </span>
              <span class="mt-1 block truncate text-xs text-slate-500">{conversation.last_message?.body ?? "No messages yet"}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </aside>

  <section class="flex min-h-[520px] min-w-0 flex-col" aria-label="Message thread">
    {#if selectedConversation}
      <header class="border-b border-slate-100 px-5 py-4">
        <h3 class="font-bold">{selectedConversation.peer.name}</h3>
        <p class="text-xs capitalize text-slate-500">{selectedConversation.peer.role}</p>
      </header>
      <div class="flex-1 space-y-3 overflow-y-auto bg-[#f8faf8] p-4" aria-live="polite">
        {#if selectedConversation.messages.length === 0}
          <p class="py-10 text-center text-sm text-slate-500">Start the conversation with a message.</p>
        {:else}
          {#each selectedConversation.messages as message (message.id)}
            <div class={`flex ${message.sender_id === user.id ? "justify-end" : "justify-start"}`}>
              <article class={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_id === user.id ? `rounded-br-md ${theme.bubble} text-white` : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                <p class="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                <time class={`mt-2 block text-right text-[11px] ${message.sender_id === user.id ? "text-green-100" : "text-slate-400"}`} datetime={message.created_at ?? ""}>{formatTime(message.created_at)}</time>
              </article>
            </div>
          {/each}
        {/if}
      </div>
      {#if selectedConversation.peer.is_active}
        <form onsubmit={sendMessage} class="border-t border-slate-100 p-4">
          {#if messageForm.errors.body || errors.body}<p class="mb-2 text-sm text-red-700" role="alert">{messageForm.errors.body ?? errors.body}</p>{/if}
          <div class="flex items-end gap-2">
            <textarea bind:value={messageForm.body} maxlength="2000" rows="2" aria-label="Message text" placeholder="Write a message…" class={`min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${theme.focus}`}></textarea>
            <button type="submit" disabled={!messageForm.body.trim() || messageForm.processing} class={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${theme.button}`}>{messageForm.processing ? "Sending…" : "Send"}</button>
          </div>
        </form>
      {:else}
        <p class="border-t border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">This account is no longer available for messaging.</p>
      {/if}
    {:else}
      <div class="flex flex-1 items-center justify-center p-8 text-center">
        <div><p class="font-semibold">Choose a conversation</p><p class="mt-2 text-sm text-slate-500">Select a name to view the message history.</p></div>
      </div>
    {/if}
  </section>
</div>

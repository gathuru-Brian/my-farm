<script>
  import { router } from "@inertiajs/svelte";

  let { user, producers = [], conversations = [], errors = {} } = $props();
  let selectedId = $state(null);
  let selectedProducerId = $state("");
  let draft = $state("");
  let selectedConversation = $derived(conversations.find((conversation) => conversation.id === (selectedId ?? conversations[0]?.id)) ?? null);

  const formatTime = (value) => value
    ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "";

  function startConversation(event) {
    event.preventDefault();
    const producerId = selectedProducerId || producers[0]?.id;
    if (!producerId) return;

    router.post("/dashboard/messages/conversations", { producer_id: producerId }, {
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
    if (!selectedConversation || !draft.trim()) return;

    router.post(`/dashboard/messages/conversations/${selectedConversation.id}`, { body: draft }, {
      preserveScroll: true,
      onSuccess: () => { draft = ""; },
    });
  }
</script>

<div class="grid min-h-[520px] overflow-hidden rounded-2xl border border-[#e3ebe5] bg-white shadow-sm md:grid-cols-[280px_minmax(0,1fr)]">
  <aside class="border-b border-[#e3ebe5] md:border-b-0 md:border-r">
    <div class="border-b border-slate-100 p-4">
      <h2 class="font-bold">Conversations</h2>
      {#if user.role === "customer" && producers.length > 0}
        <form onsubmit={startConversation} class="mt-3 flex gap-2">
          <select value={selectedProducerId || producers[0]?.id || ""} onchange={(event) => selectedProducerId = event.currentTarget.value} aria-label="Choose a producer" class="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm">
            {#each producers as producer (producer.id)}<option value={producer.id}>{producer.name}</option>{/each}
          </select>
          <button type="submit" class="rounded-lg bg-[#176b3b] px-3 py-2 text-sm font-bold text-white hover:bg-[#0b482b]">New</button>
        </form>
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
                {#if conversation.unread_count > 0}<span class="rounded-full bg-[#176b3b] px-2 py-0.5 text-xs font-bold text-white">{conversation.unread_count}</span>{/if}
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
              <article class={`max-w-[85%] rounded-2xl px-4 py-3 ${message.sender_id === user.id ? "rounded-br-md bg-[#176b3b] text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                <p class="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                <time class={`mt-2 block text-right text-[11px] ${message.sender_id === user.id ? "text-green-100" : "text-slate-400"}`} datetime={message.created_at ?? ""}>{formatTime(message.created_at)}</time>
              </article>
            </div>
          {/each}
        {/if}
      </div>
      {#if selectedConversation.peer.is_active}
        <form onsubmit={sendMessage} class="border-t border-slate-100 p-4">
          {#if errors.body}<p class="mb-2 text-sm text-red-700" role="alert">{errors.body}</p>{/if}
          <div class="flex items-end gap-2">
            <textarea bind:value={draft} maxlength="2000" rows="2" aria-label="Message text" placeholder="Write a message…" class="min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#176b3b] focus:outline-none focus:ring-2 focus:ring-[#176b3b]/20"></textarea>
            <button type="submit" disabled={!draft.trim()} class="rounded-xl bg-[#176b3b] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#0b482b] disabled:cursor-not-allowed disabled:bg-slate-300">Send</button>
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

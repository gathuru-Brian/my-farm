<script>
  let { tabs = [], activeView, onSelect, label = "Dashboard sections" } = $props();
</script>

<nav class="dashboard-tabs rounded-2xl border border-[#e1e9de] bg-white/90 p-1.5 shadow-[0_10px_30px_-24px_rgba(23,75,50,.45)] backdrop-blur" aria-label={label}>
  <div class="flex gap-1 overflow-x-auto overscroll-x-contain">
    {#each tabs as tab (tab.view)}
      <button
        type="button"
        aria-current={activeView === tab.view ? "page" : undefined}
        aria-pressed={activeView === tab.view}
        class={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition sm:px-4 ${activeView === tab.view ? "bg-[#174b32] text-white shadow-sm" : "text-[#456052] hover:bg-[#f1f6ef] hover:text-[#173f2a]"}`}
        onclick={() => onSelect(tab.view)}
      >
        {#if tab.icon}
          <span class="text-base leading-none" aria-hidden="true">{tab.icon}</span>
        {/if}
        <span>{tab.label}</span>
        {#if tab.badge}
          <span class={`rounded-full px-2 py-0.5 text-[11px] font-extrabold leading-none ${activeView === tab.view ? "bg-white/15 text-white" : tab.tone ?? "bg-[#eaf1e3] text-[#315940]"}`}>{tab.badge}</span>
        {/if}
        {#if tab.count !== undefined}
          <span class={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${activeView === tab.view ? "bg-white/15 text-white" : "bg-[#edf3ec] text-[#567060]"}`}>{tab.count}</span>
        {/if}
      </button>
    {/each}
  </div>
</nav>

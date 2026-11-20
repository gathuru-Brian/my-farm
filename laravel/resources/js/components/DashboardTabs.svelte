<script>
  let {
    tabs = [],
    activeView,
    onSelect,
    label = "Dashboard sections",
    heading = "Workspace",
    description = "Navigate your dashboard",
    accent = "customer",
    showIcons = false,
    gridClass = "",
  } = $props();

  const accentStyles = {
    customer: {
      active: "bg-[#276f45] text-white shadow-sm",
      activeIcon: "bg-white/10",
      idleIcon: "bg-[#eef6eb] text-[#3d714b]",
      focus: "focus-visible:outline-[#4CAF50]",
    },
    producer: {
      active: "bg-[#a84c2d] text-white shadow-sm",
      activeIcon: "bg-white/10",
      idleIcon: "bg-[#fbefe9] text-[#9b482c]",
      focus: "focus-visible:outline-[#c46a45]",
    },
    admin: {
      active: "bg-[#334155] text-white shadow-sm",
      activeIcon: "bg-white/10",
      idleIcon: "bg-[#eef2f6] text-[#475569]",
      focus: "focus-visible:outline-[#64748b]",
    },
  };
  let theme = $derived(accentStyles[accent] ?? accentStyles.customer);
</script>

<nav class={`dashboard-tabs rounded-2xl border border-[#e1e9de] bg-white p-2 shadow-[0_12px_34px_-28px_rgba(23,75,50,.45)] lg:sticky lg:top-24 lg:p-3 ${gridClass}`} data-accent={accent} aria-label={label}>
  <div class="hidden px-3 pb-3 pt-2 lg:block">
    <p class="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#7b9282]">{heading}</p>
    <p class="mt-1 text-xs leading-5 text-[#8b9b8e]">{description}</p>
  </div>
  <div class="dashboard-tabs__items flex gap-1 overflow-x-auto overscroll-x-contain pb-0.5 lg:flex-col lg:overflow-visible lg:pb-0">
    {#each tabs as tab (tab.view)}
      <button
        type="button"
        aria-label={tab.view === "messages" && tab.count ? `${tab.label}, ${tab.count} unread` : undefined}
        aria-current={activeView === tab.view ? "page" : undefined}
        aria-pressed={activeView === tab.view}
        class={`relative flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${theme.focus} lg:w-full lg:px-3 ${activeView === tab.view ? theme.active : "text-[#456052] hover:bg-[#f1f6f1] hover:text-[#173f2a]"}`}
        onclick={() => onSelect(tab.view)}
      >
        {#if showIcons && tab.icon}
          <span class={`grid size-8 shrink-0 place-items-center rounded-lg text-base leading-none ${activeView === tab.view ? theme.activeIcon : theme.idleIcon}`} aria-hidden="true">{tab.icon}</span>
        {/if}
        <span class="whitespace-nowrap lg:flex-1">{tab.label}</span>
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

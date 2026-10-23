<script>
  import { Link } from "@inertiajs/svelte";

  let { user = null } = $props();
  let open = $state(false);

  const links = [
    { label: "About us", href: "/#about" },
    { label: "How we work", href: "/#how-we-work" },
    { label: "Marketplace", href: "/#marketplace" },
    { label: "Recommendations", href: "/#recommendations" },
    { label: "Contact", href: "/contact" }
  ];
</script>

<header class="sticky top-0 z-40 border-b border-[#e1e9de] bg-white/90 backdrop-blur-lg">
  <div class="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3.5 lg:px-8">
    <Link href="/" class="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#173f2a]">
      <span class="grid size-9 place-items-center rounded-xl bg-[#173f2a] text-lg" aria-hidden="true">🌱</span>
      Modern Farms
    </Link>

    <nav class="hidden items-center gap-1 lg:flex" aria-label="Main">
      {#each links as l}
        <a href={l.href} class="rounded-lg px-3.5 py-2 text-[15px] font-medium text-slate-600 transition hover:bg-[#edf3e9] hover:text-[#173f2a]">{l.label}</a>
      {/each}
    </nav>

    <div class="hidden items-center gap-2 lg:flex">
      {#if user}
        <Link href="/dashboard" class="rounded-xl bg-[#173f2a] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1f5236]">Dashboard</Link>
        <Link href="/logout" method="post" as="button" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#214b31] transition hover:bg-[#edf3e9]">Log out</Link>
      {:else}
        <Link href="/login" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#214b31] transition hover:bg-[#edf3e9]">Log in</Link>
        <Link href="/register" class="rounded-xl bg-[#173f2a] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f5236]">Join the marketplace</Link>
      {/if}
    </div>

    <button
      class="grid size-10 place-items-center rounded-xl border border-[#e1e9de] lg:hidden"
      aria-label="Toggle menu"
      aria-expanded={open}
      onclick={() => (open = !open)}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        {#if open}<path d="M6 6l12 12M18 6L6 18" />{:else}<path d="M4 7h16M4 12h16M4 17h16" />{/if}
      </svg>
    </button>
  </div>

  {#if open}
    <nav class="border-t border-[#e1e9de] bg-white px-5 py-4 lg:hidden" aria-label="Mobile">
      <div class="flex flex-col gap-1 font-medium">
        {#each links as l}
          <a href={l.href} onclick={() => (open = false)} class="rounded-lg px-3 py-3 hover:bg-[#edf3e9]">{l.label}</a>
        {/each}
        {#if user}
          <Link href="/dashboard" class="mt-2 rounded-xl bg-[#173f2a] px-4 py-3 text-center font-semibold text-white">Dashboard</Link>
          <Link href="/logout" method="post" as="button" class="rounded-xl border border-[#e1e9de] px-4 py-3 text-center font-semibold text-[#214b31]">Log out</Link>
        {:else}
          <Link href="/register" class="mt-2 rounded-xl bg-[#173f2a] px-4 py-3 text-center font-semibold text-white">Join the marketplace</Link>
          <Link href="/login" class="rounded-xl border border-[#e1e9de] px-4 py-3 text-center font-semibold text-[#214b31]">Log in</Link>
        {/if}
      </div>
    </nav>
  {/if}
</header>
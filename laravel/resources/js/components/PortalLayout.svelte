<script>
  import { Link, router } from "@inertiajs/svelte";

  let { title, user = null, children } = $props();
</script>

<svelte:head>
  <title>{title} | Modern Farms</title>
</svelte:head>

<div class="portal-layout flex min-h-screen flex-col bg-[#f6f8f3] text-[#173026]">
  <header class="site-header border-b">
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
      <Link href="/" class="group inline-flex items-center gap-2.5 font-bold tracking-tight text-[#174b32]">
        <span class="brand-mark group-hover:rotate-[-5deg]" aria-hidden="true">🌱</span>
        <span>Modern Farms</span>
      </Link>
      <nav class="flex items-center gap-2 text-sm sm:gap-3" aria-label="Main navigation">
        {#if user}
          <span class="hidden rounded-full bg-[#f3f7ef] px-3 py-2 font-medium text-slate-600 sm:inline">{user.full_name}</span>
          <button
            type="button"
            class="rounded-xl border border-[#dce7df] bg-white px-4 py-2.5 font-semibold text-[#294a36] shadow-sm hover:border-[#b7cfb9] hover:bg-[#f6f9f3]"
            onclick={() => router.post("/logout")}
          >
            Sign out
          </button>
        {:else}
          <Link href="/login" class="rounded-xl px-3 py-2.5 font-semibold text-[#345441] hover:bg-[#f2f6ef]">Log in</Link>
          <Link href="/register" class="rounded-xl bg-[#1b5d3a] px-4 py-2.5 font-semibold text-white shadow-sm shadow-[#1b5d3a]/15 hover:-translate-y-0.5 hover:bg-[#12472d] sm:px-5">
            Join Modern Farms
          </Link>
        {/if}
      </nav>
    </div>
  </header>
  <main class="flex-1">{@render children?.()}</main>
  <footer class="portal-footer">
    <div class="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <p class="font-semibold text-[#385541]">🌱 Modern Farms</p>
      <p>Good food starts with good farms.</p>
    </div>
  </footer>
</div>

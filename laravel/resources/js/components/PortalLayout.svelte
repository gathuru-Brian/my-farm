<script>
  import { Link, router } from "@inertiajs/svelte";

  let { title, user = null, children } = $props();
</script>

<svelte:head>
  <title>{title} | Modern Farms</title>
</svelte:head>

<div class="min-h-screen bg-[#f4f8f5] text-[#173026]">
  <header class="border-b border-[#e3ebe5] bg-white">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
      <Link href="/" class="font-bold text-[#0b552e]">🌱 Modern Farms</Link>
      <nav class="flex items-center gap-3 text-sm">
        {#if user}
          <span class="hidden text-slate-600 sm:inline">{user.full_name}</span>
          <button
            type="button"
            class="rounded-lg border border-[#dce7df] px-3 py-2 font-semibold hover:bg-[#f4f8f5]"
            onclick={() => router.post("/logout")}
          >
            Sign out
          </button>
        {:else}
          <Link href="/login" class="px-3 py-2 font-semibold text-[#214b31]">Log in</Link>
          <Link href="/register" class="rounded-lg bg-[#176b3b] px-4 py-2 font-semibold text-white hover:bg-[#0b482b]">
            Join Modern Farms
          </Link>
        {/if}
      </nav>
    </div>
  </header>
  <main>{@render children?.()}</main>
</div>

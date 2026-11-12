<script>
  let { eyebrow, title, description, initials = "", children } = $props();
</script>

<section class="dashboard-welcome relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#0c281b] via-[#154a31] to-[#216b43] px-5 py-6 text-white shadow-[0_24px_60px_-34px_rgba(12,40,27,.75)] sm:px-8 sm:py-8 lg:px-10">
  <div class="pointer-events-none absolute -right-20 -top-32 -z-10 size-80 rounded-full border border-white/10"></div>
  <div class="pointer-events-none absolute right-20 top-24 -z-10 size-48 rounded-full border border-white/10"></div>
  <div class="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_82%_18%,rgba(216,233,184,.16),transparent_38%)]"></div>

  <div class="grid items-end gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
    <div class="min-w-0">
      <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#d8e9b8]">
        <span class="size-1.5 rounded-full bg-[#c6df9e]" aria-hidden="true"></span>
        {eyebrow}
      </div>
      <h1 class="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-[-.04em] sm:text-4xl lg:text-[2.65rem]">{title}</h1>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-green-50/75 sm:text-base">{description}</p>
    </div>

    {#if children}
      <aside class="min-w-0 xl:max-w-[34rem]">
        {@render children?.()}
      </aside>
    {/if}
  </div>
</section>

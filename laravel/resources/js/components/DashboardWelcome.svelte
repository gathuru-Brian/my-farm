<script>
  let { eyebrow, title, description, initials = "", children, accent = "customer", compact = false } = $props();
  const accents = {
    customer: {
      background: "from-[#1b5636] via-[#276f45] to-[#347a49]",
      eyebrow: "text-[#d7f0d2]",
      dot: "bg-[#b5d96b]",
      glow: "rgba(181,217,107,.18)",
    },
    producer: {
      background: "from-[#49291f] via-[#81412c] to-[#b45a38]",
      eyebrow: "text-[#ffe1cb]",
      dot: "bg-[#f4a261]",
      glow: "rgba(244,162,97,.2)",
    },
  };
  let theme = $derived(accents[accent] ?? accents.customer);
</script>

<section class={`dashboard-welcome relative isolate overflow-hidden rounded-2xl bg-gradient-to-br ${theme.background} px-5 text-white shadow-[0_24px_60px_-34px_rgba(12,40,27,.75)] ${compact ? "py-5 sm:px-7" : "py-6 sm:px-8 sm:py-8 lg:px-10"}`}>
  <div class="pointer-events-none absolute -right-20 -top-32 -z-10 size-80 rounded-full border border-white/10"></div>
  <div class="pointer-events-none absolute right-20 top-24 -z-10 size-48 rounded-full border border-white/10"></div>
  <div class="pointer-events-none absolute inset-0 -z-20" style={`background: radial-gradient(ellipse at 82% 18%, ${theme.glow}, transparent 38%)`}></div>

  <div class={`grid items-center gap-4 ${compact ? "sm:grid-cols-[minmax(0,1fr)_auto]" : "xl:grid-cols-[minmax(0,1fr)_auto]"}`}>
    <div class="min-w-0">
      <div class={`inline-flex items-center gap-2 ${compact ? "text-[10px]" : "rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[11px]"} font-bold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
        <span class={`size-1.5 rounded-full ${theme.dot}`} aria-hidden="true"></span>
        {eyebrow}
      </div>
      <h1 class={`max-w-3xl font-extrabold leading-tight tracking-[-.04em] ${compact ? "mt-1 text-2xl sm:text-[1.7rem]" : "mt-4 text-3xl sm:text-4xl lg:text-[2.65rem]"}`}>{title}</h1>
      <p class={`max-w-2xl leading-6 text-green-50/85 ${compact ? "mt-1 text-xs sm:text-sm" : "mt-2 text-sm sm:text-base"}`}>{description}</p>
    </div>

    {#if children}
      <aside class={`min-w-0 ${compact ? "sm:max-w-[24rem]" : "xl:max-w-[34rem]"}`}>
        {@render children?.()}
      </aside>
    {/if}
  </div>
</section>

<script>
  import SiteHeader from "./SiteHeader.svelte";
  import SiteFooter from "./SiteFooter.svelte";

  let { auth, title, description, eyebrow, heading, intro, image = null, imageAlt = "", children } = $props();
</script>

<svelte:head>
  <title>{title} | Modern Farms</title>
  <meta name="description" content={description} />
</svelte:head>

<div class="marketing-page min-h-screen antialiased">
  <SiteHeader user={auth?.user} />

  <main>
    <section class="bg-[#102d20] text-white">
      <div class="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:py-18 lg:grid-cols-[1fr_0.85fr] lg:px-8 lg:py-20">
        <div>
          <p class="text-sm font-bold uppercase tracking-[0.2em] text-[#c6df9e]">{eyebrow}</p>
          <h1 class="mt-4 max-w-3xl text-4xl font-extrabold tracking-[-.04em] sm:text-5xl lg:text-6xl">{heading}</h1>
          <p class="mt-5 max-w-2xl text-lg leading-8 text-green-50/80">{intro}</p>
        </div>
        {#if image}
          <img src={image} alt={imageAlt} class="h-64 w-full rounded-3xl object-cover shadow-2xl sm:h-80 lg:h-[22rem]" />
        {:else}
          <div class="hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-6xl lg:grid lg:aspect-[1.4] lg:place-items-center" aria-hidden="true">🌱</div>
        {/if}
      </div>
    </section>

    {@render children?.()}
  </main>

  <SiteFooter />
</div>

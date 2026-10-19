<script>
  const products = [
    { name: "Fresh vegetables", detail: "Harvested locally and delivered fresh", image: "/frontend/assets/vegetables.jpg" },
    { name: "Farm potatoes", detail: "Carefully grown, naturally delicious", image: "/frontend/assets/potatoes.jpg" },
    { name: "Quality dairy", detail: "Fresh dairy from trusted farms", image: "/frontend/assets/dairy.png" }
  ];
</script>

<svelte:head>
  <title>Modern Farms | Farm Fresh. Direct to You.</title>
</svelte:head>

<div class="min-h-screen bg-[#f8faf6] text-[#17251c]">
  <header class="sticky top-0 z-20 border-b border-[#e7ece5] bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
      <a href="/" class="flex items-center gap-2 text-xl font-bold tracking-tight text-[#173f2a]">
        <span class="text-2xl">🌱</span> Modern Farms
      </a>
      <nav class="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
        <a class="hover:text-green-800" href="#marketplace">Marketplace</a>
        <a class="hover:text-green-800" href="#how-it-works">How it works</a>
        <a class="hover:text-green-800" href="#about">About</a>
      </nav>
      <div class="flex items-center gap-3">
        <a class="hidden px-3 py-2 text-sm font-semibold text-[#214b31] sm:inline" href="/frontend/pages/login.html">Log in</a>
        <a class="button-primary text-sm" href="/frontend/pages/register.html">Join the marketplace</a>
      </div>
    </div>
  </header>

  <main>
    <section class="relative isolate overflow-hidden bg-[#103522] text-white">
      <div class="absolute inset-0 -z-10 bg-cover bg-center opacity-25" style="background-image: url('/frontend/assets/hero.jpg')"></div>
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-[#103522] via-[#103522]/90 to-[#103522]/35"></div>
      <div class="mx-auto grid max-w-7xl gap-10 px-5 py-24 md:grid-cols-[1.1fr_.9fr] md:items-center md:py-32 lg:px-8">
        <div class="max-w-2xl">
          <span class="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-green-100">Farm fresh. Direct to you.</span>
          <h1 class="mt-6 text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl">Good food starts with <span class="text-[#b8dd8b]">good farms.</span></h1>
          <p class="mt-6 max-w-xl text-lg leading-8 text-green-50/85">Discover fresh produce from trusted local farmers. Shop with confidence and help Kenya’s farms thrive.</p>
          <div class="mt-9 flex flex-wrap gap-3">
            <a href="/frontend/pages/register.html" class="rounded-xl bg-[#c1e39b] px-6 py-3.5 font-bold text-[#173f2a] hover:bg-[#d0edb1]">Explore the marketplace <span aria-hidden="true">→</span></a>
            <a href="#how-it-works" class="rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white hover:bg-white/10">How it works</a>
          </div>
        </div>
        <div class="hidden md:block">
          <div class="ml-auto max-w-sm rounded-3xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-sm">
            <img class="h-[390px] w-full rounded-2xl object-cover" src="/frontend/assets/farm-worker.jpg" alt="A farmer working in a green field" />
            <div class="px-3 py-4"><p class="font-semibold">Grown with care, shared with you.</p><p class="mt-1 text-sm text-green-100/80">Supporting local farmers, one harvest at a time.</p></div>
          </div>
        </div>
      </div>
    </section>

    <section id="marketplace" class="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div><p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Fresh from the farm</p><h2 class="mt-3 text-3xl font-bold tracking-tight md:text-4xl">A better way to shop local</h2></div>
        <a class="font-semibold text-[#28623a] hover:underline" href="/frontend/pages/register.html">Browse the marketplace →</a>
      </div>
      <div class="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {#each products as product}
          <a href="/frontend/pages/register.html" class="group overflow-hidden rounded-2xl border border-[#e7ece5] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
            <img class="h-56 w-full object-cover transition duration-500 group-hover:scale-[1.03]" src={product.image} alt={product.name} />
            <div class="p-5"><h3 class="text-lg font-bold">{product.name}</h3><p class="mt-1 text-sm text-slate-600">{product.detail}</p></div>
          </a>
        {/each}
      </div>
    </section>

    <section id="how-it-works" class="bg-[#edf3e9]">
      <div class="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div class="max-w-2xl"><p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Simple by nature</p><h2 class="mt-3 text-3xl font-bold tracking-tight md:text-4xl">From the people who grow it</h2><p class="mt-4 leading-7 text-slate-600">A direct connection between local farms and the people who value fresh, responsibly grown food.</p></div>
        <div class="mt-10 grid gap-5 md:grid-cols-3">
          {#each [{ n: "01", title: "Discover", text: "Browse fresh produce from farmers near you." }, { n: "02", title: "Order", text: "Choose what you need and place your order online." }, { n: "03", title: "Enjoy", text: "Get farm-fresh goodness delivered to your door." }] as step}
            <article class="rounded-2xl bg-white p-6"><span class="text-sm font-bold text-[#5b8b53]">{step.n}</span><h3 class="mt-4 text-xl font-bold">{step.title}</h3><p class="mt-2 leading-6 text-slate-600">{step.text}</p></article>
          {/each}
        </div>
      </div>
    </section>

    <section id="about" class="mx-auto max-w-7xl px-5 py-20 lg:px-8">
      <div class="surface grid overflow-hidden md:grid-cols-2">
        <img class="h-72 w-full object-cover md:h-full" src="/frontend/assets/our_farm.jpg" alt="A thriving local farm" />
        <div class="p-8 md:p-12"><p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Rooted in community</p><h2 class="mt-3 text-3xl font-bold tracking-tight">Growing a stronger food community</h2><p class="mt-4 leading-7 text-slate-600">Modern Farms helps local producers reach more customers and makes it easier for families to find quality farm products.</p><a href="/frontend/pages/register.html" class="button-primary mt-7">Get started</a></div>
      </div>
    </section>
  </main>

  <footer class="bg-[#103522] text-green-50">
    <div class="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <a href="/" class="text-lg font-bold">🌱 Modern Farms</a><p class="text-sm text-green-100/70">© 2026 Modern Farms. Farm fresh. Direct to you.</p>
      <div class="flex gap-5 text-sm"><a href="/frontend/pages/login.html" class="hover:text-white">Log in</a><a href="/frontend/pages/register.html" class="hover:text-white">Create account</a></div>
    </div>
  </footer>
</div>

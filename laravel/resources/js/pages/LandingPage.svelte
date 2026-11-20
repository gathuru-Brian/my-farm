<script>
  import { Link } from "@inertiajs/svelte";
  import SiteHeader from "../components/SiteHeader.svelte";
  import SiteFooter from "../components/SiteFooter.svelte";
  import ProductImage from "../components/ProductImage.svelte";

  let { auth, stats = {}, featured = [] } = $props();
  let liveStats = $derived([
    { value: stats.farmers ?? 0, label: "Active producers" },
    { value: stats.farms ?? 0, label: "Active farms" },
    { value: stats.products ?? 0, label: "Available products" },
  ]);

  const values = [
    { title: "Know your farmer", text: "See who grew your food and where it came from." },
    { title: "Fairer for everyone", text: "Producers set their prices and keep more of every sale." },
    { title: "Fresher by default", text: "Shorter journeys from field to table mean better taste." }
  ];

  const categories = [
    { name: "Vegetables", note: "Kale, tomatoes, onions", icon: "🥬", image: "/images/marketplace-greens.jpg" },
    { name: "Fruit", note: "Mangoes, avocados, bananas", icon: "🥭", image: "/images/marketplace-bananas.jpg" },
    { name: "Dairy & eggs", note: "Milk, yoghurt, eggs", icon: "🥛", image: "/images/marketplace-milk.jpg" },
    { name: "Grains & tubers", note: "Maize, potatoes, beans", icon: "🌽", image: "/images/marketplace-maize.jpg" },
    {name: "Meat & poultry", note: "Beef, chicken, goat", icon: "🍗", image: "/images/marketplace-meat.jpg" },
    { name: "Herbs & spices", note: "Coriander, turmeric, garlic", icon: "🌿", image: "/images/marketplace-herbs.jpg" },
    { name: "Honey & preserves", note: "Honey, jams, pickles", icon: "🍯", image: "/images/marketplace-honey.jpg" }
  ];

  const pillars = [
    { title: "Our mission", icon: "🎯", text: "To connect local farmers directly with buyers so every harvest finds a fair market and every table gets fresher food." },
    { title: "Our vision", icon: "🔭", text: "A Kenya where farming communities thrive, food travels less, and good produce is easy for everyone to find." },
    { title: "Our purpose", icon: "💚", text: "To give farmers the tools, reach and fair pay they deserve, and give families confidence in where their food comes from." }
  ];

  function hide(e) { e.currentTarget.style.display = "none"; }

  const steps = [
    { n: "1", title: "Discover", text: "Browse fresh produce from farms in your community." },
    { n: "2", title: "Connect", text: "Speak directly with producers about their harvest." },
    { n: "3", title: "Order", text: "Order simply and follow your order from your dashboard." },
    { n: "4", title: "Receive", text: "Get your produce delivered, then leave a recommendation." }
  ];

</script>

<svelte:head>
  <title>Modern Farms | Farm Fresh. Direct to You.</title>
  <meta name="description" content="Discover fresh farm products and connect directly with local producers through Modern Farms." />
</svelte:head>

<div class="marketing-page min-h-screen antialiased">
  <SiteHeader user={auth?.user} />

  <main>
  <!-- Hero: full-bleed image -->
  <section id="top" class="relative isolate flex min-h-[85svh] items-center overflow-hidden bg-[#102d20] text-white lg:min-h-[90svh]">
    <img
      src="/images/farm-hero.jpg"
      alt="Sunlight over a thriving green farm"
      class="absolute inset-0 -z-20 h-full w-full object-cover"
      fetchpriority="high"
    />
    <!-- Legibility overlays: dark on the left for text, fade at the bottom -->
    <div class="absolute inset-0 -z-10 bg-gradient-to-r from-[#0b2418]/90 via-[#0b2418]/60 to-[#0b2418]/10"></div>
    <div class="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#0b2418]/70 to-transparent"></div>

    <div class="mx-auto w-full max-w-7xl px-5 py-20 sm:py-24 lg:px-8">
      <div class="hero-in max-w-2xl">
        <p class="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-4 py-2 text-sm font-semibold text-[#e0edcf] backdrop-blur">
          <span class="size-2 rounded-full bg-[#c6df9e]"></span>
          A marketplace rooted in community
        </p>
        <h1 class="mt-7 text-[2.9rem] font-extrabold leading-[1.03] tracking-[-.045em] drop-shadow-sm sm:text-6xl lg:text-[5rem]">
          Good food starts with <span class="text-[#c6df9e]">good farms.</span>
        </h1>
        <p class="mt-6 max-w-xl text-base leading-7 text-white/85 sm:text-lg sm:leading-8">
          Discover fresh produce from trusted local farmers, connect directly with producers, and help Kenya's farms thrive.
        </p>
        <div class="mt-9 flex flex-col gap-3 sm:flex-row">
          <Link href="/register" class="inline-flex items-center justify-center gap-3 rounded-xl bg-[#d8e9b8] px-7 py-4 font-bold text-[#173b29] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-[#e5f0ce] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Explore the marketplace <span class="text-lg" aria-hidden="true">→</span>
          </Link>
          <Link href="/login" class="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 px-7 py-4 font-semibold text-white backdrop-blur transition hover:border-white/70 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            Sign in to your account
          </Link>
        </div>
        <ul class="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
          <li class="inline-flex items-center gap-2"><span class="text-[#c6df9e]">✓</span> Direct connection with producers</li>
          <li class="inline-flex items-center gap-2"><span class="text-[#c6df9e]">✓</span> Fresh, local produce</li>
          <li class="inline-flex items-center gap-2"><span class="text-[#c6df9e]">✓</span> Track every order</li>
        </ul>
      </div>
    </div>

    <!-- Glass caption card, bottom right -->
    <div class="absolute bottom-8 right-5 hidden max-w-xs rounded-2xl border border-white/25 bg-white/10 p-5 shadow-2xl backdrop-blur-md md:block lg:bottom-12 lg:right-8">
      <div class="flex items-center gap-3">
        <img src="/images/modern-farms-mark.svg" alt="" class="size-10" aria-hidden="true" />
        <p class="text-sm font-bold">Rooted in the land</p>
      </div>
      <p class="mt-3 text-sm leading-6 text-white/85">A closer connection between the people who grow and the people who eat.</p>
    </div>
  </section>

  <!-- Stats -->
  <section class="border-b border-[#e1e9de] bg-white">
    <dl class="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-5 py-10 md:grid-cols-4 lg:px-8">
      {#each liveStats as s}
        <div class="text-center">
          <dt class="text-4xl font-extrabold tracking-tight text-[#173f2a]">{s.value}</dt>
          <dd class="mt-1 text-sm text-slate-500">{s.label}</dd>
        </div>
      {/each}
    </dl>
  </section>

  <!-- About us -->
  <section id="about" class="mx-auto max-w-7xl scroll-mt-20 px-5 py-16 sm:py-20 lg:px-8 lg:py-24">
    <div class="grid gap-12 lg:grid-cols-2 lg:items-center">
      <div class="relative">
        <div class="relative h-80 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#d8e9b8] to-[#7fb069] shadow-xl sm:h-[28rem]">
          <span class="absolute inset-0 grid place-items-center text-8xl opacity-50" aria-hidden="true">🚜</span>
          <img src="/images/hero.jpg" alt="Farmers harvesting on a local farm" loading="lazy" onerror={hide} class="absolute inset-0 h-full w-full object-cover" />
        </div>
        <div class="absolute -bottom-6 right-4 rounded-2xl bg-white px-6 py-4 shadow-xl sm:right-8">
          <p class="text-3xl font-extrabold text-[#173f2a]">{stats.farmers ?? 0}</p>
          <p class="text-sm text-slate-500">Active producers</p>
        </div>
      </div>
      <div>
        <h2 class="text-3xl font-bold tracking-[-.035em] text-[#173026] sm:text-4xl">Growing a stronger food community</h2>
        <p class="mt-4 max-w-lg leading-7 text-slate-600">Modern Farms helps local producers reach more customers and makes it easier for families and businesses to find quality farm products. When buyers and growers deal directly, food travels less, prices are clearer, and farmers earn what their work is worth.</p>
        <ul class="mt-7 grid gap-3">
          {#each values as v}
            <li class="flex gap-4 rounded-2xl border border-[#e1e9de] bg-white p-4 shadow-sm">
              <span class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-[#173f2a] text-[#c6df9e]" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </span>
              <div><h3 class="font-bold text-[#1b3527]">{v.title}</h3><p class="text-sm leading-6 text-slate-600">{v.text}</p></div>
            </li>
          {/each}
        </ul>
        <Link href="/contact" class="mt-7 inline-flex items-center gap-2 font-bold text-[#28623a] hover:underline">Talk to our team <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  </section>

  <!-- Marketplace -->
  <section id="marketplace" class="scroll-mt-20 bg-white">
    <div class="mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8 lg:py-24">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="max-w-xl">
          <h2 class="text-3xl font-bold tracking-[-.035em] text-[#173026] sm:text-4xl">The marketplace</h2>
          <p class="mt-3 leading-7 text-slate-600">Browse by category, or start with what's fresh this week.</p>
        </div>
        <Link href={auth?.user ? "/dashboard" : "/register"} class="rounded-xl bg-[#173f2a] px-6 py-3 font-semibold text-white transition hover:bg-[#1f5236]">
          {auth?.user ? "Open marketplace" : "Browse all produce"} →
        </Link>
      </div>

      <!-- Category image cards -->
      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {#each categories as c}
          <Link href={auth?.user ? "/dashboard" : "/register"} class="group relative isolate block h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-[#d8e9b8] to-[#7fb069] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <span class="absolute inset-0 -z-20 grid place-items-center text-7xl opacity-50" aria-hidden="true">{c.icon}</span>
            <img src={c.image} alt={c.name} loading="lazy" onerror={hide} class="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <div class="absolute inset-0 -z-10 bg-gradient-to-t from-[#0b2418]/85 via-[#0b2418]/20 to-transparent"></div>
            <div class="absolute inset-x-0 bottom-0 p-5 text-white">
              <h3 class="text-xl font-bold">{c.name}</h3>
              <p class="mt-1 text-sm text-white/80">{c.note}</p>
              <span class="mt-3 inline-block text-sm font-bold text-[#c6df9e] transition group-hover:translate-x-1" aria-hidden="true">Shop now →</span>
            </div>
          </Link>
        {/each}
      </div>

      <!-- Featured product cards -->
      <h3 class="mt-16 text-2xl font-bold tracking-tight text-[#173026]">Fresh this week</h3>
      <div class="mt-6 grid gap-6 md:grid-cols-3">
        {#each featured as p (p.id)}
          <Link href={`/products/${p.id}`} class="group overflow-hidden rounded-3xl border border-[#e1e9de] bg-[#fbfcf8] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div class="relative h-56 overflow-hidden bg-gradient-to-br from-[#d8e9b8] to-[#9cc27a]">
              <span class="absolute inset-0 grid place-items-center text-7xl opacity-50" aria-hidden="true">{p.icon}</span>
              <ProductImage src={p.image} name={p.name} category={p.category} className="h-full w-full" imageClassName="transition duration-500 group-hover:scale-105" />
              <span class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#173f2a] shadow">{p.tag}</span>
            </div>
            <div class="p-6">
              <h4 class="text-lg font-bold text-[#1b3527]">{p.name}</h4>
              <p class="mt-1 text-sm text-slate-500">{p.farm} · {p.place}</p>
              <div class="mt-5 flex items-center justify-between">
                <p><span class="text-2xl font-extrabold text-[#173f2a]">{p.price}</span> <span class="text-sm text-slate-500">{p.unit}</span></p>
                <span class="rounded-xl bg-[#edf5e7] px-4 py-2 text-sm font-bold text-[#173f2a] transition group-hover:bg-[#173f2a] group-hover:text-white">Order</span>
              </div>
            </div>
          </Link>
        {:else}
          <div class="col-span-full rounded-3xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center">
            <p class="font-semibold text-[#1b3527]">Fresh listings are coming soon</p>
            <p class="mt-2 text-sm text-slate-500">Approved farms and available products will appear here.</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- How we work -->
  <section id="how-we-work" class="relative scroll-mt-20 overflow-hidden bg-[#eaf1e3]">
    <div class="absolute -left-24 top-10 size-72 rounded-full bg-[#c6df9e]/40 blur-3xl"></div>
    <div class="relative mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8 lg:py-24">
      <div class="mx-auto max-w-2xl text-center">
        <h2 class="text-3xl font-bold tracking-[-.035em] text-[#173026] sm:text-4xl">How we work</h2>
        <p class="mx-auto mt-4 max-w-xl leading-7 text-slate-600">What drives us, and how an order gets from a farmer's field to your kitchen.</p>
      </div>

      <!-- Mission, vision, purpose -->
      <div class="mt-12 grid gap-5 md:grid-cols-3">
        {#each pillars as p}
          <article class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#173f2a] to-[#1f5b3a] p-8 text-white shadow-lg">
            <div class="absolute -right-10 -top-10 size-40 rounded-full bg-white/5"></div>
            <span class="relative grid size-14 place-items-center rounded-2xl bg-white/10 text-3xl" aria-hidden="true">{p.icon}</span>
            <h3 class="relative mt-6 text-2xl font-bold tracking-tight">{p.title}</h3>
            <p class="relative mt-3 leading-7 text-green-50/85">{p.text}</p>
          </article>
        {/each}
      </div>

      <!-- Steps -->
      <ol class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
        {#each steps as step}
          <li class="rounded-3xl bg-white p-6 shadow-[0_10px_35px_-28px_rgba(24,69,42,.42)] transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-7">
            <span class="grid size-12 place-items-center rounded-full bg-[#c6df9e] text-lg font-extrabold text-[#173f2a]">{step.n}</span>
            <h3 class="mt-6 text-xl font-bold tracking-tight text-[#1b3527]">{step.title}</h3>
            <p class="mt-2 leading-6 text-slate-600">{step.text}</p>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <!-- CTA band -->
  <section class="px-5 pb-16 sm:pb-24 lg:px-8">
    <div class="mx-auto grid max-w-7xl gap-5 md:grid-cols-2">
      <div class="rounded-[1.75rem] bg-[#eaf1e3] p-8 sm:p-10">
        <h2 class="text-2xl font-bold tracking-tight text-[#173026] sm:text-3xl">Shopping for your family or business?</h2>
        <p class="mt-3 max-w-md text-slate-600">Create a free account to browse produce, message farmers, and track your orders.</p>
        <Link href="/register" class="mt-7 inline-flex items-center gap-3 rounded-xl bg-[#1b5d3a] px-6 py-3.5 font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#12472d]">Create an account <span aria-hidden="true">→</span></Link>
      </div>
      <div class="relative overflow-hidden rounded-[1.75rem] bg-[#102d20] p-8 text-white sm:p-10">
        <div class="absolute -right-16 -top-16 size-64 rounded-full bg-[#4f9a5a]/25 blur-3xl"></div>
        <div class="relative">
          <h2 class="text-2xl font-bold tracking-tight sm:text-3xl">Are you a producer?</h2>
          <p class="mt-3 max-w-md text-green-50/80">List your harvest, set your own prices, and reach customers who value what you grow.</p>
          <div class="mt-7 flex flex-wrap gap-3">
            <Link href="/register" class="inline-flex items-center gap-3 rounded-xl bg-[#d8e9b8] px-6 py-3.5 font-bold text-[#173b29] transition hover:-translate-y-0.5 hover:bg-[#e5f0ce]">Start selling <span aria-hidden="true">→</span></Link>
            <Link href="/contact" class="inline-flex items-center rounded-xl border border-white/30 px-6 py-3.5 font-semibold transition hover:bg-white/10">Contact us</Link>
          </div>
        </div>
      </div>
    </div>
  </section>
  </main>

  <SiteFooter />
</div>

<style>
  :global(html) { scroll-behavior: smooth; }
  .hero-in { animation: heroIn 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
  @keyframes heroIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-in { animation: none; }
    :global(html) { scroll-behavior: auto; }
  }
</style>
<script>
  import { Link } from "@inertiajs/svelte";
  import PublicPageLayout from "../components/PublicPageLayout.svelte";

  let { auth } = $props();

  const principles = [
    { title: "Fairer access", text: "Give producers a direct way to list their harvest and reach more buyers." },
    { title: "Clear provenance", text: "Help customers understand which farm their produce comes from." },
    { title: "Stronger connections", text: "Make it easier for buyers and producers to ask questions and coordinate orders." }
  ];
</script>

<PublicPageLayout
  {auth}
  title="About us"
  description="Learn about Modern Farms and our goal of connecting Kenyan producers with customers."
  eyebrow="About Modern Farms"
  heading="Good food starts with good farms."
  intro="Modern Farms is a marketplace designed to bring local producers and customers closer together, from discovering produce to following an order."
  image="/images/farm-hero.jpg"
  imageAlt="A view across a working farm"
>
  {#snippet children()}
    <section class="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
      <div>
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-[#438150]">Our story</p>
        <h2 class="mt-3 text-3xl font-extrabold tracking-tight text-[#173f2a]">A simpler connection between farms and tables</h2>
        <div class="mt-5 space-y-4 text-base leading-7 text-slate-600">
          <p>Finding fresh local produce and reaching new customers can be difficult when farms and buyers are disconnected. Modern Farms brings product discovery, producer profiles, orders, and messaging into one place.</p>
          <p>Customers can explore available products, learn about the farms behind them, and keep track of their orders. Producers can manage farm and inventory details and respond to orders from their dashboard.</p>
        </div>
      </div>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <article class="rounded-3xl bg-[#eaf1e3] p-7">
          <h2 class="text-xl font-bold text-[#173f2a]">Our mission</h2>
          <p class="mt-3 leading-7 text-slate-700">Make local food easier to discover and help producers connect directly with the people who want to buy it.</p>
        </article>
        <article class="rounded-3xl border border-[#e1e9de] bg-white p-7">
          <h2 class="text-xl font-bold text-[#173f2a]">Our vision</h2>
          <p class="mt-3 leading-7 text-slate-600">A thriving local food community built on transparency, dependable communication, and stronger relationships between producers and customers.</p>
        </article>
      </div>
    </section>

    <section class="bg-white">
      <div class="mx-auto max-w-7xl px-5 py-14 sm:py-18 lg:px-8">
        <div class="max-w-2xl">
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-[#438150]">What guides us</p>
          <h2 class="mt-3 text-3xl font-extrabold tracking-tight text-[#173f2a]">Built around practical connections</h2>
        </div>
        <div class="mt-8 grid gap-5 md:grid-cols-3">
          {#each principles as principle}
            <article class="rounded-2xl border border-[#e1e9de] bg-[#fbfcf8] p-6">
              <span class="grid size-10 place-items-center rounded-xl bg-[#eaf1e3] text-lg text-[#28623a]" aria-hidden="true">✓</span>
              <h3 class="mt-4 text-lg font-bold text-[#173f2a]">{principle.title}</h3>
              <p class="mt-2 leading-6 text-slate-600">{principle.text}</p>
            </article>
          {/each}
        </div>
        <Link href="/register" class="mt-8 inline-flex rounded-xl bg-[#173f2a] px-6 py-3 font-bold text-white transition hover:bg-[#1f5236]">Join the marketplace</Link>
      </div>
    </section>
  {/snippet}
</PublicPageLayout>

<script>
  import { Link } from "@inertiajs/svelte";
  import PortalLayout from "../components/PortalLayout.svelte";

  let { auth } = $props();

  const steps = [
    { number: "01", title: "Discover", text: "Find fresh products from local farms and producers." },
    { number: "02", title: "Connect", text: "Talk directly with producers about products and availability." },
    { number: "03", title: "Order", text: "Place orders and track them from your customer dashboard." }
  ];
</script>

<svelte:head>
  <meta name="description" content="Discover fresh farm products and connect directly with local producers through Modern Farms." />
</svelte:head>

<PortalLayout title="Farm Fresh. Direct to You." user={auth.user}>
  <section class="relative isolate overflow-hidden bg-[#103522] text-white">
    <div class="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_16%,rgba(161,209,129,.28),transparent_48%),linear-gradient(120deg,#092c1b,#176b3b)]"></div>
    <div class="mx-auto max-w-7xl px-5 py-24 md:py-32 lg:px-8">
      <div class="max-w-3xl">
        <p class="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-green-100">
          A marketplace rooted in community
        </p>
        <h1 class="mt-7 text-5xl font-bold leading-[1.08] tracking-tight md:text-7xl">
          Good food starts with <span class="text-[#b8dd8b]">good farms.</span>
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-green-50/85">
          Discover fresh produce from trusted local farmers, connect directly with producers, and help Kenya's farms thrive.
        </p>
        <div class="mt-9 flex flex-wrap gap-3">
          <Link href="/register" class="rounded-xl bg-[#c1e39b] px-6 py-3.5 font-bold text-[#173f2a] hover:bg-[#d0edb1]">
            Explore the marketplace <span aria-hidden="true">→</span>
          </Link>
          <Link href="/login" class="rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white hover:bg-white/10">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  </section>

  <section class="mx-auto max-w-7xl px-5 py-20 lg:px-8">
    <p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Simple by nature</p>
    <h2 class="mt-3 text-3xl font-bold tracking-tight md:text-4xl">From farm to table, together</h2>
    <div class="mt-9 grid gap-5 md:grid-cols-3">
      {#each steps as step}
        <article class="rounded-2xl border border-[#e3ebe5] bg-white p-6 shadow-sm">
          <span class="text-sm font-bold text-[#5b8b53]">{step.number}</span>
          <h3 class="mt-4 text-xl font-bold">{step.title}</h3>
          <p class="mt-2 leading-6 text-slate-600">{step.text}</p>
        </article>
      {/each}
    </div>
  </section>
</PortalLayout>

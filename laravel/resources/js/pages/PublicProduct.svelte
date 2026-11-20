<script>
  import { Link } from "@inertiajs/svelte";
  import SiteHeader from "../components/SiteHeader.svelte";
  import SiteFooter from "../components/SiteFooter.svelte";
  import ProductImage from "../components/ProductImage.svelte";

  let { auth, product } = $props();
  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });
</script>

<svelte:head>
  <title>{product.name} | Modern Farms</title>
  <meta name="description" content={product.description || `${product.name} available from ${product.farm.name}`} />
</svelte:head>

<div class="marketing-page min-h-screen bg-[#fbfcf8]">
  <SiteHeader user={auth?.user} />
  <main class="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-16">
    <Link href="/" class="text-sm font-bold text-[#28623a] hover:underline">← Back to marketplace</Link>
    <article class="mt-5 grid overflow-hidden rounded-3xl border border-[#e1e9de] bg-white shadow-sm lg:grid-cols-2">
      <div class="min-h-72 bg-[#edf5e7] lg:min-h-[480px]">
        <ProductImage src={product.image} name={product.name} category={product.category} className="h-full min-h-72 w-full lg:min-h-[480px]" />
      </div>
      <div class="p-6 sm:p-9">
        <p class="text-xs font-bold uppercase tracking-[0.15em] text-[#568268]">{product.category}</p>
        <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-[#173026] sm:text-4xl">{product.name}</h1>
        <Link href={`/farms/${product.farm.id}`} class="mt-3 inline-block text-sm font-bold text-[#28623a] hover:underline">{product.farm.name}</Link>
        {#if product.farm.location || product.farm.county}
          <p class="mt-1 text-sm text-slate-500">{[product.farm.location, product.farm.county].filter(Boolean).join(", ")}</p>
        {/if}
        <p class="mt-6 text-3xl font-extrabold text-[#173f2a]">{currency.format(product.price)} <span class="text-base font-semibold text-slate-500">/ {product.unit}</span></p>
        <p class="mt-5 leading-7 text-slate-600">{product.description || "Fresh produce listed by a verified local farm."}</p>
        <p class="mt-5 rounded-xl bg-[#f3f7ef] px-4 py-3 text-sm font-semibold text-[#315940]">{product.quantity_remaining} {product.unit} available</p>
        <Link href={auth?.user?.role === "customer" ? "/dashboard" : "/login"} class="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#176b3b] px-5 py-3.5 font-bold text-white hover:bg-[#0b482b] sm:w-auto">{auth?.user ? "Open your dashboard" : "Sign in to order"}</Link>
      </div>
    </article>
  </main>
  <SiteFooter />
</div>

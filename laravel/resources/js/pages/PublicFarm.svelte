<script>
  import { Link } from "@inertiajs/svelte";
  import SiteHeader from "../components/SiteHeader.svelte";
  import SiteFooter from "../components/SiteFooter.svelte";
  import ProductImage from "../components/ProductImage.svelte";

  let { auth, farm, products = [] } = $props();
  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });
</script>

<svelte:head>
  <title>{farm.name} | Modern Farms</title>
  <meta name="description" content={farm.description || `Products available from ${farm.name}`} />
</svelte:head>

<div class="marketing-page min-h-screen bg-[#fbfcf8]">
  <SiteHeader user={auth?.user} />
  <main class="mx-auto max-w-6xl px-5 py-10 lg:px-8 lg:py-16">
    <Link href="/" class="text-sm font-bold text-[#28623a] hover:underline">← Back to marketplace</Link>
    <header class="mt-5 rounded-3xl bg-[#173f2a] px-6 py-8 text-white sm:px-9">
      <p class="text-xs font-bold uppercase tracking-[0.15em] text-[#d8e9b8]">Local farm</p>
      <h1 class="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{farm.name}</h1>
      {#if farm.location || farm.county}<p class="mt-2 text-green-50/80">{[farm.location, farm.county].filter(Boolean).join(", ")}</p>{/if}
      {#if farm.producer_name}<p class="mt-1 text-sm text-green-50/70">Producer: {farm.producer_name}</p>{/if}
      {#if farm.description}<p class="mt-5 max-w-3xl leading-7 text-green-50/85">{farm.description}</p>{/if}
    </header>
    <section class="mt-8">
      <h2 class="text-2xl font-bold text-[#173026]">Available products</h2>
      {#if products.length}
        <div class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {#each products as product (product.id)}
            <Link href={`/products/${product.id}`} class="overflow-hidden rounded-2xl border border-[#e1e9de] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <ProductImage src={product.image} name={product.name} category={product.category} className="h-44 w-full" />
              <div class="p-5"><p class="text-xs font-bold uppercase tracking-wide text-[#568268]">{product.category}</p><h3 class="mt-1 font-bold">{product.name}</h3><p class="mt-3 font-extrabold text-[#173f2a]">{currency.format(product.price)} <span class="text-sm font-semibold text-slate-500">/ {product.unit}</span></p></div>
            </Link>
          {/each}
        </div>
      {:else}
        <p class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-slate-600">This farm has no available listings at the moment.</p>
      {/if}
    </section>
  </main>
  <SiteFooter />
</div>

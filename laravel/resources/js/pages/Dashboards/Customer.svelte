<script>
  import { router, useForm } from "@inertiajs/svelte";
  import DashboardTabs from "../../components/DashboardTabs.svelte";
  import DashboardWelcome from "../../components/DashboardWelcome.svelte";
  import MessageInbox from "../../components/MessageInbox.svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { auth, products = [], orders = [], producers = [], conversations = [], flash } = $props();
  let activeView = $state("marketplace");
  let selectedCategory = $state("all");
  let selectedFarm = $state("all");
  let priceRange = $state("all");
  let availability = $state("all");
  let sortBy = $state("popular");
  let productSearch = $state("");
  let cart = $state({});
  let orderForm = useForm({ items: [], delivery_address: "" });
  let selectedProduct = $state(null);
  let productDialog = $state(null);
  let productTrigger = $state(null);
  let cartItems = $derived(products
    .filter((product) => Number(cart[product.id] ?? 0) > 0)
    .map((product) => ({ ...product, quantity: Number(cart[product.id]) })));
  let cartTotal = $derived(cartItems.reduce((total, item) => total + item.price * item.quantity, 0));
  let categories = $derived([...new Set(products.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
  let visibleCategories = $derived(categories.slice(0, 5));
  let moreCategories = $derived(categories.slice(5));
  let farms = $derived(
    [...new Map(products
      .filter((product) => product.farm_id)
      .map((product) => [String(product.farm_id), { id: String(product.farm_id), name: product.farm_name ?? "Local farm" }]))
      .values()]
      .sort((a, b) => a.name.localeCompare(b.name))
  );
  let filteredProducts = $derived.by(() => {
    const search = productSearch.trim().toLowerCase();
    const matchingProducts = products.filter((product) => {
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
      const matchesFarm = selectedFarm === "all" || String(product.farm_id) === selectedFarm;
      const matchesSearch = `${product.name} ${product.category} ${product.farm_name ?? ""} ${product.producer_name ?? ""}`.toLowerCase().includes(search);
      const matchesPrice = priceRange === "under-100"
        ? product.price < 100
        : priceRange === "100-500"
          ? product.price >= 100 && product.price <= 500
          : priceRange === "over-500"
            ? product.price > 500
            : true;
      const matchesAvailability = availability === "well-stocked"
        ? product.quantity_remaining >= 10
        : availability === "low-stock"
          ? product.quantity_remaining < 10
          : true;

      return matchesCategory && matchesFarm && matchesSearch && matchesPrice && matchesAvailability;
    });

    return matchingProducts.sort((first, second) => {
      if (sortBy === "price-low") return first.price - second.price;
      if (sortBy === "price-high") return second.price - first.price;
      if (sortBy === "name") return first.name.localeCompare(second.name);
      if (sortBy === "newest") return new Date(second.created_at ?? 0) - new Date(first.created_at ?? 0);
      return Number(second.quantity_sold ?? 0) - Number(first.quantity_sold ?? 0);
    });
  });

  // Small insights from data the page already receives
  let activeOrders = $derived(orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length);
  let totalSpent = $derived(orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total_amount || 0), 0));
  let firstName = $derived((auth.user.full_name ?? "").trim().split(/\s+/)[0] || "there");
  let initials = $derived((auth.user.full_name ?? "?").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase());

  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });

  const progress = ["pending", "confirmed", "processing", "ready", "shipped", "delivered"];
  const badge = {
    pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800", processing: "bg-indigo-100 text-indigo-800",
    ready: "bg-teal-100 text-teal-800", shipped: "bg-sky-100 text-sky-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-700"
  };
  const badgeClass = (s) => badge[s] ?? "bg-slate-100 text-slate-700";

  const card = "rounded-2xl border border-[#e3ebe5] bg-white shadow-[0_8px_30px_-22px_rgba(24,69,42,.35)]";
  const btnPrimary = "rounded-xl bg-[#176b3b] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b482b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b3b] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none";
  const field = "w-full rounded-xl border border-[#d6e0d8] bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#438150] focus:outline-none focus:ring-2 focus:ring-[#438150]/25";

  let tabs = $derived([
    { view: "marketplace", label: "Marketplace", icon: "▦", badge: cartItems.length || null },
    { view: "orders", label: "My orders", icon: "📦", count: orders.length },
    { view: "messages", label: "Messages", icon: "✉" },
    { view: "profile", label: "Account", icon: "♙" },
  ]);

  function resetFilters() {
    selectedCategory = "all";
    selectedFarm = "all";
    priceRange = "all";
    availability = "all";
    sortBy = "popular";
    productSearch = "";
  }

  function addToCart(product) {
    const current = Number(cart[product.id] ?? 0);
    cart[product.id] = Math.min(current + 1, product.quantity_remaining);
  }

  function closeProductDetails() {
    selectedProduct = null;
    const trigger = productTrigger;
    productTrigger = null;
    window.requestAnimationFrame(() => trigger?.focus());
  }

  function openProductDetails(product, event) {
    productTrigger = event.currentTarget;
    selectedProduct = product;
  }

  $effect(() => {
    if (selectedProduct && productDialog) {
      productDialog.focus();
    }
  });

  function setQuantity(product, value) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      delete cart[product.id];
      return;
    }
    cart[product.id] = Math.min(quantity, product.quantity_remaining);
  }

  function placeOrder() {
    orderForm.items = cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity }));
    orderForm.post("/dashboard/orders", {
      preserveScroll: true,
      onSuccess: () => {
        cart = {};
        orderForm.resetAndClearErrors();
        activeView = "orders";
      },
    });
  }

  let cancelling = $state({});

  function cancelOrder(order) {
    if (cancelling[order.id]) return; // ignore repeat clicks while a request is in flight
    cancelling[order.id] = true;
    router.post(`/dashboard/orders/${order.id}/cancel`, {}, {
      preserveScroll: true,
      onFinish: () => delete cancelling[order.id],
    });
  }

  function formatDate(value) {
    return value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value)) : "";
  }
</script>

<PortalLayout title="Customer dashboard" user={auth.user}>
  <section class="dashboard-shell mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
    <DashboardWelcome eyebrow="Customer portal" title={`Welcome back, ${firstName}`} description="Fresh produce sourced directly from trusted farms.">
      {#snippet children()}
        <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <button type="button" class="rounded-2xl border border-white/15 bg-white/[0.09] px-3.5 py-3 text-left backdrop-blur transition hover:bg-white/[0.15]" onclick={() => (activeView = "orders")}>
            <span class="block text-[11px] font-semibold uppercase tracking-wide text-green-50/70">Active orders</span>
            <span class="mt-1 block text-xl font-extrabold tabular-nums">{activeOrders}</span>
          </button>
          <div class="rounded-2xl border border-white/15 bg-white/[0.09] px-3.5 py-3 backdrop-blur">
            <span class="block text-[11px] font-semibold uppercase tracking-wide text-green-50/70">Total spent</span>
            <span class="mt-1 block truncate text-xl font-extrabold tabular-nums">{currency.format(totalSpent).replace(".00", "")}</span>
          </div>
          <button type="button" class="col-span-2 rounded-2xl border border-white/15 bg-white/[0.09] px-3.5 py-3 text-left backdrop-blur transition hover:bg-white/[0.15] sm:col-span-1" onclick={() => (activeView = "marketplace")}>
            <span class="block text-[11px] font-semibold uppercase tracking-wide text-green-50/70">Products</span>
            <span class="mt-1 block text-xl font-extrabold tabular-nums">{products.length}</span>
          </button>
        </div>
      {/snippet}
    </DashboardWelcome>

    <DashboardTabs tabs={tabs} activeView={activeView} onSelect={(view) => (activeView = view)} label="Customer dashboard sections" />

    <div class="min-w-0">

        {#if flash?.status}
          <p class="mb-5 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm font-medium text-green-900" role="status"><span aria-hidden="true">✓</span> {flash.status}</p>
        {/if}

        {#if activeView === "marketplace"}
          <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div class="min-w-0">
              <div class="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.14em] text-[#568268]">Marketplace</p>
                  <h2 class="mt-1 text-xl font-extrabold tracking-tight text-[#173f32] sm:text-2xl">Shop fresh from local farms</h2>
                </div>
                <p class="text-sm text-slate-500">{products.length} fresh product{products.length === 1 ? "" : "s"}</p>
              </div>

              <div class="mt-4 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filter by category">
                <button type="button" aria-pressed={selectedCategory === "all"} class={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === "all" ? "bg-[#176b4a] text-white shadow-sm" : "border border-[#dce7df] bg-white text-slate-600 hover:border-[#438150]"}`} onclick={() => (selectedCategory = "all")}>All products</button>
                {#each visibleCategories as category (category)}
                  <button type="button" aria-pressed={selectedCategory === category} class={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === category ? "bg-[#176b4a] text-white shadow-sm" : "border border-[#dce7df] bg-white text-slate-600 hover:border-[#438150]"}`} onclick={() => (selectedCategory = category)}>{category}</button>
                {/each}
                {#if moreCategories.length > 0}
                  <label class="sr-only" for="more-categories">More product categories</label>
                  <select id="more-categories" class={`${field} w-auto min-w-28 rounded-full py-2`} value={moreCategories.includes(selectedCategory) ? selectedCategory : "more"} onchange={(event) => {
                    if (event.currentTarget.value !== "more") selectedCategory = event.currentTarget.value;
                  }}>
                    <option value="more" disabled>More categories</option>
                    {#each moreCategories as category (category)}
                      <option value={category}>{category}</option>
                    {/each}
                  </select>
                {/if}
              </div>

              <div class="mt-2 grid gap-2 rounded-2xl border border-[#e3ebe5] bg-white p-3 sm:grid-cols-2 xl:grid-cols-4">
                <label class="min-w-0">
                  <span class="sr-only">Filter by farm</span>
                  <select bind:value={selectedFarm} aria-label="Filter by farm" class={`${field} py-2.5`}>
                    <option value="all">All farms</option>
                    {#each farms as farm (farm.id)}
                      <option value={farm.id}>{farm.name}</option>
                    {/each}
                  </select>
                </label>
                <label class="min-w-0">
                  <span class="sr-only">Filter by price range</span>
                  <select bind:value={priceRange} aria-label="Filter by price range" class={`${field} py-2.5`}>
                    <option value="all">Any price</option>
                    <option value="under-100">Under KSh 100</option>
                    <option value="100-500">KSh 100–500</option>
                    <option value="over-500">Over KSh 500</option>
                  </select>
                </label>
                <label class="min-w-0">
                  <span class="sr-only">Filter by availability</span>
                  <select bind:value={availability} aria-label="Filter by availability" class={`${field} py-2.5`}>
                    <option value="all">Any availability</option>
                    <option value="well-stocked">10+ available</option>
                    <option value="low-stock">Low stock (under 10)</option>
                  </select>
                </label>
                <label class="min-w-0">
                  <span class="sr-only">Sort products</span>
                  <select bind:value={sortBy} aria-label="Sort products" class={`${field} py-2.5`}>
                    <option value="popular">Most popular</option>
                    <option value="newest">Recently added</option>
                    <option value="price-low">Price: low to high</option>
                    <option value="price-high">Price: high to low</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </label>
              </div>

              <div class="relative mt-3">
                <svg class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
                <input bind:value={productSearch} type="search" aria-label="Search products, farms, or categories" placeholder="Search fresh produce, farms, or categories" class={`${field} py-3 pl-11`} />
              </div>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
                <p aria-live="polite">Showing {filteredProducts.length} of {products.length} products</p>
                {#if selectedCategory !== "all" || selectedFarm !== "all" || priceRange !== "all" || availability !== "all" || sortBy !== "popular" || productSearch}
                  <button type="button" class="font-semibold text-[#176b4a] hover:underline" onclick={resetFilters}>Clear filters</button>
                {/if}
              </div>

          {#if products.length === 0}
            <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center">
              <p class="font-semibold">No products are available right now.</p>
              <p class="mt-2 text-sm text-slate-600">Please check back soon.</p>
            </div>
          {:else if filteredProducts.length === 0}
            <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center">
              <p class="font-semibold text-[#173f32]">No products match these filters.</p>
              <p class="mt-1 text-sm text-slate-500">Try a different search or clear the selected filters.</p>
              <button type="button" class={`${btnPrimary} mt-4`} onclick={resetFilters}>Clear filters</button>
            </div>
          {:else}
            <div class="mt-3 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {#each filteredProducts as product (product.id)}
                {@const inBasket = Number(cart[product.id] ?? 0)}
                <article class={`${card} group overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl ${inBasket > 0 ? "ring-2 ring-[#176b3b]/40" : ""}`}>
                  <div class="relative overflow-hidden bg-[#edf4ee]">
                    {#if product.image}
                      <img src={product.image} alt={product.name} class="h-36 w-full object-cover transition duration-500 group-hover:scale-105 sm:h-40" loading="lazy" />
                    {:else}
                      <div class="flex h-36 items-center justify-center bg-gradient-to-br from-[#d8e9b8] to-[#9cc27a] text-5xl sm:h-40" aria-hidden="true">🌿</div>
                    {/if}
                    <span class="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#176b4a] shadow">✓ {product.farm_name ?? "Local farm"}</span>
                    {#if product.quantity_remaining <= 10}
                      <span class="absolute right-3 top-3 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950 shadow">Only {product.quantity_remaining} left</span>
                    {/if}
                  </div>
                  <div class="flex min-h-[230px] flex-col p-4">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="text-base font-extrabold text-[#1b3527]">
                        <button type="button" class="text-left hover:underline" onclick={(event) => openProductDetails(product, event)}>{product.name}</button>
                      </h3>
                      <span class="shrink-0 rounded-full bg-[#f0f6f1] px-2.5 py-1 text-[11px] font-semibold text-[#416650]">{product.category}</span>
                    </div>
                    <p class="mt-1 text-xs text-slate-500">{product.farm_name ?? "Local farm"}{product.producer_name ? ` · ${product.producer_name}` : ""}</p>
                    {#if product.farm_location || product.farm_county}
                      <p class="mt-1 text-xs text-slate-500">⌖ {[product.farm_location, product.farm_county].filter(Boolean).join(", ")}</p>
                    {/if}
                    {#if product.description}
                      <p class="mt-3 line-clamp-2 text-xs leading-5 text-slate-600">{product.description}</p>
                    {/if}
                    <div class="mt-auto pt-4">
                      <p class="text-lg font-extrabold text-[#173f2a]">{currency.format(product.price)} <span class="text-xs font-medium text-slate-500">/ {product.unit}</span></p>
                      <p class="mt-1 text-xs text-slate-500">{product.quantity_remaining} {product.unit} available</p>
                      <div class="mt-3 grid grid-cols-[auto_1fr] gap-2">
                        <button type="button" class="rounded-xl border border-[#d6e0d8] px-3 py-2 text-sm font-semibold text-[#315940] hover:bg-[#f4f8f5]" aria-label={`View details for ${product.name}`} onclick={(event) => openProductDetails(product, event)}>Details</button>
                        <button type="button" class={btnPrimary} disabled={inBasket >= product.quantity_remaining} onclick={() => addToCart(product)}>
                          {inBasket > 0 ? `In basket · Add more (${inBasket})` : "Add to basket"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Basket -->
        <aside class={`${card} p-4 xl:sticky xl:top-24`}>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold">Your basket</h2>
            <span class="rounded-full bg-[#edf5e7] px-3 py-1 text-xs font-bold text-[#176b3b]">{cartItems.length} item{cartItems.length === 1 ? "" : "s"}</span>
          </div>
          {#if orderForm.errors.items}
            <p class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{orderForm.errors.items}</p>
          {/if}
          {#if cartItems.length === 0}
            <div class="mt-5 rounded-xl bg-[#f4f8f5] p-8 text-center">
              <span class="mx-auto grid size-12 place-items-center rounded-full bg-[#e7f3df]" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#176b3b" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11h10.2L20 7H6.5M9 20h.01M17 20h.01" /></svg>
              </span>
              <p class="mt-3 font-semibold">Your basket is empty</p>
              <p class="mt-1 text-sm text-slate-500">Add products to start an order.</p>
            </div>
          {:else}
            <ul class="mt-3 divide-y divide-slate-100">
              {#each cartItems as item (item.id)}
                <li class="flex items-center gap-2.5 py-3">
                  {#if item.image}
                    <img src={item.image} alt="" class="size-14 shrink-0 rounded-xl object-cover" />
                  {:else}
                    <span class="grid size-14 shrink-0 place-items-center rounded-xl bg-[#edf5e7] text-xl" aria-hidden="true">🌿</span>
                  {/if}
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold">{item.name}</p>
                    <p class="truncate text-xs text-slate-500">{item.farm_name ?? "Local farm"}</p>
                    <p class="mt-1 text-xs font-semibold text-[#315940]">{currency.format(item.price)} / {item.unit}</p>
                  </div>
                  <div class="flex shrink-0 items-center rounded-full border border-[#e0e9e1]">
                    <button type="button" class="grid size-8 place-items-center rounded-full text-slate-600 hover:bg-[#f1f6f1]" aria-label={`Remove one ${item.name}`} onclick={() => setQuantity(item, Number(cart[item.id]) - 1)}>−</button>
                    <input aria-label={`Quantity of ${item.name}`} class="w-9 border-0 bg-transparent p-0 text-center text-xs font-semibold focus:outline-none focus:ring-0" type="number" min="0.01" step="0.01" max={item.quantity_remaining} value={item.quantity} onchange={(event) => setQuantity(item, event.currentTarget.value)} />
                    <button type="button" class="grid size-8 place-items-center rounded-full text-slate-600 hover:bg-[#f1f6f1] disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Add one ${item.name}`} disabled={item.quantity >= item.quantity_remaining} onclick={() => addToCart(item)}>+</button>
                  </div>
                </li>
              {/each}
            </ul>
            <div class="mt-3 border-t border-slate-200 pt-4">
              <div class="flex items-center justify-between gap-2"><span class="text-sm font-semibold text-slate-600">Subtotal</span><span class="text-sm font-semibold text-[#173f2a]">{currency.format(cartTotal)}</span></div>
              <div class="mt-2 flex items-center justify-between gap-2"><span class="text-sm font-semibold text-slate-600">Delivery fee</span><span class="text-sm font-semibold text-[#173f2a]">Calculated after ordering</span></div>
              <div class="mt-3 flex items-center justify-between gap-2 border-t border-slate-200 pt-3"><span class="font-bold text-[#173f2a]">Estimated total</span><span class="text-xl font-extrabold text-[#173f2a]">{currency.format(cartTotal)}</span></div>
              <label for="delivery-address" class="mt-5 block text-sm font-semibold">Delivery address</label>
              <textarea id="delivery-address" bind:value={orderForm.delivery_address} rows="3" maxlength="255" class={`${field} mt-1.5`} placeholder="Street, area, county" required aria-invalid={orderForm.errors.delivery_address ? "true" : undefined} aria-describedby={orderForm.errors.delivery_address ? "delivery-address-error" : undefined}></textarea>
              {#if orderForm.errors.delivery_address}
                <p id="delivery-address-error" class="mt-1 text-sm text-red-700" role="alert">{orderForm.errors.delivery_address}</p>
              {/if}
              <button type="button" class={`${btnPrimary} mt-4 w-full py-3.5 text-base`} disabled={!orderForm.delivery_address.trim() || orderForm.processing} onclick={placeOrder}>{orderForm.processing ? "Placing order…" : "Place order"}</button>
              <p class="mt-3 text-center text-xs text-slate-500">You can cancel until the farmer starts preparing it.</p>
            </div>
          {/if}
        </aside>
      </div>
    {:else if activeView === "orders"}
      <section class="mt-8" aria-labelledby="orders-title">
        <h2 id="orders-title" class="text-2xl font-bold tracking-tight">Your orders</h2>
        <p class="mt-1 text-sm text-slate-500">Track every order from the farm to your door.</p>
        {#if orders.length === 0}
          <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center">
            <p class="font-semibold">You have not placed an order yet.</p>
            <button type="button" class={`${btnPrimary} mt-5`} onclick={() => (activeView = "marketplace")}>Browse the marketplace</button>
          </div>
        {:else}
          <div class="mt-5 space-y-5">
            {#each orders as order (order.id)}
              {@const step = progress.indexOf(order.status)}
              <article class={`${card} p-6`}>
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 class="text-lg font-bold">Order #{order.id}</h3>
                    <p class="mt-1 text-sm text-slate-500">Placed {formatDate(order.created_at)} · {order.delivery_address}</p>
                  </div>
                  <span class={`rounded-full px-3 py-1 text-sm font-bold capitalize ${badgeClass(order.status)}`}>{order.status}</span>
                </div>

                {#if order.status !== "cancelled"}
                  <ol class="mt-5 grid grid-cols-6 gap-1" aria-label="Order progress">
                    {#each progress as p, i}
                      <li class="text-center">
                        <span class={`block h-1.5 rounded-full ${i <= step ? "bg-[#176b3b]" : "bg-slate-200"}`}></span>
                        <span class={`mt-1.5 block text-[11px] font-semibold capitalize ${i <= step ? "text-[#176b3b]" : "text-slate-400"}`}>{p}</span>
                      </li>
                    {/each}
                  </ol>
                {/if}

                <ul class="mt-5 divide-y divide-slate-100 rounded-xl bg-[#f8faf7] px-4">
                  {#each order.items as item}
                    <li class="flex flex-wrap justify-between gap-2 py-3 text-sm">
                      <span>{item.quantity} {item.unit} · {item.name}<span class="text-slate-500">{item.farm_name ? ` from ${item.farm_name}` : ""}</span></span>
                      <span class="font-semibold">{currency.format(item.subtotal)}</span>
                    </li>
                  {/each}
                </ul>
                <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p class="font-bold">Total <span class="ml-2 text-xl font-extrabold text-[#173f2a]">{currency.format(order.total_amount)}</span></p>
                  {#if ["pending", "confirmed", "processing"].includes(order.status)}
                    <button type="button" class="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60" disabled={cancelling[order.id]} onclick={() => cancelOrder(order)}>{cancelling[order.id] ? "Cancelling…" : "Cancel order"}</button>
                  {/if}
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </section>
    {:else if activeView === "profile"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">My profile</h2>
        <article class={`${card} mt-5 max-w-2xl overflow-hidden`}>
          <div class="h-24 bg-gradient-to-r from-[#0e3020] to-[#1f6b43]"></div>
          <div class="px-6 pb-6">
            <div class="-mt-10 flex items-end gap-4">
              <div class="grid size-20 place-items-center rounded-full border-4 border-white bg-[#d8e9b8] text-xl font-extrabold text-[#173f2a]">{initials}</div>
              <div class="pb-1"><h3 class="text-lg font-bold">{auth.user.full_name}</h3><p class="text-sm text-slate-500">Customer account</p></div>
            </div>
            <dl class="mt-6 grid gap-3 sm:grid-cols-2">
              {#each [["Email", auth.user.email], ["Phone", auth.user.phone ?? "Not provided"], ["Account type", auth.user.role], ["Account status", auth.user.status]] as [label, value]}
                <div class="rounded-xl bg-[#f4f8f5] p-4"><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd class={`mt-1 break-words font-semibold ${label.startsWith("Account") ? "capitalize" : ""}`}>{value}</dd></div>
              {/each}
            </dl>
          </div>
        </article>
      </section>
    {:else}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Messages with producers</h2>
        <p class="mb-5 mt-1 text-sm text-slate-500">Ask a farmer about their harvest or an order.</p>
        <MessageInbox user={auth.user} {producers} {conversations} {errors} />
      </section>
    {/if}
    </div>
  </section>
  {#if selectedProduct}
    <dialog
      bind:this={productDialog}
      open
      aria-labelledby="product-dialog-title"
      onkeydown={(event) => {
        if (event.key === "Escape") {
          closeProductDetails();
        }
      }}
      class="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center overflow-y-auto border-0 bg-black/60 p-4 backdrop:bg-transparent"
    >
      <section class="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div class="relative bg-[#edf4ee]">
          {#if selectedProduct.image}
            <img src={selectedProduct.image} alt={selectedProduct.name} class="h-56 w-full object-cover sm:h-72" />
          {:else}
            <div class="grid h-56 place-items-center bg-gradient-to-br from-[#d8e9b8] to-[#9cc27a] text-6xl sm:h-72" aria-hidden="true">🌿</div>
          {/if}
          <button type="button" class="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/95 text-xl font-bold text-[#173f2a] shadow" aria-label="Close product details" onclick={closeProductDetails}>×</button>
        </div>
        <div class="p-6 sm:p-8">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-[#568268]">{selectedProduct.category}</p>
              <h2 id="product-dialog-title" class="mt-2 text-2xl font-extrabold text-[#173f2a]">{selectedProduct.name}</h2>
            </div>
            <span class="rounded-full bg-[#f0f6f1] px-3 py-1 text-sm font-semibold text-[#416650]">{selectedProduct.quantity_remaining} {selectedProduct.unit} available</span>
          </div>
          <p class="mt-3 text-lg font-extrabold text-[#173f2a]">{currency.format(selectedProduct.price)} <span class="text-sm font-medium text-slate-500">/ {selectedProduct.unit}</span></p>
          {#if selectedProduct.description}
            <p class="mt-4 whitespace-pre-line leading-7 text-slate-600">{selectedProduct.description}</p>
          {/if}
          <dl class="mt-5 grid gap-3 rounded-2xl bg-[#f4f8f5] p-4 text-sm sm:grid-cols-2">
            <div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Farm</dt><dd class="mt-1 font-semibold text-[#173f2a]">{selectedProduct.farm_name ?? "Local farm"}</dd></div>
            <div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Producer</dt><dd class="mt-1 font-semibold text-[#173f2a]">{selectedProduct.producer_name ?? "Local producer"}</dd></div>
            {#if selectedProduct.farm_location || selectedProduct.farm_county}
              <div class="sm:col-span-2"><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</dt><dd class="mt-1 font-semibold text-[#173f2a]">{[selectedProduct.farm_location, selectedProduct.farm_county].filter(Boolean).join(", ")}</dd></div>
            {/if}
          </dl>
          <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" class="rounded-xl border border-[#d6e0d8] px-5 py-3 text-sm font-semibold text-[#315940] hover:bg-[#f4f8f5]" onclick={closeProductDetails}>Continue browsing</button>
            <button
              type="button"
              class={btnPrimary}
              disabled={Number(cart[selectedProduct.id] ?? 0) >= selectedProduct.quantity_remaining}
              onclick={() => addToCart(selectedProduct)}
            >
              {Number(cart[selectedProduct.id] ?? 0) > 0 ? "Add one more to basket" : "Add to basket"}
            </button>
          </div>
        </div>
      </section>
    </dialog>
  {/if}
</PortalLayout>
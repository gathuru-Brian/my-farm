<script>
  import { router } from "@inertiajs/svelte";
  import MessageInbox from "../../components/MessageInbox.svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { auth, products = [], orders = [], producers = [], conversations = [], flash, errors = {} } = $props();
  let activeView = $state("marketplace");
  let selectedCategory = $state("all");
  let productSearch = $state("");
  let cart = $state({});
  let deliveryAddress = $state("");
  let cartItems = $derived(products
    .filter((product) => Number(cart[product.id] ?? 0) > 0)
    .map((product) => ({ ...product, quantity: Number(cart[product.id]) })));
  let cartTotal = $derived(cartItems.reduce((total, item) => total + item.price * item.quantity, 0));
  let categories = $derived([...new Set(products.map((product) => product.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
  let filteredProducts = $derived(products.filter((product) => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const searchText = `${product.name} ${product.category} ${product.farm_name ?? ""} ${product.producer_name ?? ""}`.toLowerCase();
    return matchesCategory && searchText.includes(productSearch.trim().toLowerCase());
  }));

  // Small insights from data the page already receives
  let activeOrders = $derived(orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length);
  let totalSpent = $derived(orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total_amount || 0), 0));
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
    { view: "marketplace", label: "Marketplace", badge: cartItems.length || null },
    { view: "orders", label: "My orders", count: orders.length },
    { view: "messages", label: "Messages" },
    { view: "profile", label: "Profile" }
  ]);

  function addToCart(product) {
    const current = Number(cart[product.id] ?? 0);
    cart[product.id] = Math.min(current + 1, product.quantity_remaining);
  }

  function setQuantity(product, value) {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      delete cart[product.id];
      return;
    }
    cart[product.id] = Math.min(quantity, product.quantity_remaining);
  }

  function placeOrder() {
    router.post("/dashboard/orders", {
      items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity })),
      delivery_address: deliveryAddress,
    }, {
      preserveScroll: true,
      onSuccess: () => {
        cart = {};
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
  <section class="dashboard-shell mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
    <!-- Banner -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e3020] via-[#154a31] to-[#1f6b43] px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
      <div class="absolute -right-16 -top-24 size-80 rounded-full border border-white/10"></div>
      <div class="absolute right-2 -top-10 size-52 rounded-full border border-white/10"></div>
      <div class="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-[#d8e9b8]"><span class="size-1.5 rounded-full bg-[#c6df9e]"></span> CUSTOMER PORTAL</span>
          <h1 class="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome, {auth.user.full_name}</h1>
          <p class="mt-2 max-w-xl text-green-50/80">Fresh produce, ordered directly from local farms.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur"><p class="text-xs font-semibold text-green-100/80">Active orders</p><p class="text-2xl font-extrabold">{activeOrders}</p></div>
          <div class="rounded-2xl bg-white/10 px-5 py-3 backdrop-blur"><p class="text-xs font-semibold text-green-100/80">Total ordered</p><p class="text-2xl font-extrabold">{currency.format(totalSpent).replace(".00", "")}</p></div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <nav class="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#dce7df] bg-white p-1.5 shadow-sm" aria-label="Customer dashboard sections">
      {#each tabs as tab}
        <button type="button" aria-current={activeView === tab.view ? "page" : undefined}
          class={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeView === tab.view ? "bg-[#176b3b] text-white shadow-sm" : "text-slate-600 hover:bg-[#f1f6ef]"}`}
          onclick={() => (activeView = tab.view)}>
          {tab.label}
          {#if tab.badge}<span class="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950" aria-label={`${tab.badge} items in basket`}>{tab.badge}</span>{/if}
          {#if tab.count !== undefined}<span class={`rounded-full px-2 py-0.5 text-xs font-bold ${activeView === tab.view ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>{tab.count}</span>{/if}
        </button>
      {/each}
    </nav>

    {#if flash?.status}
      <p class="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm font-medium text-green-900" role="status"><span aria-hidden="true">✓</span> {flash.status}</p>
    {/if}

    {#if activeView === "marketplace"}
      <div class="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">Available from local farms</h2>
          <div class="relative mt-4">
            <svg class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
            <input bind:value={productSearch} type="search" aria-label="Search marketplace" placeholder="Search products, categories, or farms" class={`${field} py-3 pl-11`} />
          </div>
          <div class="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by category">
            <button type="button" aria-pressed={selectedCategory === "all"} class={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${selectedCategory === "all" ? "bg-[#176b3b] text-white" : "border border-[#d6e0d8] bg-white text-slate-600 hover:border-[#438150]"}`} onclick={() => (selectedCategory = "all")}>All</button>
            {#each categories as category (category)}
              <button type="button" aria-pressed={selectedCategory === category} class={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition ${selectedCategory === category ? "bg-[#176b3b] text-white" : "border border-[#d6e0d8] bg-white text-slate-600 hover:border-[#438150]"}`} onclick={() => (selectedCategory = category)}>{category}</button>
            {/each}
          </div>

          {#if products.length === 0}
            <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center">
              <p class="font-semibold">No products are available right now.</p>
              <p class="mt-2 text-sm text-slate-600">Please check back soon.</p>
            </div>
          {:else if filteredProducts.length === 0}
            <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">No products match these filters.</div>
          {:else}
            <p class="mt-4 text-sm text-slate-500">{filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}</p>
            <div class="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {#each filteredProducts as product (product.id)}
                {@const inBasket = Number(cart[product.id] ?? 0)}
                <article class={`${card} group overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl ${inBasket > 0 ? "ring-2 ring-[#176b3b]/40" : ""}`}>
                  <div class="relative overflow-hidden">
                    {#if product.image}
                      <img src={product.image} alt={product.name} class="h-44 w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
                    {:else}
                      <div class="flex h-44 items-center justify-center bg-gradient-to-br from-[#d8e9b8] to-[#9cc27a] text-5xl" aria-hidden="true">🌿</div>
                    {/if}
                    <span class="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#173f2a] shadow">{product.category}</span>
                    {#if product.quantity_remaining <= 10}
                      <span class="absolute right-3 top-3 rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950 shadow">Only {product.quantity_remaining} left</span>
                    {/if}
                  </div>
                  <div class="p-5">
                    <h3 class="text-lg font-bold text-[#1b3527]">{product.name}</h3>
                    <p class="mt-1 text-sm text-slate-500">{product.farm_name ?? "Local farm"}{product.producer_name ? ` · ${product.producer_name}` : ""}</p>
                    {#if product.description}
                      <p class="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p>
                    {/if}
                    <div class="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <p class="text-xl font-extrabold text-[#173f2a]">{currency.format(product.price)} <span class="text-sm font-medium text-slate-500">/ {product.unit}</span></p>
                        <p class="mt-1 text-xs text-slate-500">{product.quantity_remaining} {product.unit} available</p>
                      </div>
                      <button type="button" class={btnPrimary} disabled={inBasket >= product.quantity_remaining} onclick={() => addToCart(product)}>
                        {inBasket > 0 ? `Add more (${inBasket})` : "Add"}
                      </button>
                    </div>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Basket -->
        <aside class={`${card} p-6 lg:sticky lg:top-6`}>
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-bold">Your basket</h2>
            <span class="rounded-full bg-[#edf5e7] px-3 py-1 text-xs font-bold text-[#176b3b]">{cartItems.length} item{cartItems.length === 1 ? "" : "s"}</span>
          </div>
          {#if errors.items}
            <p class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{errors.items}</p>
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
            <ul class="mt-4 divide-y divide-slate-100">
              {#each cartItems as item (item.id)}
                <li class="flex items-center gap-3 py-3.5">
                  {#if item.image}
                    <img src={item.image} alt="" class="size-12 shrink-0 rounded-xl object-cover" />
                  {:else}
                    <span class="grid size-12 shrink-0 place-items-center rounded-xl bg-[#edf5e7] text-xl" aria-hidden="true">🌿</span>
                  {/if}
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-semibold">{item.name}</p>
                    <p class="text-xs text-slate-500">{currency.format(item.price)} / {item.unit}</p>
                    <button type="button" class="mt-1 text-xs font-semibold text-red-700 hover:underline" onclick={() => setQuantity(item, 0)}>Remove</button>
                  </div>
                  <input aria-label={`Quantity of ${item.name}`} class="w-20 rounded-xl border border-[#d6e0d8] px-2 py-2 text-right text-sm focus:border-[#438150] focus:outline-none focus:ring-2 focus:ring-[#438150]/25" type="number" min="0.01" step="0.01" max={item.quantity_remaining} value={item.quantity} onchange={(event) => setQuantity(item, event.currentTarget.value)} />
                </li>
              {/each}
            </ul>
            <div class="mt-3 border-t border-slate-200 pt-4">
              <div class="flex items-center justify-between"><span class="font-semibold text-slate-600">Estimated total</span><span class="text-2xl font-extrabold text-[#173f2a]">{currency.format(cartTotal)}</span></div>
              <label for="delivery-address" class="mt-5 block text-sm font-semibold">Delivery address</label>
              <textarea id="delivery-address" bind:value={deliveryAddress} rows="3" maxlength="255" class={`${field} mt-1.5`} placeholder="Street, area, county" required></textarea>
              {#if errors.delivery_address}
                <p class="mt-1 text-sm text-red-700" role="alert">{errors.delivery_address}</p>
              {/if}
              <button type="button" class={`${btnPrimary} mt-4 w-full py-3.5 text-base`} disabled={!deliveryAddress.trim()} onclick={placeOrder}>Place order</button>
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
  </section>
</PortalLayout>
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

  const currency = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  });

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

  function cancelOrder(order) {
    router.post(`/dashboard/orders/${order.id}/cancel`, {}, { preserveScroll: true });
  }

  function formatDate(value) {
    return value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value)) : "";
  }
</script>

<PortalLayout title="Customer dashboard" user={auth.user}>
  <section class="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Customer portal</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">Welcome, {auth.user.full_name}</h1>
        <p class="mt-2 text-slate-600">Fresh produce, ordered directly from local farms.</p>
      </div>
      <div class="flex rounded-xl border border-[#dce7df] bg-white p-1" aria-label="Customer dashboard sections">
        <button type="button" class={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === "marketplace" ? "bg-[#176b3b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onclick={() => activeView = "marketplace"}>
          Marketplace
        </button>
        <button type="button" class={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === "orders" ? "bg-[#176b3b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onclick={() => activeView = "orders"}>
          My orders <span class="ml-1 opacity-80">{orders.length}</span>
        </button>
        <button type="button" class={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === "messages" ? "bg-[#176b3b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onclick={() => activeView = "messages"}>
          Messages
        </button>
        <button type="button" class={`rounded-lg px-4 py-2 text-sm font-semibold ${activeView === "profile" ? "bg-[#176b3b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onclick={() => activeView = "profile"}>
          Profile
        </button>
      </div>
    </div>

    {#if flash?.status}
      <p class="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900" role="status">{flash.status}</p>
    {/if}

    {#if activeView === "marketplace"}
      <div class="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <h2 class="text-xl font-bold">Available from local farms</h2>
          <div class="mt-4 flex flex-wrap items-center gap-2">
            <input bind:value={productSearch} type="search" aria-label="Search marketplace" placeholder="Search products, categories, or farms" class="min-w-56 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" class={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedCategory === "all" ? "bg-[#176b3b] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`} onclick={() => selectedCategory = "all"}>All</button>
            {#each categories as category (category)}
              <button type="button" class={`rounded-lg px-3 py-2 text-sm font-semibold ${selectedCategory === category ? "bg-[#176b3b] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`} onclick={() => selectedCategory = category}>{category}</button>
            {/each}
          </div>
          {#if products.length === 0}
            <div class="mt-4 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center">
              <p class="font-semibold">No products are available right now.</p>
              <p class="mt-2 text-sm text-slate-600">Please check back soon.</p>
            </div>
          {:else}
            {#if filteredProducts.length === 0}
              <div class="mt-4 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-8 text-center text-sm text-slate-600">No products match these filters.</div>
            {:else}
              <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {#each filteredProducts as product (product.id)}
                <article class="overflow-hidden rounded-2xl border border-[#e3ebe5] bg-white shadow-sm">
                  {#if product.image}
                    <img src={product.image} alt={product.name} class="h-40 w-full object-cover" loading="lazy" />
                  {:else}
                    <div class="flex h-40 items-center justify-center bg-[#edf5ed] text-4xl" aria-hidden="true">🌿</div>
                  {/if}
                  <div class="p-5">
                    <p class="text-xs font-bold uppercase tracking-wide text-[#438150]">{product.category}</p>
                    <h3 class="mt-1 text-lg font-bold">{product.name}</h3>
                    <p class="mt-1 text-sm text-slate-600">{product.farm_name ?? "Local farm"}{product.producer_name ? ` · ${product.producer_name}` : ""}</p>
                    {#if product.description}
                      <p class="mt-3 line-clamp-2 text-sm text-slate-600">{product.description}</p>
                    {/if}
                    <div class="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p class="font-bold text-[#173f2a]">{currency.format(product.price)} <span class="text-sm font-medium text-slate-500">/ {product.unit}</span></p>
                        <p class="mt-1 text-xs text-slate-500">{product.quantity_remaining} {product.unit} available</p>
                      </div>
                      <button type="button" class="rounded-lg bg-[#176b3b] px-3 py-2 text-sm font-bold text-white hover:bg-[#0b482b] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={Number(cart[product.id] ?? 0) >= product.quantity_remaining} onclick={() => addToCart(product)}>
                        Add
                      </button>
                    </div>
                  </div>
                </article>
              {/each}
              </div>
            {/if}
          {/if}
        </div>

        <aside class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h2 class="text-lg font-bold">Your basket <span class="text-sm font-medium text-slate-500">({cartItems.length})</span></h2>
          {#if errors.items}
            <p class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{errors.items}</p>
          {/if}
          {#if cartItems.length === 0}
            <p class="mt-3 text-sm text-slate-600">Add products to start an order.</p>
          {:else}
            <ul class="mt-4 divide-y divide-slate-100">
              {#each cartItems as item (item.id)}
                <li class="flex items-center justify-between gap-3 py-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold">{item.name}</p>
                    <p class="text-xs text-slate-500">{currency.format(item.price)} / {item.unit}</p>
                  </div>
                  <input aria-label={`Quantity of ${item.name}`} class="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm" type="number" min="0.01" step="0.01" max={item.quantity_remaining} value={item.quantity} onchange={(event) => setQuantity(item, event.currentTarget.value)} />
                </li>
              {/each}
            </ul>
            <div class="mt-3 border-t border-slate-200 pt-4">
              <div class="flex justify-between font-bold"><span>Estimated total</span><span>{currency.format(cartTotal)}</span></div>
              <label for="delivery-address" class="mt-4 block text-sm font-semibold">Delivery address</label>
              <textarea id="delivery-address" bind:value={deliveryAddress} rows="3" maxlength="255" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#176b3b] focus:outline-none focus:ring-2 focus:ring-[#176b3b]/20" placeholder="Street, area, county" required></textarea>
              {#if errors.delivery_address}
                <p class="mt-1 text-sm text-red-700" role="alert">{errors.delivery_address}</p>
              {/if}
              <button type="button" class="mt-4 w-full rounded-xl bg-[#176b3b] px-4 py-3 font-bold text-white hover:bg-[#0b482b] disabled:cursor-not-allowed disabled:bg-slate-300" disabled={!deliveryAddress.trim()} onclick={placeOrder}>
                Place order
              </button>
            </div>
          {/if}
        </aside>
      </div>
    {:else if activeView === "orders"}
      <section class="mt-8" aria-labelledby="orders-title">
        <h2 id="orders-title" class="text-xl font-bold">Your orders</h2>
        {#if orders.length === 0}
          <div class="mt-4 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center">
            <p class="font-semibold">You have not placed an order yet.</p>
            <button type="button" class="mt-4 font-bold text-[#176b3b] hover:underline" onclick={() => activeView = "marketplace"}>Browse the marketplace</button>
          </div>
        {:else}
          <div class="mt-4 space-y-4">
            {#each orders as order (order.id)}
              <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 class="font-bold">Order #{order.id}</h3>
                    <p class="mt-1 text-sm text-slate-500">Placed {formatDate(order.created_at)} · {order.delivery_address}</p>
                  </div>
                  <span class="rounded-full bg-[#edf5ed] px-3 py-1 text-sm font-bold capitalize text-[#176b3b]">{order.status}</span>
                </div>
                <ul class="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                  {#each order.items as item}
                    <li class="flex flex-wrap justify-between gap-2 py-3 text-sm">
                      <span>{item.quantity} {item.unit} · {item.name}<span class="text-slate-500">{item.farm_name ? ` from ${item.farm_name}` : ""}</span></span>
                      <span class="font-semibold">{currency.format(item.subtotal)}</span>
                    </li>
                  {/each}
                </ul>
                <div class="flex justify-between border-t border-slate-100 pt-3 font-bold"><span>Total</span><span>{currency.format(order.total_amount)}</span></div>
                {#if ["pending", "confirmed", "processing"].includes(order.status)}
                  <div class="mt-4 flex justify-end">
                    <button type="button" class="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onclick={() => cancelOrder(order)}>Cancel order</button>
                  </div>
                {/if}
              </article>
            {/each}
          </div>
        {/if}
      </section>
    {:else if activeView === "profile"}
      <section class="mt-8">
        <h2 class="text-xl font-bold">My profile</h2>
        <article class="mt-4 max-w-2xl rounded-2xl border border-[#e3ebe5] bg-white p-6 shadow-sm">
          <div class="flex items-center gap-4"><div class="grid h-14 w-14 place-items-center rounded-full bg-[#edf5ed] text-lg font-bold text-[#176b3b]">{auth.user.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div><h3 class="font-bold">{auth.user.full_name}</h3><p class="text-sm text-slate-500">Customer account</p></div></div>
          <dl class="mt-6 grid gap-4 sm:grid-cols-2"><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd class="mt-1 font-medium">{auth.user.email}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt><dd class="mt-1 font-medium">{auth.user.phone ?? "Not provided"}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Account type</dt><dd class="mt-1 font-medium capitalize">{auth.user.role}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Account status</dt><dd class="mt-1 font-medium capitalize">{auth.user.status}</dd></div></dl>
        </article>
      </section>
    {:else}
      <section class="mt-8">
        <h2 class="mb-4 text-xl font-bold">Messages with producers</h2>
        <MessageInbox user={auth.user} {producers} {conversations} {errors} />
      </section>
    {/if}
  </section>
</PortalLayout>

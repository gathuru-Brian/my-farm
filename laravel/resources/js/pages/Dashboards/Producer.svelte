<script>
  import { router } from "@inertiajs/svelte";
  import MessageInbox from "../../components/MessageInbox.svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { auth, farms = [], products = [], orders = [], customers = [], conversations = [], stats = {}, flash, errors = {} } = $props();
  let activeView = $state("overview");
  let farmForm = $state({ farm_name: "", location: "", county: "", description: "" });
  let editingFarmId = $state(null);
  let farmEditForm = $state({ farm_name: "", location: "", county: "", description: "", farm_size: "", farm_size_unit: "acres", phone: "", email: "", status: "active" });
  let productForm = $state({ farm_id: "", name: "", category: "", description: "", price: "", unit: "kg", quantity_posted: "" });
  let editingProductId = $state(null);
  let inventoryForm = $state({ price: "", quantity_posted: "", status: "available" });
  let autoRefresh = $state(typeof window !== "undefined" && window.localStorage.getItem("modern-farms-producer-auto-refresh") === "true");

  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });
  const quantityFormat = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 });
  const nextStatuses = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["ready", "cancelled"],
    ready: ["shipped", "cancelled"],
    shipped: ["delivered"],
  };

  $effect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem("modern-farms-producer-auto-refresh", String(autoRefresh));
    if (!autoRefresh || auth.user.status !== "active") return;

    const interval = window.setInterval(() => {
      router.reload({ preserveState: true, preserveScroll: true });
    }, 60000);

    return () => window.clearInterval(interval);
  });

  function saveFarm(event) {
    event.preventDefault();
    router.post("/dashboard/farms", farmForm, {
      preserveScroll: true,
      onSuccess: () => {
        farmForm = { farm_name: "", location: "", county: "", description: "" };
        productForm.farm_id = farms[0]?.id ?? "";
      },
    });
  }

  function startEditingFarm(farm) {
    editingFarmId = farm.id;
    farmEditForm = {
      farm_name: farm.farm_name,
      location: farm.location ?? "",
      county: farm.county ?? "",
      description: farm.description ?? "",
      farm_size: farm.farm_size ?? "",
      farm_size_unit: farm.farm_size_unit ?? "acres",
      phone: farm.phone ?? "",
      email: farm.email ?? "",
      status: farm.status,
    };
  }

  function saveFarmEdit(event, farm) {
    event.preventDefault();
    router.put(`/dashboard/farms/${farm.id}`, farmEditForm, {
      preserveScroll: true,
      onSuccess: () => { editingFarmId = null; },
    });
  }

  function saveProduct(event) {
    event.preventDefault();
    productForm.farm_id ||= farms[0]?.id ?? "";
    router.post("/dashboard/products", productForm, {
      preserveScroll: true,
      onSuccess: () => {
        productForm = { farm_id: "", name: "", category: "", description: "", price: "", unit: "kg", quantity_posted: "" };
      },
    });
  }

  function startEditingProduct(product) {
    editingProductId = product.id;
    inventoryForm = {
      price: product.price,
      quantity_posted: product.quantity_posted,
      status: product.status === "inactive" ? "inactive" : "available",
    };
  }

  function saveInventory(product) {
    router.put(`/dashboard/products/${product.id}`, inventoryForm, {
      preserveScroll: true,
      onSuccess: () => { editingProductId = null; },
    });
  }

  function setOrderStatus(order, status) {
    router.post(`/dashboard/orders/${order.id}/status`, { status }, { preserveScroll: true });
  }

  function formatDate(value) {
    return value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value)) : "";
  }
</script>

<PortalLayout title="Producer dashboard" user={auth.user}>
  <section class="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Producer portal</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">Welcome, {auth.user.full_name}</h1>
        <p class="mt-2 text-slate-600">Manage your farms, products, inventory, and customer orders.</p>
      </div>
      {#if auth.user.status === "active"}
        <nav class="flex flex-wrap rounded-xl border border-[#dce7df] bg-white p-1" aria-label="Producer dashboard sections">
          {#each [["overview", "Overview"], ["farms", "Farms"], ["inventory", "Inventory"], ["orders", `Orders (${stats.orders ?? orders.length})`], ["customers", "Customers"], ["analytics", "Analytics"], ["messages", "Messages"], ["profile", "Profile"], ["settings", "Settings"]] as [view, label]}
            <button type="button" class={`rounded-lg px-3 py-2 text-sm font-semibold ${activeView === view ? "bg-[#176b3b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onclick={() => activeView = view}>{label}</button>
          {/each}
        </nav>
      {/if}
    </div>

    {#if flash?.status}
      <p class="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900" role="status">{flash.status}</p>
    {/if}

    {#if auth.user.status !== "active"}
      <div class="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h2 class="text-lg font-bold">Your producer account is awaiting approval</h2>
        <p class="mt-2 text-sm leading-6">An administrator must approve your account before farm and inventory tools become available.</p>
      </div>
    {:else if activeView === "overview"}
      <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#each [["Products", stats.products ?? 0], ["Available inventory", `${stats.inventory ?? 0}`], ["Orders", stats.orders ?? 0], ["Pending orders", stats.pending_orders ?? 0]] as [label, value]}
          <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">{label}</p>
            <p class="mt-2 text-3xl font-bold text-[#173f2a]">{value}</p>
          </article>
        {/each}
      </div>
      <div class="mt-8 grid gap-6 lg:grid-cols-2">
        <article class="rounded-2xl border border-[#e3ebe5] bg-white p-6">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-bold">Your farms</h2>
            <button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => activeView = "farms"}>Manage farms</button>
          </div>
          {#if farms.length === 0}
            <p class="mt-4 text-sm text-slate-600">Add a farm to start listing products.</p>
          {:else}
            <ul class="mt-4 divide-y divide-slate-100">
              {#each farms.slice(0, 4) as farm (farm.id)}
                <li class="flex justify-between gap-3 py-3"><span class="font-semibold">{farm.farm_name}</span><span class="text-sm text-slate-500">{farm.products_count} products</span></li>
              {/each}
            </ul>
          {/if}
        </article>
        <article class="rounded-2xl border border-[#e3ebe5] bg-white p-6">
          <div class="flex items-center justify-between gap-4">
            <h2 class="text-lg font-bold">Recent orders</h2>
            <button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => activeView = "orders"}>View all</button>
          </div>
          {#if orders.length === 0}
            <p class="mt-4 text-sm text-slate-600">Customer orders will appear here.</p>
          {:else}
            <ul class="mt-4 divide-y divide-slate-100">
              {#each orders.slice(0, 5) as order (order.id)}
                <li class="flex justify-between gap-3 py-3"><span class="font-semibold">Order #{order.id} · {order.customer_name}</span><span class="text-sm capitalize text-slate-500">{order.status}</span></li>
              {/each}
            </ul>
          {/if}
        </article>
      </div>
    {:else if activeView === "farms"}
      <div class="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article class="rounded-2xl border border-[#e3ebe5] bg-white p-6">
          <h2 class="text-xl font-bold">Farm profiles</h2>
          {#if farms.length === 0}
            <p class="mt-3 text-sm text-slate-600">No farms added yet.</p>
          {:else}
            <div class="mt-4 space-y-3">
              {#each farms as farm (farm.id)}
                <div class="rounded-xl border border-slate-100 p-4">
                  {#if editingFarmId === farm.id}
                    <form onsubmit={(event) => saveFarmEdit(event, farm)} class="grid gap-3 sm:grid-cols-2">
                      <div><label for={`edit-farm-name-${farm.id}`} class="block text-sm font-semibold">Farm name</label><input id={`edit-farm-name-${farm.id}`} bind:value={farmEditForm.farm_name} required maxlength="150" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                      <div><label for={`edit-farm-location-${farm.id}`} class="block text-sm font-semibold">Location</label><input id={`edit-farm-location-${farm.id}`} bind:value={farmEditForm.location} class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                      <div><label for={`edit-farm-county-${farm.id}`} class="block text-sm font-semibold">County</label><input id={`edit-farm-county-${farm.id}`} bind:value={farmEditForm.county} class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                      <div><label for={`edit-farm-phone-${farm.id}`} class="block text-sm font-semibold">Phone</label><input id={`edit-farm-phone-${farm.id}`} bind:value={farmEditForm.phone} class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                      <div><label for={`edit-farm-email-${farm.id}`} class="block text-sm font-semibold">Email</label><input id={`edit-farm-email-${farm.id}`} bind:value={farmEditForm.email} type="email" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
                      <div class="grid grid-cols-2 gap-2"><div><label for={`edit-farm-size-${farm.id}`} class="block text-sm font-semibold">Size</label><input id={`edit-farm-size-${farm.id}`} bind:value={farmEditForm.farm_size} type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div><div><label for={`edit-farm-size-unit-${farm.id}`} class="block text-sm font-semibold">Unit</label><input id={`edit-farm-size-unit-${farm.id}`} bind:value={farmEditForm.farm_size_unit} class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div></div>
                      <div class="sm:col-span-2"><label for={`edit-farm-description-${farm.id}`} class="block text-sm font-semibold">Description</label><textarea id={`edit-farm-description-${farm.id}`} bind:value={farmEditForm.description} rows="2" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea></div>
                      <div><label for={`edit-farm-status-${farm.id}`} class="block text-sm font-semibold">Farm status</label><select id={`edit-farm-status-${farm.id}`} bind:value={farmEditForm.status} class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                      <div class="flex items-end gap-3"><button class="rounded-lg bg-[#176b3b] px-3 py-2 text-sm font-bold text-white">Save changes</button><button type="button" class="font-semibold text-slate-500" onclick={() => editingFarmId = null}>Cancel</button></div>
                    </form>
                  {:else}
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div><h3 class="font-bold">{farm.farm_name}</h3><p class="mt-1 text-sm text-slate-600">{[farm.location, farm.county].filter(Boolean).join(", ") || "Location not set"}</p></div>
                      <div class="flex items-center gap-3"><span class="rounded-full bg-[#edf5ed] px-3 py-1 text-xs font-bold capitalize text-[#176b3b]">{farm.status}</span><button type="button" class="text-sm font-semibold text-[#176b3b] hover:underline" onclick={() => startEditingFarm(farm)}>Edit</button></div>
                    </div>
                    {#if farm.description}<p class="mt-3 text-sm leading-6 text-slate-600">{farm.description}</p>{/if}
                    <p class="mt-3 text-xs text-slate-500">{farm.products_count} listed products{farm.farm_size ? ` · ${farm.farm_size} ${farm.farm_size_unit ?? "acres"}` : ""}</p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </article>
        <form onsubmit={saveFarm} class="rounded-2xl border border-[#e3ebe5] bg-white p-6">
          <h2 class="text-lg font-bold">Add a farm</h2>
          <label class="mt-4 block text-sm font-semibold" for="farm-name">Farm name</label>
          <input id="farm-name" bind:value={farmForm.farm_name} maxlength="150" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          {#if errors.farm_name}<p class="mt-1 text-sm text-red-700">{errors.farm_name}</p>{/if}
          <label class="mt-4 block text-sm font-semibold" for="farm-location">Location</label>
          <input id="farm-location" bind:value={farmForm.location} maxlength="200" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label class="mt-4 block text-sm font-semibold" for="farm-county">County</label>
          <input id="farm-county" bind:value={farmForm.county} maxlength="100" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label class="mt-4 block text-sm font-semibold" for="farm-description">Description</label>
          <textarea id="farm-description" bind:value={farmForm.description} rows="3" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea>
          <button class="mt-5 w-full rounded-xl bg-[#176b3b] px-4 py-3 font-bold text-white hover:bg-[#0b482b]">Save farm</button>
        </form>
      </div>
    {:else if activeView === "inventory"}
      <div class="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article class="overflow-hidden rounded-2xl border border-[#e3ebe5] bg-white">
          <div class="border-b border-slate-100 p-5"><h2 class="text-lg font-bold">Inventory</h2><p class="mt-1 text-sm text-slate-500">Update stock levels and marketplace availability.</p></div>
          {#if products.length === 0}
            <p class="p-6 text-sm text-slate-600">Add a farm before creating product listings.</p>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] text-left text-sm">
                <thead class="bg-[#f7faf7] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-5 py-3">Product</th><th class="px-5 py-3">Price</th><th class="px-5 py-3">Stock</th><th class="px-5 py-3">Status</th><th class="px-5 py-3">Action</th></tr></thead>
                <tbody class="divide-y divide-slate-100">
                  {#each products as product (product.id)}
                    <tr>
                      <td class="px-5 py-4"><p class="font-semibold">{product.name}</p><p class="text-xs text-slate-500">{product.farm_name} · {product.category}</p></td>
                      <td class="px-5 py-4">
                        {#if editingProductId === product.id}
                          <input aria-label={`Price for ${product.name}`} bind:value={inventoryForm.price} type="number" min="0" step="0.01" class="w-28 rounded border border-slate-300 px-2 py-1" />
                        {:else}
                          {currency.format(product.price)} / {product.unit}
                        {/if}
                      </td>
                      <td class="px-5 py-4">
                        {#if editingProductId === product.id}
                          <input aria-label={`Quantity for ${product.name}`} bind:value={inventoryForm.quantity_posted} type="number" min="0" step="0.01" class="w-24 rounded border border-slate-300 px-2 py-1" />
                        {:else}
                          {product.quantity_remaining} {product.unit}<p class="text-xs text-slate-500">{product.quantity_sold} sold</p>
                        {/if}
                      </td>
                      <td class="px-5 py-4">
                        {#if editingProductId === product.id}
                          <select bind:value={inventoryForm.status} aria-label={`Listing status for ${product.name}`} class="rounded border border-slate-300 px-2 py-1"><option value="available">Available</option><option value="inactive">Paused</option></select>
                        {:else}
                          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{product.status.replaceAll("_", " ")}</span>
                        {/if}
                      </td>
                      <td class="px-5 py-4">
                        {#if editingProductId === product.id}
                          <div class="flex gap-2"><button type="button" class="font-semibold text-[#176b3b] hover:underline" onclick={() => saveInventory(product)}>Save</button><button type="button" class="font-semibold text-slate-500 hover:underline" onclick={() => editingProductId = null}>Cancel</button></div>
                        {:else}
                          <button type="button" class="font-semibold text-[#176b3b] hover:underline" onclick={() => startEditingProduct(product)}>Edit stock</button>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </article>
        <form onsubmit={saveProduct} class="rounded-2xl border border-[#e3ebe5] bg-white p-6">
          <h2 class="text-lg font-bold">Add a product</h2>
          {#if farms.length === 0}
            <p class="mt-3 text-sm text-slate-600">Create a farm before adding products.</p>
          {:else}
            <label for="product-farm" class="mt-4 block text-sm font-semibold">Farm</label>
            <select id="product-farm" value={productForm.farm_id || farms[0]?.id || ""} onchange={(event) => productForm.farm_id = event.currentTarget.value} required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {#each farms as farm (farm.id)}<option value={farm.id}>{farm.farm_name}</option>{/each}
            </select>
            <label for="product-name" class="mt-4 block text-sm font-semibold">Product name</label>
            <input id="product-name" bind:value={productForm.name} maxlength="150" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            {#if errors.name}<p class="mt-1 text-sm text-red-700">{errors.name}</p>{/if}
            <label for="product-category" class="mt-4 block text-sm font-semibold">Category</label>
            <input id="product-category" bind:value={productForm.category} maxlength="100" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div><label for="product-price" class="block text-sm font-semibold">Price (KES)</label><input id="product-price" bind:value={productForm.price} type="number" min="0" step="0.01" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
              <div><label for="product-stock" class="block text-sm font-semibold">Quantity</label><input id="product-stock" bind:value={productForm.quantity_posted} type="number" min="0.01" step="0.01" required class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></div>
            </div>
            <label for="product-unit" class="mt-4 block text-sm font-semibold">Unit</label>
            <input id="product-unit" bind:value={productForm.unit} maxlength="50" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <label for="product-description" class="mt-4 block text-sm font-semibold">Description</label>
            <textarea id="product-description" bind:value={productForm.description} rows="3" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"></textarea>
            <button class="mt-5 w-full rounded-xl bg-[#176b3b] px-4 py-3 font-bold text-white hover:bg-[#0b482b]">Add to marketplace</button>
          {/if}
        </form>
      </div>
    {:else if activeView === "orders"}
      <section class="mt-8">
        <h2 class="text-xl font-bold">Customer orders</h2>
        {#if orders.length === 0}
          <div class="mt-4 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">Orders for your products will appear here.</div>
        {:else}
          <div class="mt-4 space-y-4">
            {#each orders as order (order.id)}
              <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div><h3 class="font-bold">Order #{order.id} · {order.customer_name ?? "Customer"}</h3><p class="mt-1 text-sm text-slate-500">{formatDate(order.created_at)} · {order.delivery_address}</p></div>
                  <div class="text-right"><span class="rounded-full bg-[#edf5ed] px-3 py-1 text-sm font-bold capitalize text-[#176b3b]">{order.status}</span><p class="mt-2 font-bold">{currency.format(order.total_amount)}</p></div>
                </div>
                <ul class="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {#each order.items as item}
                    <li class="flex justify-between gap-3 py-2 text-sm"><span>{item.quantity} {item.unit} · {item.name}</span><span class="font-semibold">{currency.format(item.subtotal)}</span></li>
                  {/each}
                </ul>
                {#if nextStatuses[order.status]}
                  <div class="mt-3 flex flex-wrap justify-end gap-2">
                    {#each nextStatuses[order.status] as status}
                      <button type="button" class={`rounded-lg px-3 py-2 text-sm font-semibold ${status === "cancelled" ? "border border-red-200 text-red-700 hover:bg-red-50" : "bg-[#176b3b] text-white hover:bg-[#0b482b]"}`} onclick={() => setOrderStatus(order, status)}>{status === "cancelled" ? "Cancel order" : `Mark ${status}`}</button>
                    {/each}
                  </div>
                {/if}
              </article>
            {/each}
          </div>
        {/if}
      </section>
    {:else if activeView === "customers"}
      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div><h2 class="text-xl font-bold">Your customers</h2><p class="mt-1 text-sm text-slate-600">Customers who have ordered from your farms.</p></div>
          <p class="rounded-full bg-[#edf5ed] px-3 py-1 text-sm font-bold text-[#176b3b]">{customers.length} unique {customers.length === 1 ? "customer" : "customers"}</p>
        </div>
        {#if customers.length === 0}
          <div class="mt-4 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">Customer information will appear here after your first order.</div>
        {:else}
          <div class="mt-4 overflow-x-auto rounded-2xl border border-[#e3ebe5] bg-white shadow-sm">
            <table class="w-full min-w-[650px] text-left text-sm">
              <thead class="bg-[#f7faf7] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-5 py-3">Customer</th><th class="px-5 py-3">Orders</th><th class="px-5 py-3">Order value</th></tr></thead>
              <tbody class="divide-y divide-slate-100">
                {#each customers as customer (customer.id)}
                  <tr><td class="px-5 py-4"><p class="font-semibold">{customer.name}</p><p class="text-xs text-slate-500">{customer.email ?? "Email not provided"}</p></td><td class="px-5 py-4">{customer.orders}</td><td class="px-5 py-4 font-semibold">{currency.format(customer.total_value)}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {:else if activeView === "analytics"}
      {@const comparisonMax = Math.max(stats.inventory_value ?? 0, stats.sold_value ?? 0, stats.revenue ?? 0, 1)}
      <section class="mt-8">
        <div><h2 class="text-xl font-bold">Farm analytics</h2><p class="mt-1 text-sm text-slate-600">Inventory, sales, revenue, and this month’s activity.</p></div>
        <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {#each [["Inventory value", currency.format(stats.inventory_value ?? 0)], ["Units sold", quantityFormat.format(stats.units_sold ?? 0)], ["Active products", stats.active_products ?? 0], ["Revenue", currency.format(stats.revenue ?? 0)]] as [label, value]}
            <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm"><p class="text-sm font-medium text-slate-500">{label}</p><p class="mt-2 text-2xl font-bold text-[#173f2a]">{value}</p></article>
          {/each}
        </div>
        <article class="mt-6 rounded-2xl border border-[#e3ebe5] bg-white p-6">
          <h3 class="font-bold">Sales performance</h3>
          <div class="mt-5 space-y-4">
            {#each [["Inventory", stats.inventory_value ?? 0], ["Sold", stats.sold_value ?? 0], ["Orders", stats.revenue ?? 0]] as [label, value]}
              <div class="grid grid-cols-[90px_minmax(0,1fr)_auto] items-center gap-3 text-sm"><span class="text-slate-600">{label}</span><div class="h-3 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full bg-[#438150]" style={`width:${Math.min(100, (value / comparisonMax) * 100)}%`}></div></div><strong>{currency.format(value)}</strong></div>
            {/each}
          </div>
        </article>
        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          {#each [["Products added", stats.month_products ?? 0], ["Orders this month", stats.month_orders ?? 0], ["Revenue this month", currency.format(stats.month_revenue ?? 0)]] as [label, value]}
            <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5"><p class="text-sm text-slate-500">{label}</p><p class="mt-2 text-xl font-bold text-[#173f2a]">{value}</p></article>
          {/each}
        </div>
      </section>
    {:else if activeView === "profile"}
      <section class="mt-8">
        <h2 class="text-xl font-bold">Producer profile</h2>
        <article class="mt-4 max-w-2xl rounded-2xl border border-[#e3ebe5] bg-white p-6 shadow-sm">
          <div class="flex items-center gap-4"><div class="grid h-14 w-14 place-items-center rounded-full bg-[#edf5ed] text-lg font-bold text-[#176b3b]">{auth.user.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div><div><h3 class="font-bold">{auth.user.full_name}</h3><p class="text-sm text-slate-500">Producer account</p></div></div>
          <dl class="mt-6 grid gap-4 sm:grid-cols-2"><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt><dd class="mt-1 font-medium">{auth.user.email}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt><dd class="mt-1 font-medium">{auth.user.phone ?? "Not provided"}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</dt><dd class="mt-1 font-medium capitalize">{auth.user.role}</dd></div><div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Account status</dt><dd class="mt-1 font-medium capitalize">{auth.user.status}</dd></div></dl>
        </article>
      </section>
    {:else if activeView === "settings"}
      <section class="mt-8">
        <h2 class="text-xl font-bold">Dashboard settings</h2>
        <article class="mt-4 max-w-2xl divide-y divide-slate-100 rounded-2xl border border-[#e3ebe5] bg-white px-5 shadow-sm">
          <label class="flex cursor-pointer items-center justify-between gap-5 py-5"><span><strong class="block">Auto-refresh dashboard</strong><span class="mt-1 block text-sm text-slate-500">Refresh orders and inventory every minute.</span></span><input type="checkbox" bind:checked={autoRefresh} class="h-5 w-5 accent-[#176b3b]" /></label>
          <div class="py-5"><strong class="block">Low inventory</strong><span class="mt-1 block text-sm text-slate-500">{products.filter((product) => product.status === "available" && product.quantity_remaining <= 5).length} listings have 5 or fewer units remaining.</span></div>
        </article>
      </section>
    {:else}
      <section class="mt-8">
        <h2 class="mb-4 text-xl font-bold">Messages with customers</h2>
        <MessageInbox user={auth.user} {conversations} {errors} />
      </section>
    {/if}
  </section>
</PortalLayout>

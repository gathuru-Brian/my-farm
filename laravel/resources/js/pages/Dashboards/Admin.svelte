<script>
  import { router } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { auth, stats = {}, producers = [], customers = [], products = [], orders = [], flash } = $props();
  let activeView = $state("overview");
  let productSearch = $state("");
  let producerSearch = $state("");
  let filteredProducts = $derived(products.filter((product) =>
    `${product.name} ${product.category} ${product.farm_name ?? ""} ${product.producer_name ?? ""}`.toLowerCase().includes(productSearch.trim().toLowerCase())));
  let filteredProducers = $derived(producers.filter((producer) =>
    `${producer.name} ${producer.email} ${producer.status}`.toLowerCase().includes(producerSearch.trim().toLowerCase())));

  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });
  const nextStatuses = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["ready", "cancelled"],
    ready: ["shipped", "cancelled"],
    shipped: ["delivered"],
  };

  function setProducerStatus(producer, status) {
    router.put(`/dashboard/admin/producers/${producer.id}/status`, { status }, { preserveScroll: true });
  }

  function setProductStatus(product, status) {
    router.put(`/dashboard/admin/products/${product.id}/status`, { status }, { preserveScroll: true });
  }

  function setOrderStatus(order, status) {
    router.put(`/dashboard/admin/orders/${order.id}/status`, { status }, { preserveScroll: true });
  }
</script>

<PortalLayout title="Admin dashboard" user={auth.user}>
  <section class="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div class="flex flex-wrap items-end justify-between gap-5">
      <div>
        <p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Administration</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">Platform overview</h1>
        <p class="mt-2 text-slate-600">Review producer applications and manage the Modern Farms marketplace.</p>
      </div>
      <nav class="flex flex-wrap rounded-xl border border-[#dce7df] bg-white p-1" aria-label="Admin dashboard sections">
        {#each [["overview", "Overview"], ["producers", `Producers (${stats.producers_pending ?? 0} pending)`], ["customers", "Customers"], ["orders", `Orders (${orders.length})`], ["products", "Products"]] as [view, label]}
          <button type="button" class={`rounded-lg px-3 py-2 text-sm font-semibold ${activeView === view ? "bg-[#176b3b] text-white" : "text-slate-600 hover:bg-slate-50"}`} onclick={() => activeView = view}>{label}</button>
        {/each}
      </nav>
    </div>

    {#if flash?.status}
      <p class="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-900" role="status">{flash.status}</p>
    {/if}

    {#if activeView === "overview"}
      <div class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#each [["Producers", stats.producers_total ?? 0], ["Awaiting approval", stats.producers_pending ?? 0], ["Customers", stats.customers ?? 0], ["Products", stats.products ?? 0], ["Available listings", stats.products_available ?? 0], ["Orders", stats.orders ?? 0]] as [label, value]}
          <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm">
            <p class="text-sm font-medium text-slate-500">{label}</p>
            <p class="mt-2 text-3xl font-bold text-[#173f2a]">{value}</p>
          </article>
        {/each}
      </div>
      <article class="mt-8 rounded-2xl border border-[#e3ebe5] bg-white p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div><h2 class="text-lg font-bold">Producer applications</h2><p class="mt-1 text-sm text-slate-500">Approve eligible producers to make their farms and products available.</p></div>
          <button type="button" class="font-bold text-[#176b3b] hover:underline" onclick={() => activeView = "producers"}>Manage producers</button>
        </div>
        {#if stats.producers_pending === 0}
          <p class="mt-4 text-sm text-slate-600">There are no pending producer applications.</p>
        {:else}
          <ul class="mt-4 divide-y divide-slate-100">
            {#each producers.filter((producer) => producer.status === "pending").slice(0, 5) as producer (producer.id)}
              <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p class="font-semibold">{producer.name}</p><p class="text-sm text-slate-500">{producer.email} · {producer.farms.length} farms</p></div>
                <button type="button" class="rounded-lg bg-[#176b3b] px-3 py-2 text-sm font-bold text-white hover:bg-[#0b482b]" onclick={() => setProducerStatus(producer, "approved")}>Approve</button>
              </li>
            {/each}
          </ul>
        {/if}
      </article>
    {:else if activeView === "producers"}
      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div><h2 class="text-xl font-bold">Producer accounts</h2><p class="mt-1 text-sm text-slate-500">Approve, reject, or suspend marketplace access.</p></div>
          <input bind:value={producerSearch} type="search" placeholder="Search producers" aria-label="Search producers" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-xs" />
        </div>
        <div class="mt-4 space-y-3">
          {#each filteredProducers as producer (producer.id)}
            <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 class="font-bold">{producer.name}</h3>
                  <p class="mt-1 text-sm text-slate-600">{producer.email}{producer.phone ? ` · ${producer.phone}` : ""}</p>
                  <p class="mt-1 text-xs text-slate-500">{producer.product_count} products across {producer.farms.length} farms</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold capitalize">{producer.status}</span>
                  {#if producer.status !== "active"}
                    <button type="button" class="rounded-lg bg-[#176b3b] px-3 py-2 text-sm font-bold text-white hover:bg-[#0b482b]" onclick={() => setProducerStatus(producer, "approved")}>Approve</button>
                  {/if}
                  {#if producer.status === "pending"}
                    <button type="button" class="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" onclick={() => setProducerStatus(producer, "rejected")}>Reject</button>
                  {:else if producer.status === "active"}
                    <button type="button" class="rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50" onclick={() => setProducerStatus(producer, "suspended")}>Suspend</button>
                  {/if}
                </div>
              </div>
              {#if producer.farms.length > 0}
                <div class="mt-4 flex flex-wrap gap-2">
                  {#each producer.farms as farm (farm.id)}<span class="rounded-lg bg-[#f4f8f5] px-3 py-2 text-xs text-slate-700">{farm.name} · {farm.products_count} products</span>{/each}
                </div>
              {/if}
            </article>
          {:else}
            <div class="rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">No matching producer accounts.</div>
          {/each}
        </div>
      </section>
    {:else if activeView === "customers"}
      <section class="mt-8">
        <h2 class="text-xl font-bold">Customers</h2>
        <div class="mt-4 overflow-x-auto rounded-2xl border border-[#e3ebe5] bg-white shadow-sm">
          <table class="w-full min-w-[700px] text-left text-sm">
            <thead class="bg-[#f7faf7] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-5 py-3">Customer</th><th class="px-5 py-3">Phone</th><th class="px-5 py-3">Orders</th><th class="px-5 py-3">Order value</th><th class="px-5 py-3">Joined</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              {#each customers as customer (customer.id)}
                <tr><td class="px-5 py-4"><p class="font-semibold">{customer.name}</p><p class="text-xs text-slate-500">{customer.email}</p></td><td class="px-5 py-4">{customer.phone ?? "—"}</td><td class="px-5 py-4">{customer.order_count}</td><td class="px-5 py-4">{currency.format(customer.total_spent)}</td><td class="px-5 py-4 text-slate-500">{customer.created_at ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(customer.created_at)) : "—"}</td></tr>
              {:else}
                <tr><td colspan="5" class="px-5 py-10 text-center text-slate-500">No customer accounts yet.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else if activeView === "orders"}
      <section class="mt-8">
        <h2 class="text-xl font-bold">Marketplace orders</h2>
        {#if orders.length === 0}
          <div class="mt-4 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">No orders have been placed yet.</div>
        {:else}
          <div class="mt-4 space-y-4">
            {#each orders as order (order.id)}
              <article class="rounded-2xl border border-[#e3ebe5] bg-white p-5 shadow-sm">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 class="font-bold">Order #{order.id} · {order.customer_name ?? "Customer"}</h3>
                    <p class="mt-1 text-sm text-slate-500">{order.customer_email ?? ""} · {order.delivery_address ?? "No delivery address"}</p>
                  </div>
                  <div class="text-right">
                    <span class="rounded-full bg-[#edf5ed] px-3 py-1 text-sm font-bold capitalize text-[#176b3b]">{order.status}</span>
                    <p class="mt-2 font-bold">{currency.format(order.total_amount)}</p>
                  </div>
                </div>
                <ul class="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                  {#each order.items as item}
                    <li class="flex justify-between gap-3 py-2 text-sm"><span>{item.quantity} {item.unit} · {item.name} <span class="text-slate-500">({item.farm_name ?? "Farm"})</span></span><span class="font-semibold">{currency.format(item.subtotal)}</span></li>
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
    {:else}
      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div><h2 class="text-xl font-bold">Marketplace products</h2><p class="mt-1 text-sm text-slate-500">Pause listings that should not be visible to customers.</p></div>
          <input bind:value={productSearch} type="search" placeholder="Search products, farms, or producers" aria-label="Search products" class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm sm:max-w-sm" />
        </div>
        <div class="mt-4 overflow-x-auto rounded-2xl border border-[#e3ebe5] bg-white shadow-sm">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="bg-[#f7faf7] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-5 py-3">Product</th><th class="px-5 py-3">Producer / farm</th><th class="px-5 py-3">Price</th><th class="px-5 py-3">Stock</th><th class="px-5 py-3">Status</th><th class="px-5 py-3">Action</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              {#each filteredProducts as product (product.id)}
                <tr>
                  <td class="px-5 py-4"><p class="font-semibold">{product.name}</p><p class="text-xs text-slate-500">{product.category}</p></td>
                  <td class="px-5 py-4">{product.producer_name ?? "—"}<p class="text-xs text-slate-500">{product.farm_name ?? "—"}</p></td>
                  <td class="px-5 py-4">{currency.format(product.price)} / {product.unit}</td>
                  <td class="px-5 py-4">{product.quantity_remaining} {product.unit}</td>
                  <td class="px-5 py-4"><span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize">{product.status.replaceAll("_", " ")}</span></td>
                  <td class="px-5 py-4">
                    {#if product.status === "available"}
                      <button type="button" class="font-semibold text-amber-800 hover:underline" onclick={() => setProductStatus(product, "inactive")}>Pause</button>
                    {:else if product.quantity_remaining > 0}
                      <button type="button" class="font-semibold text-[#176b3b] hover:underline" onclick={() => setProductStatus(product, "available")}>Restore</button>
                    {:else}
                      <span class="text-slate-400">No stock</span>
                    {/if}
                  </td>
                </tr>
              {:else}
                <tr><td colspan="6" class="px-5 py-10 text-center text-slate-500">No matching products.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  </section>
</PortalLayout>

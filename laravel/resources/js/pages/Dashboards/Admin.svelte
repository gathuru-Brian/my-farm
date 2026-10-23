<script>
  import { router } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { auth, stats = {}, producers = [], customers = [], products = [], orders = [], flash } = $props();
  let activeView = $state("overview");
  let productSearch = $state("");
  let producerSearch = $state("");
  let producerFilter = $state("all");
  let range = $state(7);
  let orderSearch = $state("");
  let orderFilter = $state("all");

  const DAY = 86400000;
  const orderStatuses = ["pending", "confirmed", "processing", "ready", "shipped", "delivered", "cancelled"];
  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 });
  const badge = {
    pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800", processing: "bg-indigo-100 text-indigo-800",
    ready: "bg-teal-100 text-teal-800", shipped: "bg-sky-100 text-sky-800", delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-700", active: "bg-green-100 text-green-800", approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-700", suspended: "bg-amber-100 text-amber-800", available: "bg-green-100 text-green-800",
    inactive: "bg-slate-200 text-slate-700", sold_out: "bg-red-100 text-red-700"
  };
  const bar = { pending: "bg-amber-400", confirmed: "bg-blue-400", processing: "bg-indigo-400", ready: "bg-teal-400", shipped: "bg-sky-400", delivered: "bg-green-500", cancelled: "bg-red-400" };
  const badgeClass = (s) => badge[s] ?? "bg-slate-100 text-slate-700";
  const avatarTones = ["bg-[#d8e9b8] text-[#173f2a]", "bg-blue-100 text-blue-800", "bg-amber-100 text-amber-800", "bg-teal-100 text-teal-800", "bg-indigo-100 text-indigo-800"];
  const tone = (i) => avatarTones[i % avatarTones.length];

  const icons = {
    leaf: "M12 21v-8m0 0c0-4 3-6 7-6 0 4-3 6-7 6zm0 0c0-3-2-5-6-5 0 3 2 5 6 5z",
    clock: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
    users: "M16 20v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1a4 4 0 00-3-3.9",
    box: "M4 8l8-4 8 4v8l-8 4-8-4V8zm0 0l8 4m0 0l8-4m-8 4v8",
    receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6",
    coin: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v10M9.5 9.8c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.6-1 1.4-2.5 1.6-2.5.6-2.5 1.6 1 1.6 2.5 1.6 2.5-.6 2.5-1.6"
  };

  const btnPrimary = "rounded-xl bg-[#176b3b] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b482b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b3b]";
  const btnDanger = "rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50";
  const btnWarn = "rounded-xl border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50";
  const searchBox = "w-full rounded-xl border border-[#d6e0d8] bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#438150] focus:outline-none focus:ring-2 focus:ring-[#438150]/25";
  const card = "rounded-2xl border border-[#e3ebe5] bg-white shadow-[0_8px_30px_-22px_rgba(24,69,42,.35)]";

  // Filters
  let filteredProducts = $derived(products.filter((product) =>
    `${product.name} ${product.category} ${product.farm_name ?? ""} ${product.producer_name ?? ""}`.toLowerCase().includes(productSearch.trim().toLowerCase())));
  let filteredProducers = $derived(producers.filter((producer) =>
    (producerFilter === "all" || producer.status === producerFilter) &&
    `${producer.name} ${producer.email} ${producer.status}`.toLowerCase().includes(producerSearch.trim().toLowerCase())));

  // Insights, all computed from props the page already receives
  let pendingProducers = $derived(producers.filter((p) => p.status === "pending"));
  let activeProducers = $derived(producers.filter((p) => p.status === "active").length);
  let suspendedProducers = $derived(producers.filter((p) => p.status === "suspended").length);
  let revenue = $derived(orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total_amount || 0), 0));
  let pendingOrders = $derived(orders.filter((o) => o.status === "pending").length);
  let recentOrders = $derived(orders.slice(0, 5));
  let lowStock = $derived(products.filter((p) => p.quantity_remaining > 0 && p.quantity_remaining <= 10).length);
  let outOfStock = $derived(products.filter((p) => p.quantity_remaining <= 0).length);
  let cancelledOrders = $derived(orders.filter((o) => o.status === "cancelled").length);
  let statusCounts = $derived(orderStatuses.map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length })));
  let maxCount = $derived(Math.max(1, ...statusCounts.map((s) => s.count)));

  // Time series: only drawn when orders carry a created_at date
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  let hasDates = $derived(orders.some((o) => o.created_at && !Number.isNaN(new Date(o.created_at).getTime())));
  let series = $derived.by(() => {
    const today = startOfDay(new Date());
    const pts = Array.from({ length: range }, (_, i) => ({ t: today - (range - 1 - i) * DAY, revenue: 0, orders: 0 }));
    for (const o of orders) {
      if (!o.created_at) continue;
      const p = pts.find((x) => x.t === startOfDay(o.created_at));
      if (p) { p.orders += 1; if (o.status !== "cancelled") p.revenue += Number(o.total_amount || 0); }
    }
    return pts;
  });
  let maxRev = $derived(Math.max(1, ...series.map((p) => p.revenue)));
  const px = (i, n) => 60 + (n < 2 ? 0 : (i * 560) / (n - 1));
  const py = (v, max) => 155 - (v / max) * 125;
  let linePoints = $derived(series.map((p, i) => `${px(i, series.length)},${py(p.revenue, maxRev)}`).join(" "));
  let areaPath = $derived(`M${px(0, series.length)},155 L${linePoints.replaceAll(" ", " L")} L${px(series.length - 1, series.length)},155 Z`);
  let peakIndex = $derived(series.reduce((best, p, i) => (p.revenue > series[best].revenue ? i : best), 0));
  let labelStep = $derived(Math.ceil(range / 7));
  const dayLabel = (t) => new Intl.DateTimeFormat("en-KE", range === 7 ? { weekday: "short" } : { day: "numeric", month: "short" }).format(new Date(t));

  function spark(values) {
    const max = Math.max(1, ...values);
    return values.map((v, i) => `${(i * 96) / Math.max(1, values.length - 1)},${28 - (v / max) * 24}`).join(" ");
  }
  let week = $derived(series.slice(-7));

  let filteredOrders = $derived(orders.filter((o) =>
    (orderFilter === "all" || o.status === orderFilter) &&
    `${o.id} ${o.customer_name ?? ""} ${o.customer_email ?? ""} ${(o.items ?? []).map((i) => `${i.name} ${i.farm_name ?? ""}`).join(" ")}`.toLowerCase().includes(orderSearch.trim().toLowerCase())));

  // Support activity feed, built from whatever dated records the page receives
  let activity = $derived.by(() => {
    const items = [];
    for (const o of orders) items.push({ kind: "order", at: o.created_at, title: `Order #${o.id} placed by ${o.customer_name ?? "a customer"}`, detail: `${currency.format(o.total_amount)} · ${o.status}` });
    for (const c of customers) items.push({ kind: "customer", at: c.created_at, title: `${c.name} joined as a customer`, detail: c.email });
    for (const p of producers) items.push({ kind: "producer", at: p.created_at, title: p.status === "pending" ? `${p.name} applied to sell` : `${p.name} (producer)`, detail: `${p.status} · ${p.farms.length} farms` });
    return items.filter((i) => i.at && !Number.isNaN(new Date(i.at).getTime())).sort((a, b) => new Date(b.at) - new Date(a.at));
  });
  const dot = { order: "bg-teal-500", customer: "bg-blue-500", producer: "bg-[#176b3b]" };
  function timeAgo(at) {
    const mins = Math.round((Date.now() - new Date(at).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
    if (mins < 10080) return `${Math.round(mins / 1440)}d ago`;
    return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(at));
  }

  let tabs = $derived([
    { view: "overview", label: "Overview" },
    { view: "producers", label: "Producers", badge: (stats.producers_pending ?? 0) > 0 ? stats.producers_pending : null },
    { view: "customers", label: "Customers" },
    { view: "orders", label: "Orders", count: orders.length },
    { view: "products", label: "Products" },
    { view: "activity", label: "Activity" }
  ]);

  let statCards = $derived([
    { label: "Producers", value: stats.producers_total ?? 0, sub: "Registered on the platform", icon: icons.leaf, tile: "bg-[#e7f3df]", stroke: "#176b3b", chip: `${activeProducers} active`, chipTone: "bg-green-100 text-green-800", view: "producers" },
    { label: "Awaiting approval", value: stats.producers_pending ?? 0, sub: "Review applications", icon: icons.clock, tile: "bg-amber-100", stroke: "#b45309", chip: (stats.producers_pending ?? 0) > 0 ? "Action needed" : null, chipTone: "bg-amber-100 text-amber-800", alert: (stats.producers_pending ?? 0) > 0, view: "producers" },
    { label: "Customers", value: stats.customers ?? 0, sub: "Registered buyers", icon: icons.users, tile: "bg-blue-100", stroke: "#1d4ed8", view: "customers" },
    { label: "Live listings", value: stats.products_available ?? 0, sub: `of ${stats.products ?? 0} products`, icon: icons.box, tile: "bg-indigo-100", stroke: "#4338ca", view: "products" },
    { label: "Orders", value: stats.orders ?? 0, sub: pendingOrders > 0 ? `${pendingOrders} need action` : "All handled", icon: icons.receipt, tile: "bg-teal-100", stroke: "#0f766e", spark: hasDates ? spark(week.map((p) => p.orders)) : null, sparkColor: "#14b8a6", view: "orders" },
    { label: "Revenue", value: currency.format(revenue), sub: "excluding cancelled", icon: icons.coin, tile: "bg-amber-100", stroke: "#a16207", spark: hasDates ? spark(week.map((p) => p.revenue)) : null, sparkColor: "#d4a017", view: "orders" }
  ]);

  function setProducerStatus(producer, status) {
    router.put(`/dashboard/admin/producers/${producer.id}/status`, { status }, { preserveScroll: true });
  }
</script>

<PortalLayout title="Admin dashboard" user={auth.user}>
  <section class="dashboard-shell mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
    <!-- Banner -->
    <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e3020] via-[#154a31] to-[#1f6b43] px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10">
      <div class="absolute -right-16 -top-24 size-80 rounded-full border border-white/10"></div>
      <div class="absolute right-2 -top-10 size-52 rounded-full border border-white/10"></div>
      <div class="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <span class="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-[#d8e9b8]"><span class="size-1.5 rounded-full bg-[#c6df9e]"></span> ADMINISTRATION · SUPPORT</span>
          <h1 class="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Welcome back{auth?.user?.name ? `, ${auth.user.name}` : ""}</h1>
          <p class="mt-2 max-w-xl text-green-50/80">Approve producer accounts and keep an eye on everything happening across Modern Farms.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          {#if (stats.producers_pending ?? 0) > 0}
            <button type="button" onclick={() => (activeView = "producers")} class="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-bold text-amber-950 shadow-lg transition hover:bg-amber-200">
              {stats.producers_pending} producer{stats.producers_pending === 1 ? "" : "s"} awaiting approval →
            </button>
          {:else}
            <p class="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-semibold text-green-50"><span aria-hidden="true">✓</span> You're all caught up</p>
          {/if}
          <a href="/" class="rounded-2xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20">View marketplace</a>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <nav class="mt-6 flex gap-1 overflow-x-auto rounded-2xl border border-[#dce7df] bg-white p-1.5 shadow-sm" aria-label="Admin dashboard sections">
      {#each tabs as tab}
        <button type="button" aria-current={activeView === tab.view ? "page" : undefined}
          class={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${activeView === tab.view ? "bg-[#176b3b] text-white shadow-sm" : "text-slate-600 hover:bg-[#f1f6ef]"}`}
          onclick={() => (activeView = tab.view)}>
          {tab.label}
          {#if tab.badge}<span class="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-amber-950">{tab.badge}</span>{/if}
          {#if tab.count !== undefined}<span class={`rounded-full px-2 py-0.5 text-xs font-bold ${activeView === tab.view ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>{tab.count}</span>{/if}
        </button>
      {/each}
    </nav>

    {#if flash?.status}
      <p class="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm font-medium text-green-900" role="status"><span aria-hidden="true">✓</span> {flash.status}</p>
    {/if}

    {#if activeView === "overview"}
      <!-- Stat cards -->
      <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {#each statCards as s}
          <button type="button" onclick={() => (activeView = s.view)} class={`${card} relative p-6 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${s.alert ? "ring-2 ring-amber-300" : ""}`}>
            <div class="flex items-start justify-between">
              <span class={`grid size-11 place-items-center rounded-xl ${s.tile}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s.stroke} stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={s.icon} /></svg>
              </span>
              {#if s.chip}<span class={`rounded-full px-3 py-1 text-xs font-bold ${s.chipTone}`}>{s.chip}</span>{/if}
            </div>
            <p class="mt-4 text-sm font-semibold text-slate-600">{s.label}</p>
            <p class="mt-0.5 text-3xl font-extrabold tracking-tight text-[#173f2a]">{s.value}</p>
            <p class="mt-0.5 text-sm text-slate-500">{s.sub}</p>
            {#if s.spark}
              <svg class="absolute bottom-5 right-5" width="96" height="32" viewBox="0 0 96 32" aria-hidden="true"><polyline points={s.spark} fill="none" stroke={s.sparkColor} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
            {/if}
          </button>
        {/each}
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div class="space-y-6">
          {#if hasDates}
            <!-- Revenue chart -->
            <article class={`${card} p-6`}>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div><h2 class="text-lg font-bold">Revenue</h2><p class="mt-1 text-sm text-slate-500">Daily revenue, excluding cancelled orders.</p></div>
                <div class="flex gap-1.5" role="group" aria-label="Chart range">
                  {#each [7, 30, 90] as r}
                    <button type="button" aria-pressed={range === r} onclick={() => (range = r)} class={`rounded-full px-3 py-1 text-xs font-bold transition ${range === r ? "bg-[#176b3b] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{r}D</button>
                  {/each}
                </div>
              </div>
              <svg viewBox="0 0 640 190" class="mt-4 block w-full" role="img" aria-label={`Revenue over the last ${range} days`}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9e5f" stop-opacity=".35" /><stop offset="1" stop-color="#2f9e5f" stop-opacity="0" /></linearGradient></defs>
                {#each [0, 1, 2, 3] as g}
                  <line x1="40" x2="640" y1={30 + g * 41.7} y2={30 + g * 41.7} stroke="#e8eee8" />
                  <text x="0" y={34 + g * 41.7} font-size="11" fill="#64748b">{compact.format(maxRev * (1 - g / 3))}</text>
                {/each}
                <path d={areaPath} fill="url(#rev)" />
                <polyline points={linePoints} fill="none" stroke="#176b3b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                {#if series[peakIndex].revenue > 0}
                  <circle cx={px(peakIndex, series.length)} cy={py(series[peakIndex].revenue, maxRev)} r="6" fill="#fff" stroke="#176b3b" stroke-width="3" />
                  <rect x={Math.min(Math.max(px(peakIndex, series.length) - 52, 40), 536)} y={Math.max(py(series[peakIndex].revenue, maxRev) - 38, 0)} width="104" height="26" rx="8" fill="#173f2a" />
                  <text x={Math.min(Math.max(px(peakIndex, series.length), 92), 588)} y={Math.max(py(series[peakIndex].revenue, maxRev) - 21, 17)} font-size="12" font-weight="700" fill="#fff" text-anchor="middle">{currency.format(series[peakIndex].revenue).replace(".00", "")}</text>
                {/if}
                {#each series as p, i}
                  {#if i % labelStep === 0}<text x={px(i, series.length)} y="180" font-size="11" fill="#64748b" text-anchor="middle">{dayLabel(p.t)}</text>{/if}
                {/each}
              </svg>
            </article>
          {/if}

          <!-- Recent orders -->
          <article class={`${card} p-6`}>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div><h2 class="text-lg font-bold">Recent orders</h2><p class="mt-1 text-sm text-slate-500">The latest activity on the marketplace.</p></div>
              <button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => (activeView = "orders")}>View all orders →</button>
            </div>
            {#if recentOrders.length === 0}
              <p class="mt-6 rounded-xl bg-[#f4f8f5] p-6 text-center text-sm text-slate-600">No orders have been placed yet.</p>
            {:else}
              <div class="mt-4 overflow-x-auto">
                <table class="w-full min-w-[480px] text-left text-sm">
                  <thead class="text-xs uppercase tracking-wide text-slate-500"><tr><th class="py-2 pr-4 font-semibold">Order</th><th class="py-2 pr-4 font-semibold">Customer</th><th class="py-2 pr-4 font-semibold">Total</th><th class="py-2 font-semibold">Status</th></tr></thead>
                  <tbody class="divide-y divide-slate-100">
                    {#each recentOrders as order, i (order.id)}
                      <tr class="transition hover:bg-[#fafcf9]">
                        <td class="py-3.5 pr-4 font-bold">#{order.id}</td>
                        <td class="py-3.5 pr-4"><span class="flex items-center gap-2.5"><span class={`grid size-8 place-items-center rounded-full text-xs font-bold ${tone(i)}`} aria-hidden="true">{(order.customer_name ?? "C")[0]}</span>{order.customer_name ?? "Customer"}</span></td>
                        <td class="py-3.5 pr-4 font-semibold">{currency.format(order.total_amount)}</td>
                        <td class="py-3.5"><span class={`rounded-full px-3 py-1 text-xs font-bold capitalize ${badgeClass(order.status)}`}>{order.status}</span></td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}
          </article>

          <!-- Orders by status -->
          <article class={`${card} p-6`}>
            <h2 class="text-lg font-bold">Orders by status</h2>
            <p class="mt-1 text-sm text-slate-500">Where every order sits in the fulfilment pipeline.</p>
            <ul class="mt-5 space-y-3">
              {#each statusCounts as s}
                <li class="flex items-center gap-4">
                  <span class="w-24 text-sm font-medium capitalize text-slate-600">{s.status}</span>
                  <span class="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><span class={`block h-full rounded-full ${bar[s.status]}`} style={`width: ${(s.count / maxCount) * 100}%`}></span></span>
                  <span class="w-8 text-right text-sm font-bold">{s.count}</span>
                </li>
              {/each}
            </ul>
          </article>
        </div>

        <div class="space-y-6">
          <!-- Recent activity -->
          <article class={`${card} p-6`}>
            <div class="flex items-center justify-between"><h2 class="text-lg font-bold">Recent activity</h2><button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => (activeView = "activity")}>See all →</button></div>
            <ul class="mt-4 space-y-4">
              {#each activity.slice(0, 6) as a}
                <li class="flex gap-3"><span class={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot[a.kind]}`}></span><div class="min-w-0"><p class="text-sm font-semibold">{a.title}</p><p class="text-xs text-slate-500">{a.detail} · {timeAgo(a.at)}</p></div></li>
              {:else}
                <li class="rounded-xl bg-[#f4f8f5] p-5 text-center text-sm text-slate-500">Activity appears here as orders and sign-ups come in.</li>
              {/each}
            </ul>
          </article>

          <!-- Needs attention -->
          <article class={`${card} p-6`}>
            <h2 class="text-lg font-bold">Needs attention</h2>
            <ul class="mt-4 space-y-3">
              {#each [["Pending producers", pendingProducers.length, "amber"], ["Low stock (10 or fewer)", lowStock, "amber"], ["Out of stock", outOfStock, "red"], ["Cancelled orders", cancelledOrders, "red"]] as [label, n, level]}
                <li class="flex items-center justify-between rounded-xl bg-[#f4f8f5] px-4 py-3">
                  <span class="text-sm font-medium">{label}</span>
                  <span class={`rounded-full px-3 py-1 text-xs font-bold ${n === 0 ? "bg-green-100 text-green-800" : level === "red" ? "bg-red-100 text-red-700" : "bg-amber-200 text-amber-900"}`}>{n}</span>
                </li>
              {/each}
            </ul>
          </article>

          <!-- Producer applications -->
          <article class={`${card} p-6`}>
            <h2 class="text-lg font-bold">Producer applications</h2>
            <p class="mt-1 text-sm text-slate-500">Approve eligible producers to make their farms and products available.</p>
            {#if stats.producers_pending === 0}
              <div class="mt-5 rounded-xl bg-[#f4f8f5] p-6 text-center">
                <span class="mx-auto grid size-12 place-items-center rounded-full bg-green-100 text-xl text-green-700" aria-hidden="true">✓</span>
                <p class="mt-3 font-semibold">You're all caught up</p>
                <p class="mt-1 text-sm text-slate-500">There are no pending producer applications.</p>
              </div>
            {:else}
              <ul class="mt-4 divide-y divide-slate-100">
                {#each pendingProducers.slice(0, 5) as producer, i (producer.id)}
                  <li class="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div class="flex items-center gap-3">
                      <span class={`grid size-10 place-items-center rounded-full font-bold ${tone(i)}`} aria-hidden="true">{producer.name?.[0] ?? "?"}</span>
                      <div><p class="font-semibold">{producer.name}</p><p class="text-sm text-slate-500">{producer.email} · {producer.farms.length} farms</p></div>
                    </div>
                    <button type="button" class={btnPrimary} onclick={() => setProducerStatus(producer, "approved")}>Approve</button>
                  </li>
                {/each}
              </ul>
              <button type="button" class="mt-3 text-sm font-bold text-[#176b3b] hover:underline" onclick={() => (activeView = "producers")}>Manage producers →</button>
            {/if}
          </article>
        </div>
      </div>
    {:else if activeView === "producers"}
      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div><h2 class="text-2xl font-bold tracking-tight">Producer accounts</h2><p class="mt-1 text-sm text-slate-500">Approve, reject, or suspend marketplace access.</p></div>
          <input bind:value={producerSearch} type="search" placeholder="Search producers" aria-label="Search producers" class={`${searchBox} sm:max-w-xs`} />
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {#each [["Total producers", producers.length, "text-[#173f2a]", ""], ["Active", activeProducers, "text-green-800", ""], ["Pending", pendingProducers.length, "text-amber-800", pendingProducers.length ? "ring-2 ring-amber-300" : ""], ["Suspended", suspendedProducers, "text-red-700", ""]] as [label, n, color, ring]}
            <div class={`${card} px-5 py-4 ${ring}`}><p class="text-sm text-slate-500">{label}</p><p class={`text-2xl font-extrabold ${color}`}>{n}</p></div>
          {/each}
        </div>

        <div class="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter producers by status">
          {#each [["all", "All"], ["pending", "Pending"], ["active", "Active"], ["suspended", "Suspended"]] as [value, label]}
            <button type="button" aria-pressed={producerFilter === value} onclick={() => (producerFilter = value)} class={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${producerFilter === value ? "bg-[#176b3b] text-white" : "border border-[#d6e0d8] bg-white text-slate-600 hover:border-[#438150]"}`}>{label}</button>
          {/each}
        </div>

        <div class="mt-5 space-y-4">
          {#each filteredProducers as producer, i (producer.id)}
            <article class={`${card} p-6`}>
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="flex items-start gap-4">
                  <span class={`grid size-12 shrink-0 place-items-center rounded-full text-lg font-bold ${tone(i)}`} aria-hidden="true">{producer.name?.[0] ?? "?"}</span>
                  <div>
                    <h3 class="text-lg font-bold">{producer.name}</h3>
                    <p class="mt-1 text-sm text-slate-600">{producer.email}{producer.phone ? ` · ${producer.phone}` : ""}</p>
                    <p class="mt-1 text-sm text-slate-500">{producer.product_count} products across {producer.farms.length} farms</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class={`rounded-full px-3 py-1 text-sm font-bold capitalize ${badgeClass(producer.status)}`}>{producer.status}</span>
                  {#if producer.status !== "active"}<button type="button" class={btnPrimary} onclick={() => setProducerStatus(producer, "approved")}>Approve</button>{/if}
                  {#if producer.status === "pending"}
                    <button type="button" class={btnDanger} onclick={() => setProducerStatus(producer, "rejected")}>Reject</button>
                  {:else if producer.status === "active"}
                    <button type="button" class={btnWarn} onclick={() => setProducerStatus(producer, "suspended")}>Suspend</button>
                  {/if}
                </div>
              </div>
              {#if producer.farms.length > 0}
                <div class="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {#each producer.farms as farm (farm.id)}<span class="rounded-full bg-[#f1f6ef] px-3 py-1.5 text-sm text-slate-700">{farm.name} · {farm.products_count} products</span>{/each}
                </div>
              {/if}
            </article>
          {:else}
            <div class="rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center text-slate-600">No matching producer accounts.</div>
          {/each}
        </div>
      </section>
    {:else if activeView === "activity"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">System activity</h2>
        <p class="mt-1 text-sm text-slate-500">Orders, sign-ups and producer applications across the whole platform, newest first.</p>
        <article class={`${card} mt-5 p-6`}>
          <ul class="space-y-5">
            {#each activity.slice(0, 50) as a}
              <li class="flex gap-3"><span class={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot[a.kind]}`}></span><div class="min-w-0"><p class="text-sm font-semibold">{a.title}</p><p class="text-xs text-slate-500">{a.detail} · {timeAgo(a.at)}</p></div></li>
            {:else}
              <li class="rounded-xl bg-[#f4f8f5] p-8 text-center text-sm text-slate-500">No dated activity yet. Make sure orders, customers and producers include created_at in the dashboard data.</li>
            {/each}
          </ul>
        </article>
      </section>
    {:else if activeView === "customers"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Customers</h2>
        <p class="mt-1 text-sm text-slate-500">Everyone who has joined the marketplace as a buyer.</p>
        <div class={`${card} mt-5 overflow-x-auto`}>
          <table class="w-full min-w-[700px] text-left text-sm">
            <thead class="bg-[#f4f8f5] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-6 py-3.5 font-semibold">Customer</th><th class="px-6 py-3.5 font-semibold">Phone</th><th class="px-6 py-3.5 font-semibold">Orders</th><th class="px-6 py-3.5 font-semibold">Order value</th><th class="px-6 py-3.5 font-semibold">Joined</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              {#each customers as customer, i (customer.id)}
                <tr class="transition hover:bg-[#fafcf9]">
                  <td class="px-6 py-4"><div class="flex items-center gap-3"><span class={`grid size-9 place-items-center rounded-full font-bold ${tone(i)}`} aria-hidden="true">{customer.name?.[0] ?? "?"}</span><div><p class="font-semibold">{customer.name}</p><p class="text-xs text-slate-500">{customer.email}</p></div></div></td>
                  <td class="px-6 py-4">{customer.phone ?? "—"}</td>
                  <td class="px-6 py-4 font-semibold">{customer.order_count}</td>
                  <td class="px-6 py-4 font-semibold">{currency.format(customer.total_spent)}</td>
                  <td class="px-6 py-4 text-slate-500">{customer.created_at ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(customer.created_at)) : "—"}</td>
                </tr>
              {:else}
                <tr><td colspan="5" class="px-6 py-12 text-center text-slate-500">No customer accounts yet.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else if activeView === "orders"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Marketplace orders</h2>
        <p class="mt-1 text-sm text-slate-500">Read-only support view. Producers approve and fulfil their own orders.</p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <input bind:value={orderSearch} type="search" placeholder="Search by order, customer, product or farm" aria-label="Search orders" class={`${searchBox} sm:max-w-sm`} />
          <div class="flex flex-wrap gap-2" role="group" aria-label="Filter orders by status">
            {#each ["all", ...orderStatuses] as st}
              <button type="button" aria-pressed={orderFilter === st} onclick={() => (orderFilter = st)} class={`rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition ${orderFilter === st ? "bg-[#176b3b] text-white" : "border border-[#d6e0d8] bg-white text-slate-600 hover:border-[#438150]"}`}>{st}</button>
            {/each}
          </div>
        </div>
        {#if orders.length === 0}
          <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center text-slate-600">No orders have been placed yet.</div>
        {:else}
          <div class="mt-5 space-y-4">
            {#each filteredOrders as order (order.id)}
              <article class={`${card} p-6`}>
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 class="text-lg font-bold">Order #{order.id} · {order.customer_name ?? "Customer"}</h3>
                    <p class="mt-1 text-sm text-slate-500">{order.customer_email ?? ""} · {order.delivery_address ?? "No delivery address"}</p>
                  </div>
                  <div class="text-right">
                    <span class={`rounded-full px-3 py-1 text-sm font-bold capitalize ${badgeClass(order.status)}`}>{order.status}</span>
                    <p class="mt-2 text-lg font-extrabold text-[#173f2a]">{currency.format(order.total_amount)}</p>
                  </div>
                </div>
                <ul class="mt-4 divide-y divide-slate-100 rounded-xl bg-[#f8faf7] px-4">
                  {#each order.items as item}
                    <li class="flex justify-between gap-3 py-3 text-sm"><span>{item.quantity} {item.unit} · {item.name} <span class="text-slate-500">({item.farm_name ?? "Farm"})</span></span><span class="font-semibold">{currency.format(item.subtotal)}</span></li>
                  {/each}
                </ul>
              </article>
            {:else}
              <div class="rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">No orders match these filters.</div>
            {/each}
          </div>
        {/if}
      </section>
    {:else}
      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div><h2 class="text-2xl font-bold tracking-tight">Marketplace products</h2><p class="mt-1 text-sm text-slate-500">Overview of every listing on the marketplace. Producers manage their own products.</p></div>
          <input bind:value={productSearch} type="search" placeholder="Search products, farms, or producers" aria-label="Search products" class={`${searchBox} sm:max-w-sm`} />
        </div>
        <div class={`${card} mt-5 overflow-x-auto`}>
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="bg-[#f4f8f5] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-6 py-3.5 font-semibold">Product</th><th class="px-6 py-3.5 font-semibold">Producer / farm</th><th class="px-6 py-3.5 font-semibold">Price</th><th class="px-6 py-3.5 font-semibold">Stock</th><th class="px-6 py-3.5 font-semibold">Status</th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              {#each filteredProducts as product (product.id)}
                <tr class="transition hover:bg-[#fafcf9]">
                  <td class="px-6 py-4"><p class="font-semibold">{product.name}</p><p class="text-xs text-slate-500">{product.category}</p></td>
                  <td class="px-6 py-4">{product.producer_name ?? "—"}<p class="text-xs text-slate-500">{product.farm_name ?? "—"}</p></td>
                  <td class="px-6 py-4 font-semibold">{currency.format(product.price)} <span class="font-normal text-slate-500">/ {product.unit}</span></td>
                  <td class="px-6 py-4"><span class={product.quantity_remaining <= 10 ? "font-bold text-amber-700" : ""}>{product.quantity_remaining} {product.unit}</span></td>
                  <td class="px-6 py-4"><span class={`rounded-full px-3 py-1 text-xs font-bold capitalize ${badgeClass(product.status)}`}>{product.status.replaceAll("_", " ")}</span></td>
                </tr>
              {:else}
                <tr><td colspan="5" class="px-6 py-12 text-center text-slate-500">No matching products.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  </section>
</PortalLayout>
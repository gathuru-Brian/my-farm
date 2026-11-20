<script>
  import { router, useForm } from "@inertiajs/svelte";
  import DashboardTabs from "../../components/DashboardTabs.svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { auth, stats = {}, producers = [], customers = [], products = [], orders = [], contactMessages = [], salesByDay = [], topFarmsThisWeek = [], flash } = $props();
  let activeView = $state("overview");
  let dashboardSearch = $state("");
  let showSearchResults = $state(false);
  let productSearch = $state("");
  let producerSearch = $state("");
  let producerFilter = $state("all");
  let range = $state(7);
  let orderSearch = $state("");
  let orderFilter = $state("all");
  let selected = $state(null); // { type: "producer" | "customer", id }
  let closeButton = $state(null);
  let producerInviteForm = useForm({ full_name: "", email: "", phone: "" });
  let resendingInvitations = $state({});
  let reviewingContactMessages = $state({});

  const DAY = 86400000;
  const orderStatuses = ["pending", "confirmed", "processing", "ready", "shipped", "delivered", "cancelled"];
  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat("en-KE", { notation: "compact", maximumFractionDigits: 1 });
  const compactCurrency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", notation: "compact", maximumFractionDigits: 1 });
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
    `${producer.name} ${producer.email} ${producer.status} ${(producer.farms ?? []).map((farm) => farm.name).join(" ")}`.toLowerCase().includes(producerSearch.trim().toLowerCase())));

  // Insights, all computed from props the page already receives
  let pendingProducers = $derived(producers.filter((p) => p.status === "pending"));
  let activeProducers = $derived(producers.filter((p) => p.status === "active").length);
  let suspendedProducers = $derived(producers.filter((p) => p.status === "suspended").length);
  let revenue = $derived(orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + Number(o.total_amount || 0), 0));
  let salesTotal = $derived(Number(stats.sales_total ?? revenue));
  let pendingPaymentsTotal = $derived(Number(stats.pending_payments_total ?? orders
    .filter((order) => order.status !== "cancelled" && order.payment_status === "pending")
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0)));
  let pendingPayments = $derived(Number(stats.pending_payments ?? orders
    .filter((order) => order.status !== "cancelled" && order.payment_status === "pending").length));
  let pendingOrders = $derived(orders.filter((o) => o.status === "pending").length);
  let unreadContactMessages = $derived(contactMessages.filter((message) => !message.reviewed_at).length);
  let recentOrders = $derived(orders.slice(0, 4));
  let topCategories = $derived.by(() => {
    const counts = new Map();
    for (const product of products) {
      const category = product.category?.trim() || "Other";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }

    return [...counts].map(([category, count]) => ({ category, count }))
      .sort((first, second) => second.count - first.count || first.category.localeCompare(second.category))
      .slice(0, 5);
  });
  let maxCategoryCount = $derived(Math.max(1, ...topCategories.map((category) => category.count)));
  let lowStock = $derived(products.filter((p) => p.quantity_remaining > 0 && p.quantity_remaining <= 10).length);
  let outOfStock = $derived(products.filter((p) => p.quantity_remaining <= 0).length);
  let cancelledOrders = $derived(orders.filter((o) => o.status === "cancelled").length);
  let statusCounts = $derived(orderStatuses.map((s) => ({ status: s, count: orders.filter((o) => o.status === s).length })));
  let maxCount = $derived(Math.max(1, ...statusCounts.map((s) => s.count)));

  // Time series: only drawn when orders carry a created_at date
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  let hasDates = $derived(salesByDay.length > 0 || orders.some((o) => o.created_at && !Number.isNaN(new Date(o.created_at).getTime())));
  let series = $derived.by(() => {
    const today = startOfDay(new Date());
    const pts = Array.from({ length: range }, (_, i) => ({ t: today - (range - 1 - i) * DAY, revenue: 0, orders: 0 }));
    if (salesByDay.length > 0) {
      for (const day of salesByDay) {
        const [year, month, date] = day.date.split("-").map(Number);
        const point = pts.find((item) => item.t === new Date(year, month - 1, date).getTime());
        if (point) {
          point.orders = Number(day.orders);
          point.revenue = Number(day.revenue);
        }
      }
    } else {
      for (const order of orders) {
        if (!order.created_at) continue;
        const point = pts.find((item) => item.t === startOfDay(order.created_at));
        if (point) {
          point.orders += 1;
          if (order.status !== "cancelled") point.revenue += Number(order.total_amount || 0);
        }
      }
    }
    return pts;
  });
  let maxRev = $derived(Math.max(1, ...series.map((p) => p.revenue)));
  let labelStep = $derived(Math.ceil(range / 7));
  const dayLabel = (t) => new Intl.DateTimeFormat("en-KE", range === 7 ? { weekday: "short" } : { day: "numeric", month: "short" }).format(new Date(t));

  let filteredOrders = $derived(orders.filter((o) =>
    (orderFilter === "all" || o.status === orderFilter) &&
    `${o.id} ${o.customer_name ?? ""} ${o.customer_email ?? ""} ${(o.items ?? []).map((i) => `${i.name} ${i.farm_name ?? ""}`).join(" ")}`.toLowerCase().includes(orderSearch.trim().toLowerCase())));
  let searchTerm = $derived(dashboardSearch.trim().toLowerCase());
  let globalOrderMatches = $derived(searchTerm ? orders.filter((order) =>
    `${order.id} ${order.customer_name ?? ""} ${order.customer_email ?? ""} ${(order.items ?? []).map((item) => `${item.name} ${item.farm_name ?? ""}`).join(" ")}`.toLowerCase().includes(searchTerm)).slice(0, 3) : []);
  let globalProducerMatches = $derived(searchTerm ? producers.filter((producer) =>
    `${producer.name} ${producer.email} ${(producer.farms ?? []).map((farm) => farm.name).join(" ")}`.toLowerCase().includes(searchTerm)).slice(0, 3) : []);
  let globalProductMatches = $derived(searchTerm ? products.filter((product) =>
    `${product.name} ${product.category ?? ""} ${product.farm_name ?? ""} ${product.producer_name ?? ""}`.toLowerCase().includes(searchTerm)).slice(0, 3) : []);
  let sectionTitle = $derived({
    overview: "Marketplace overview",
    producers: "Producer management",
    "add-producer": "Invite a producer",
    customers: "Customers",
    orders: "Orders",
    "contact-inbox": "Contact inbox",
    products: "Product listings",
    activity: "Platform activity",
  }[activeView] ?? "Marketplace overview");
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
    { view: "overview", label: "Overview", icon: "⌂" },
    { view: "producers", label: "Producers", icon: "♙", badge: (stats.producers_pending ?? 0) > 0 ? stats.producers_pending : null },
    { view: "add-producer", label: "Add Producer", icon: "+" },
    { view: "customers", label: "Customers", icon: "♧" },
    { view: "orders", label: "Orders", icon: "▤", count: orders.length },
    { view: "contact-inbox", label: "Contact inbox", icon: "✉", badge: unreadContactMessages || null },
    { view: "products", label: "Products", icon: "▦" },
    { view: "activity", label: "Activity", icon: "◷" }
  ]);

  let statCards = $derived([
    { label: "Total sales", value: currency.format(salesTotal), sub: "Order value, excluding cancellations", view: "orders" },
    { label: "Orders", value: compact.format(stats.orders ?? orders.length), sub: pendingOrders > 0 ? `${pendingOrders} awaiting fulfilment` : "Marketplace orders", view: "orders" },
    { label: "Active producers", value: compact.format(activeProducers), sub: `${stats.producers_pending ?? 0} pending approval`, view: "producers" },
    { label: "Pending payments", value: currency.format(pendingPaymentsTotal), sub: `${pendingPayments} order${pendingPayments === 1 ? "" : "s"} to review`, alert: pendingPayments > 0, view: "orders" }
  ]);

  // Detail panel: everything the page knows about one producer or customer
  let selectedProducer = $derived(selected?.type === "producer" ? producers.find((p) => p.id === selected.id) ?? null : null);
  let selectedCustomer = $derived(selected?.type === "customer" ? customers.find((c) => c.id === selected.id) ?? null : null);
  let detailOpen = $derived(Boolean(selectedProducer || selectedCustomer));

  let producerFarmNames = $derived(new Set((selectedProducer?.farms ?? []).map((f) => f.name)));
  let producerProducts = $derived(selectedProducer
    ? products.filter((p) => (p.producer_id !== undefined ? p.producer_id === selectedProducer.id : p.producer_name === selectedProducer.name))
    : []);
  let producerOrders = $derived(selectedProducer ? orders.filter((o) => (o.items ?? []).some((i) => producerFarmNames.has(i.farm_name))) : []);
  let producerRevenue = $derived(producerOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.items ?? []).filter((i) => producerFarmNames.has(i.farm_name)).reduce((s, i) => s + Number(i.subtotal || 0), 0), 0));
  let customerOrders = $derived(selectedCustomer
    ? orders.filter((o) => (o.customer_email && o.customer_email === selectedCustomer.email) || (!o.customer_email && o.customer_name === selectedCustomer.name))
    : []);
  let customerAddresses = $derived([...new Set(customerOrders.map((o) => o.delivery_address).filter(Boolean))]);

  const shownKeys = {
    producer: ["id", "name", "email", "phone", "status", "created_at", "product_count", "farms"],
    customer: ["id", "name", "email", "phone", "created_at", "order_count", "total_spent"]
  };
  const humanize = (k) => k.replaceAll("_", " ").replace(/^\w/, (c) => c.toUpperCase());
  // Any extra plain fields the controller sends (address, county, ...) show up automatically
  function extraFields(obj, type) {
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([k, v]) => !shownKeys[type].includes(k) && v !== null && v !== "" && ["string", "number", "boolean"].includes(typeof v))
      .map(([k, v]) => [humanize(k), typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)]);
  }
  function farmMeta(farm) {
    return Object.entries(farm)
      .filter(([k, v]) => !["id", "name", "products_count"].includes(k) && v !== null && v !== "" && ["string", "number"].includes(typeof v))
      .map(([, v]) => String(v)).join(" · ");
  }
  const fullDate = (v) => (v && !Number.isNaN(new Date(v).getTime()) ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(v)) : "—");
  function markContactMessageReviewed(message) {
    if (reviewingContactMessages[message.id]) return;
    reviewingContactMessages[message.id] = true;
    router.put(`/dashboard/admin/contact-messages/${message.id}/review`, {}, {
      preserveScroll: true,
      onFinish: () => { delete reviewingContactMessages[message.id]; },
    });
  }
  const openDetail = (type, id) => { selected = { type, id }; };
  const closeDetail = () => { selected = null; };
  function farmNameFor(order) {
    const farms = [...new Set((order.items ?? []).map((item) => item.farm_name).filter(Boolean))];
    if (farms.length > 1) return `${farms[0]} + ${farms.length - 1} more`;
    return farms[0] ?? "—";
  }

  function chooseSearchResult(type, item) {
    if (type === "order") {
      orderSearch = String(item.id);
      activeView = "orders";
    } else if (type === "producer") {
      producerSearch = item.name;
      producerFilter = "all";
      activeView = "producers";
    } else {
      productSearch = item.name;
      activeView = "products";
    }

    dashboardSearch = "";
    showSearchResults = false;
  }

  $effect(() => { if (detailOpen) closeButton?.focus(); });

  function setProducerStatus(producer, status) {
    router.put(`/dashboard/admin/producers/${producer.id}/status`, { status }, { preserveScroll: true });
  }

  function inviteProducer(event) {
    event.preventDefault();
    producerInviteForm.post("/dashboard/admin/producers", {
      preserveScroll: true,
      onSuccess: () => producerInviteForm.resetAndClearErrors(),
    });
  }

  function resendProducerInvitation(producer) {
    resendingInvitations[producer.id] = true;
    router.post(`/dashboard/admin/producers/${producer.id}/invitation`, {}, {
      preserveScroll: true,
      onFinish: () => { delete resendingInvitations[producer.id]; },
    });
  }
</script>

<svelte:window onkeydown={(event) => {
  if (event.key === "Escape" && detailOpen) closeDetail();
  if (event.key === "Escape") showSearchResults = false;
}} />

<PortalLayout title="Admin dashboard" user={auth.user}>
  <div class="min-h-full bg-[#f6f8f3]">
  <section class="dashboard-shell mx-auto max-w-[1500px] px-4 py-5 sm:px-5 lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start lg:gap-x-5 lg:px-8 lg:py-7" data-dashboard-role="admin">
    <header class="flex flex-col justify-between gap-4 md:flex-row md:items-center lg:col-start-2 lg:row-start-1">
      <div class="min-w-0">
        <h1 class="text-2xl font-extrabold tracking-tight text-[#25352d] sm:text-[1.75rem]">{sectionTitle}</h1>
        <p class="mt-1 text-sm text-slate-600">{activeView === "overview" ? "Your farm-to-customer marketplace, at a glance." : "Manage your marketplace from one place."}</p>
      </div>
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <div class="relative min-w-[220px] flex-1 md:flex-none">
          <label class="sr-only" for="admin-dashboard-search">Search orders, producers, and products</label>
          <input
            id="admin-dashboard-search"
            bind:value={dashboardSearch}
            type="search"
            role="combobox"
            placeholder="Search orders, producers, products"
            autocomplete="off"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-controls="admin-search-results"
            aria-expanded={showSearchResults && Boolean(searchTerm)}
            class={`${searchBox} h-10 pr-10 md:w-64 xl:w-72`}
            onfocus={() => (showSearchResults = true)}
            oninput={() => (showSearchResults = true)}
          />
          <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          {#if showSearchResults && searchTerm}
            <div id="admin-search-results" class="absolute right-0 top-full z-30 mt-2 max-h-[min(70vh,28rem)] w-full min-w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[#e1e9de] bg-white p-2 shadow-xl" role="listbox" aria-label="Search results">
              {#if globalOrderMatches.length + globalProducerMatches.length + globalProductMatches.length === 0}
                <p class="px-3 py-4 text-sm text-slate-500">No matching orders, producers, or products.</p>
              {:else}
                {#if globalOrderMatches.length}
                  <p class="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Orders</p>
                  {#each globalOrderMatches as order (order.id)}
                    <button type="button" role="option" aria-selected="false" class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-[#f3f7f1]" onclick={() => chooseSearchResult("order", order)}>
                      <span class="truncate text-sm font-semibold text-[#33483a]">Order #{order.id} · {order.customer_name ?? "Customer"}</span><span class="shrink-0 text-xs text-slate-500">{currency.format(order.total_amount)}</span>
                    </button>
                  {/each}
                {/if}
                {#if globalProducerMatches.length}
                  <p class="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Producers</p>
                  {#each globalProducerMatches as producer (producer.id)}
                    <button type="button" role="option" aria-selected="false" class="w-full truncate rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#33483a] transition hover:bg-[#f3f7f1]" onclick={() => chooseSearchResult("producer", producer)}>{producer.name} <span class="font-normal text-slate-500">· {producer.farms?.[0]?.name ?? producer.email}</span></button>
                  {/each}
                {/if}
                {#if globalProductMatches.length}
                  <p class="px-3 pb-1 pt-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Products</p>
                  {#each globalProductMatches as product (product.id)}
                    <button type="button" role="option" aria-selected="false" class="w-full truncate rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#33483a] transition hover:bg-[#f3f7f1]" onclick={() => chooseSearchResult("product", product)}>{product.name} <span class="font-normal text-slate-500">· {product.farm_name ?? product.category}</span></button>
                  {/each}
                {/if}
              {/if}
            </div>
          {/if}
        </div>
        <button type="button" class="rounded-xl bg-[#334155] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e293b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#64748b]" onclick={() => (activeView = "producers")}>Manage producers</button>
      </div>
    </header>

    <div class="mt-4 grid items-start gap-5 lg:contents xl:gap-6">
      <DashboardTabs
        tabs={tabs}
        activeView={activeView}
        onSelect={(view) => (activeView = view)}
        label="Admin dashboard sections"
        heading="Admin workspace"
        description="Monitor and manage the marketplace"
        accent="admin"
        gridClass="lg:col-start-1 lg:row-start-1 lg:row-span-2"
      />
      <div class="min-w-0 lg:col-start-2 lg:row-start-2">

    {#if flash?.status}
      <p class="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm font-medium text-green-900" role="status"><span aria-hidden="true">✓</span> {flash.status}</p>
    {/if}
    {#if flash?.warning}
      <p class="mt-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-sm font-medium leading-6 text-amber-950" role="alert"><span aria-hidden="true">!</span> {flash.warning}</p>
    {/if}

    {#if activeView === "overview"}
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each statCards as s (s.label)}
          <button type="button" onclick={() => (activeView = s.view)} class={`${card} min-w-0 p-5 text-left transition hover:-translate-y-0.5 hover:border-[#cbdcc9] hover:shadow-lg ${s.alert ? "ring-2 ring-amber-300" : ""}`}>
            <span class="text-sm font-medium text-slate-500">{s.label}</span>
            <span class="mt-1 block truncate text-2xl font-extrabold tracking-tight text-[#1d3026] sm:text-[1.75rem]">{s.value}</span>
            <span class={`mt-1 block text-xs font-semibold ${s.alert ? "text-amber-700" : "text-[#43815d]"}`}>{s.sub}</span>
          </button>
        {/each}
      </div>

      <div class="mt-5 grid items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <article class={`${card} min-w-0 p-5 sm:p-6`}>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div><h3 class="text-base font-extrabold text-[#263b30]">Sales by day</h3><p class="mt-1 text-xs text-slate-500">Order value, excluding cancelled orders.</p></div>
            <div class="flex gap-1 rounded-xl bg-[#f1f5ef] p-1" role="group" aria-label="Sales chart range">
              {#each [7, 30, 90] as days}
                <button type="button" aria-pressed={range === days} onclick={() => (range = days)} class={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${range === days ? "bg-white text-[#174b32] shadow-sm" : "text-slate-500 hover:text-[#174b32]"}`}>{days}D</button>
              {/each}
            </div>
          </div>
          {#if hasDates}
            <div class="mt-5 overflow-x-auto pb-1">
              <div class="grid h-48 items-end gap-1.5 border-b border-[#e8eee8] px-1 sm:gap-2" style={`grid-template-columns: repeat(${series.length}, minmax(0, 1fr)); min-width: ${Math.max(250, series.length * 28)}px`} role="img" aria-label={`Daily sales for the last ${range} days`}>
                {#each series as point, index (point.t)}
                  <div class="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                    <div class="flex min-h-0 w-full flex-1 items-end">
                      <span class={`relative block w-full rounded-t-md transition-all ${point.revenue > 0 && point.revenue === maxRev ? "bg-[#df8b2c]" : "bg-[#34765b]"}`} style={`height: ${point.revenue > 0 ? Math.max(5, (point.revenue / maxRev) * 100) : 0}%`} title={`${dayLabel(point.t)}: ${currency.format(point.revenue)}`}>
                        {#if point.revenue > 0 && point.revenue === maxRev}
                          <span class="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-[#9a5d19]">{compactCurrency.format(point.revenue)}</span>
                        {/if}
                      </span>
                    </div>
                    {#if index % labelStep === 0}
                      <span class="truncate text-[10px] text-slate-500 sm:text-xs">{dayLabel(point.t)}</span>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="mt-5 grid h-48 place-items-center rounded-xl bg-[#f6f8f3] text-sm text-slate-500">Sales activity will appear here when orders arrive.</div>
          {/if}
        </article>

        <article class={`${card} p-5 sm:p-6`}>
          <h3 class="text-base font-extrabold text-[#263b30]">Top categories</h3>
          <p class="mt-1 text-xs text-slate-500">Product listings by category.</p>
          {#if topCategories.length}
            <ul class="mt-5 space-y-4">
              {#each topCategories as category (category.category)}
                <li>
                  <div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span class="truncate font-medium text-[#3d5045]">{category.category}</span>
                    <span class="shrink-0 text-xs font-semibold text-slate-500">{category.count}</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-[#ece7d7]">
                    <div class="h-full rounded-full bg-[#34765b]" style={`width: ${(category.count / maxCategoryCount) * 100}%`}></div>
                  </div>
                </li>
              {/each}
            </ul>
          {:else}
            <div class="mt-5 rounded-xl bg-[#f6f8f3] p-5 text-sm text-slate-500">Categories will appear when products are listed.</div>
          {/if}
        </article>
      </div>

      <article class={`${card} mt-5 overflow-hidden`}>
        <div class="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <div><h3 class="text-base font-extrabold text-[#263b30]">Recent orders</h3><p class="mt-1 text-xs text-slate-500">The latest activity across the marketplace.</p></div>
          <button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => (activeView = "orders")}>View all orders <span aria-hidden="true">→</span></button>
        </div>
        {#if recentOrders.length}
          <div class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[680px] text-left text-sm">
              <thead class="border-b border-[#eee9dc] text-xs text-slate-500">
                <tr><th class="px-5 py-3 font-semibold sm:px-6">Order</th><th class="px-4 py-3 font-semibold">Buyer</th><th class="px-4 py-3 font-semibold">Farm</th><th class="px-4 py-3 font-semibold">Total</th><th class="px-4 py-3 font-semibold">Status</th></tr>
              </thead>
              <tbody class="divide-y divide-[#eee9dc]">
                {#each recentOrders as order (order.id)}
                  <tr class="transition hover:bg-[#fafcf9]">
                    <td class="px-5 py-3.5 font-bold text-[#34483c] sm:px-6">#{order.id}</td>
                    <td class="px-4 py-3.5 text-[#405247]">{order.customer_name ?? "Customer"}</td>
                    <td class="px-4 py-3.5 text-[#58675e]">{farmNameFor(order)}</td>
                    <td class="px-4 py-3.5 font-semibold text-[#34483c]">{currency.format(order.total_amount)}</td>
                    <td class="px-4 py-3.5"><span class={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(order.status)}`}>{order.status}</span></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="m-5 rounded-xl bg-[#f6f8f3] p-6 text-center text-sm text-slate-600">No orders have been placed yet.</p>
        {/if}
      </article>

      <article class={`${card} mt-5 p-5 sm:p-6`}>
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div><h3 class="text-base font-extrabold text-[#263b30]">Top farms this week</h3><p class="mt-1 text-xs text-slate-500">Ranked by non-cancelled order value over the last 7 days.</p></div>
          <button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => (activeView = "producers")}>View producers <span aria-hidden="true">→</span></button>
        </div>
        {#if topFarmsThisWeek.length}
          <ul class="mt-4 grid gap-3 md:grid-cols-3">
            {#each topFarmsThisWeek as farm, index (farm.id)}
              <li class="flex min-w-0 items-center gap-3 rounded-xl bg-[#f7f9f5] p-3.5">
                <span class={`grid size-10 shrink-0 place-items-center rounded-full text-xs font-extrabold ${tone(index)}`} aria-hidden="true">{farm.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
                <span class="min-w-0 flex-1"><span class="block truncate text-sm font-bold text-[#34483c]">{farm.name}</span><span class="mt-0.5 block text-xs text-slate-500">{currency.format(farm.sales)} in sales</span></span>
                <span class="text-xs font-extrabold text-[#a16207]">#{index + 1}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-4 rounded-xl bg-[#f7f9f5] p-5 text-sm text-slate-500">Farm rankings will appear after orders are placed this week.</p>
        {/if}
      </article>

      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <article class={`${card} p-5 sm:p-6`}>
          <div class="flex items-center justify-between"><h3 class="text-base font-extrabold text-[#263b30]">Recent activity</h3><button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => (activeView = "activity")}>See all <span aria-hidden="true">→</span></button></div>
          <ul class="mt-4 space-y-4">
            {#each activity.slice(0, 5) as item}
              <li class="flex gap-3"><span class={`mt-1.5 size-2.5 shrink-0 rounded-full ${dot[item.kind]}`}></span><div class="min-w-0"><p class="text-sm font-semibold">{item.title}</p><p class="text-xs text-slate-500">{item.detail} · {timeAgo(item.at)}</p></div></li>
            {:else}
              <li class="rounded-xl bg-[#f4f8f5] p-5 text-center text-sm text-slate-500">Activity appears here as orders and sign-ups come in.</li>
            {/each}
          </ul>
        </article>

        <article class={`${card} p-5 sm:p-6`}>
          <h3 class="text-base font-extrabold text-[#263b30]">Needs attention</h3>
          <ul class="mt-4 grid gap-2 sm:grid-cols-2">
            {#each [["Pending producers", pendingProducers.length, "amber"], ["Low stock (10 or fewer)", lowStock, "amber"], ["Out of stock", outOfStock, "red"], ["Cancelled orders", cancelledOrders, "red"]] as [label, count, level]}
              <li class="flex items-center justify-between gap-2 rounded-xl bg-[#f6f8f3] px-3.5 py-3">
                <span class="text-sm font-medium">{label}</span>
                <span class={`rounded-full px-2.5 py-1 text-xs font-bold ${count === 0 ? "bg-green-100 text-green-800" : level === "red" ? "bg-red-100 text-red-700" : "bg-amber-200 text-amber-900"}`}>{count}</span>
              </li>
            {/each}
          </ul>
          <div class="mt-5 border-t border-slate-100 pt-4">
            <div class="flex items-center justify-between gap-3">
              <div><h4 class="text-sm font-bold text-[#34483c]">Producer applications</h4><p class="mt-1 text-xs text-slate-500">{pendingProducers.length} awaiting review</p></div>
              <button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => (activeView = "producers")}>Review <span aria-hidden="true">→</span></button>
            </div>
            {#if pendingProducers.length}
              <ul class="mt-2 divide-y divide-slate-100">
                {#each pendingProducers.slice(0, 3) as producer, index (producer.id)}
                  <li class="flex items-center justify-between gap-3 py-2.5">
                    <button type="button" class="flex min-w-0 items-center gap-2.5 text-left" onclick={() => openDetail("producer", producer.id)}>
                      <span class={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${tone(index)}`} aria-hidden="true">{producer.name?.[0] ?? "?"}</span>
                      <span class="truncate text-sm font-semibold">{producer.name}</span>
                    </button>
                    <button type="button" class={`${btnPrimary} shrink-0 px-3 py-1.5 text-xs`} onclick={() => setProducerStatus(producer, "approved")}>Approve</button>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-3 text-sm text-slate-500">You're all caught up.</p>
            {/if}
          </div>
        </article>
      </div>

      <article class={`${card} mt-5 p-5 sm:p-6`}>
        <h3 class="text-base font-extrabold text-[#263b30]">Orders by status</h3>
        <p class="mt-1 text-xs text-slate-500">Orders by fulfilment stage.</p>
        <ul class="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
          {#each statusCounts as status}
            <li class="flex items-center gap-3">
              <span class="w-24 text-sm font-medium capitalize text-slate-600">{status.status}</span>
              <span class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span class={`block h-full rounded-full ${bar[status.status]}`} style={`width: ${(status.count / maxCount) * 100}%`}></span></span>
              <span class="w-7 text-right text-xs font-bold">{status.count}</span>
            </li>
          {/each}
        </ul>
      </article>

    {:else if activeView === "producers"}
      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div><h2 class="text-2xl font-bold tracking-tight">Producer accounts</h2><p class="mt-1 text-sm text-slate-500">Approve, reject, or suspend marketplace access.</p></div>
          <div class="flex flex-wrap gap-2">
            <input bind:value={producerSearch} type="search" placeholder="Search producers" aria-label="Search producers" class={`${searchBox} sm:max-w-xs`} />
            <button type="button" class={btnPrimary} onclick={() => (activeView = "add-producer")}>Add producer</button>
          </div>
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
                    <h3 class="text-lg font-bold"><button type="button" class="text-left transition hover:text-[#176b3b] hover:underline" onclick={() => openDetail("producer", producer.id)}>{producer.name}</button></h3>
                    <p class="mt-1 text-sm text-slate-600">{producer.email}{producer.phone ? ` · ${producer.phone}` : ""}</p>
                    <p class="mt-1 text-sm text-slate-500">{producer.product_count} products across {producer.farms.length} farms</p>
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class={`rounded-full px-3 py-1 text-sm font-bold capitalize ${badgeClass(producer.status)}`}>{producer.status}</span>
                  <button type="button" class="rounded-xl border border-[#d6e0d8] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f1f6ef]" onclick={() => openDetail("producer", producer.id)}>View details</button>
                  {#if producer.status === "pending"}
                    <button type="button" class="rounded-xl border border-[#d6e0d8] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-[#f1f6ef] disabled:cursor-wait disabled:opacity-60" disabled={resendingInvitations[producer.id]} onclick={() => resendProducerInvitation(producer)}>{resendingInvitations[producer.id] ? "Sending…" : "Resend invitation"}</button>
                  {/if}
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
    {:else if activeView === "add-producer"}
      <section class="mt-8">
        <div class="max-w-3xl">
          <p class="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Producer onboarding</p>
          <h2 class="mt-1 text-2xl font-bold tracking-tight">Invite a producer</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">We’ll email a secure password-setup link. Their account will remain pending until an administrator approves it.</p>
        </div>

        <form onsubmit={inviteProducer} class={`${card} mt-5 max-w-3xl space-y-5 p-5 sm:p-7`}>
          <div class="grid gap-5 sm:grid-cols-2">
            <div class="sm:col-span-2">
              <label for="producer-full-name" class="block text-sm font-semibold text-[#263b30]">Full name</label>
              <input id="producer-full-name" bind:value={producerInviteForm.full_name} type="text" autocomplete="name" maxlength="120" required class={`${searchBox} mt-1.5`} />
              {#if producerInviteForm.errors.full_name}<p class="mt-1.5 text-sm text-red-700" role="alert">{producerInviteForm.errors.full_name}</p>{/if}
            </div>
            <div>
              <label for="producer-email" class="block text-sm font-semibold text-[#263b30]">Email address</label>
              <input id="producer-email" bind:value={producerInviteForm.email} type="email" autocomplete="email" maxlength="150" required class={`${searchBox} mt-1.5`} />
              {#if producerInviteForm.errors.email}<p class="mt-1.5 text-sm text-red-700" role="alert">{producerInviteForm.errors.email}</p>{/if}
            </div>
            <div>
              <label for="producer-phone" class="block text-sm font-semibold text-[#263b30]">Phone number <span class="font-normal text-slate-500">(optional)</span></label>
              <input id="producer-phone" bind:value={producerInviteForm.phone} type="tel" autocomplete="tel" maxlength="30" class={`${searchBox} mt-1.5`} />
              {#if producerInviteForm.errors.phone}<p class="mt-1.5 text-sm text-red-700" role="alert">{producerInviteForm.errors.phone}</p>{/if}
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <p class="text-xs leading-5 text-slate-500">The invitation link lets the producer create their own password. No password is shown to you.</p>
            <button type="submit" class={`${btnPrimary} disabled:cursor-wait disabled:opacity-60`} disabled={producerInviteForm.processing}>
              {producerInviteForm.processing ? "Sending invitation…" : "Send invitation"}
            </button>
          </div>
        </form>
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
            <thead class="bg-[#f4f8f5] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-6 py-3.5 font-semibold">Customer</th><th class="px-6 py-3.5 font-semibold">Phone</th><th class="px-6 py-3.5 font-semibold">Orders</th><th class="px-6 py-3.5 font-semibold">Order value</th><th class="px-6 py-3.5 font-semibold">Joined</th><th class="px-6 py-3.5 font-semibold"><span class="sr-only">Details</span></th></tr></thead>
            <tbody class="divide-y divide-slate-100">
              {#each customers as customer, i (customer.id)}
                <tr class="transition hover:bg-[#fafcf9]">
                  <td class="px-6 py-4"><div class="flex items-center gap-3"><span class={`grid size-9 place-items-center rounded-full font-bold ${tone(i)}`} aria-hidden="true">{customer.name?.[0] ?? "?"}</span><button type="button" class="text-left" onclick={() => openDetail("customer", customer.id)}><span class="block font-semibold transition hover:text-[#176b3b] hover:underline">{customer.name}</span><span class="block text-xs text-slate-500">{customer.email}</span></button></div></td>
                  <td class="px-6 py-4">{customer.phone ?? "—"}</td>
                  <td class="px-6 py-4 font-semibold">{customer.order_count}</td>
                  <td class="px-6 py-4 font-semibold">{currency.format(customer.total_spent)}</td>
                  <td class="px-6 py-4 text-slate-500">{customer.created_at ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(customer.created_at)) : "—"}</td>
                  <td class="px-6 py-4 text-right"><button type="button" class="font-bold text-[#176b3b] hover:underline" onclick={() => openDetail("customer", customer.id)}>View →</button></td>
                </tr>
              {:else}
                <tr><td colspan="6" class="px-6 py-12 text-center text-slate-500">No customer accounts yet.</td></tr>
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
                {#if order.courier_name || order.tracking_number || order.estimated_delivery_at || order.delivery_fee > 0}
                  <dl class="mt-4 grid gap-3 rounded-xl bg-[#f4f8f5] p-4 text-sm sm:grid-cols-2">
                    {#if order.courier_name}<div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Courier</dt><dd class="mt-1 font-semibold">{order.courier_name}</dd></div>{/if}
                    {#if order.tracking_number}<div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking number</dt><dd class="mt-1 break-all font-semibold">{order.tracking_number}</dd></div>{/if}
                    {#if order.estimated_delivery_at}<div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Estimated delivery</dt><dd class="mt-1 font-semibold">{fullDate(order.estimated_delivery_at)}</dd></div>{/if}
                    {#if order.delivery_fee > 0}<div><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">Quoted delivery fee</dt><dd class="mt-1 font-semibold">{currency.format(order.delivery_fee)}</dd></div>{/if}
                  </dl>
                {/if}
              </article>
            {:else}
              <div class="rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">No orders match these filters.</div>
            {/each}
          </div>
        {/if}
      </section>
    {:else if activeView === "contact-inbox"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Contact inbox</h2>
        <p class="mt-1 text-sm text-slate-500">Contact form submissions are stored here, including messages whose email notification could not be delivered.</p>
        {#if contactMessages.length === 0}
          <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center text-slate-600">No contact messages have been received.</div>
        {:else}
          <div class="mt-5 space-y-4">
            {#each contactMessages as message (message.id)}
              <article class={`${card} p-5 sm:p-6 ${message.reviewed_at ? "opacity-80" : "ring-1 ring-amber-200"}`}>
                <header class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="font-bold text-[#263b30]">{message.topic}</h3>
                      <span class={`rounded-full px-2.5 py-1 text-xs font-bold ${message.reviewed_at ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{message.reviewed_at ? "Reviewed" : "Needs review"}</span>
                      <span class={`rounded-full px-2.5 py-1 text-xs font-bold ${message.email_status === "sent" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>Email {message.email_status.replaceAll("_", " ")}</span>
                    </div>
                    <p class="mt-1 text-sm text-slate-600">{message.name} · <a class="font-semibold text-[#176b3b] hover:underline" href={`mailto:${message.email}`}>{message.email}</a>{message.phone ? ` · ${message.phone}` : ""}</p>
                    <p class="mt-1 text-xs text-slate-500">{fullDate(message.created_at)}</p>
                  </div>
                  {#if !message.reviewed_at}
                    <button type="button" class={btnPrimary} disabled={reviewingContactMessages[message.id]} onclick={() => markContactMessageReviewed(message)}>{reviewingContactMessages[message.id] ? "Saving…" : "Mark reviewed"}</button>
                  {/if}
                </header>
                <p class="mt-4 whitespace-pre-wrap break-words rounded-xl bg-[#f7f9f5] p-4 text-sm leading-6 text-slate-700">{message.message}</p>
              </article>
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
      </div>
    </div>
  </section>
  </div>

  {#if detailOpen}
    {@const person = selectedProducer ?? selectedCustomer}
    <div class="fixed inset-0 z-50 flex justify-end">
      <button type="button" tabindex="-1" aria-label="Close details" class="absolute inset-0 cursor-default bg-[#0b2418]/50 backdrop-blur-sm" onclick={closeDetail}></button>
      <dialog open aria-modal="true" aria-labelledby="detail-title" class="relative flex h-full w-full max-w-xl flex-col bg-[#fbfcf8] shadow-2xl">
        <div class="bg-gradient-to-br from-[#0e3020] via-[#154a31] to-[#1f6b43] px-6 pb-6 pt-5 text-white">
          <div class="flex items-start justify-between">
            <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-[#d8e9b8]">{selectedProducer ? "PRODUCER" : "CUSTOMER"}</span>
            <button bind:this={closeButton} type="button" aria-label="Close details" class="grid size-9 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" onclick={closeDetail}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div class="mt-5 flex items-center gap-4">
            <span class="grid size-16 shrink-0 place-items-center rounded-full bg-[#d8e9b8] text-2xl font-extrabold text-[#173f2a]" aria-hidden="true">{person.name?.[0] ?? "?"}</span>
            <div class="min-w-0">
              <h2 id="detail-title" class="truncate text-2xl font-extrabold tracking-tight">{person.name}</h2>
              <p class="truncate text-sm text-green-50/80">{person.email}</p>
            </div>
          </div>
          {#if selectedProducer}
            <span class={`mt-4 inline-block rounded-full px-3 py-1 text-sm font-bold capitalize ${badgeClass(selectedProducer.status)}`}>{selectedProducer.status}</span>
          {/if}
        </div>

        <div class="flex-1 space-y-7 overflow-y-auto p-6">
          {#if selectedProducer}
            <div class="grid grid-cols-3 gap-3">
              {#each [["Farms", selectedProducer.farms.length], ["Products", selectedProducer.product_count], ["Revenue", currency.format(producerRevenue).replace(".00", "")]] as [label, value]}
                <div class={`${card} p-4 text-center`}><p class="text-xs font-semibold text-slate-500">{label}</p><p class="mt-1 text-lg font-extrabold text-[#173f2a]">{value}</p></div>
              {/each}
            </div>

            <section>
              <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">Account details</h3>
              <dl class="mt-3 grid gap-3 sm:grid-cols-2">
                {#each [["Email", selectedProducer.email], ["Phone", selectedProducer.phone ?? "Not provided"], ["Registered", fullDate(selectedProducer.created_at)], ["Account status", selectedProducer.status], ...extraFields(selectedProducer, "producer")] as [label, value]}
                  <div class="rounded-xl bg-white p-4 ring-1 ring-[#e3ebe5]"><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd class={`mt-1 break-words font-semibold ${label === "Account status" ? "capitalize" : ""}`}>{value}</dd></div>
                {/each}
              </dl>
            </section>

            <section>
              <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">Farms ({selectedProducer.farms.length})</h3>
              <ul class="mt-3 space-y-2">
                {#each selectedProducer.farms as farm (farm.id)}
                  <li class="rounded-xl bg-white p-4 ring-1 ring-[#e3ebe5]"><div class="flex justify-between gap-3"><span class="font-semibold">{farm.name}</span><span class="text-sm text-slate-500">{farm.products_count} products</span></div>{#if farmMeta(farm)}<p class="mt-1 text-sm capitalize text-slate-500">{farmMeta(farm)}</p>{/if}</li>
                {:else}
                  <li class="rounded-xl bg-[#f4f8f5] p-4 text-sm text-slate-500">No farms added yet.</li>
                {/each}
              </ul>
            </section>

            <section>
              <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">Products ({producerProducts.length})</h3>
              <ul class="mt-3 divide-y divide-slate-100 rounded-xl bg-white px-4 ring-1 ring-[#e3ebe5]">
                {#each producerProducts.slice(0, 8) as product (product.id)}
                  <li class="flex items-center justify-between gap-3 py-3 text-sm"><span><span class="block font-semibold">{product.name}</span><span class="text-xs text-slate-500">{currency.format(product.price)} / {product.unit} · {product.quantity_remaining} left</span></span><span class={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(product.status)}`}>{product.status.replaceAll("_", " ")}</span></li>
                {:else}
                  <li class="py-4 text-sm text-slate-500">No products listed.</li>
                {/each}
              </ul>
              {#if producerProducts.length > 8}<p class="mt-2 text-xs text-slate-500">+ {producerProducts.length - 8} more products</p>{/if}
            </section>

            <section>
              <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">Orders ({producerOrders.length})</h3>
              <ul class="mt-3 divide-y divide-slate-100 rounded-xl bg-white px-4 ring-1 ring-[#e3ebe5]">
                {#each producerOrders.slice(0, 6) as order (order.id)}
                  <li class="flex items-center justify-between gap-3 py-3 text-sm"><span><span class="block font-semibold">Order #{order.id} · {order.customer_name ?? "Customer"}</span><span class="text-xs text-slate-500">{fullDate(order.created_at)}</span></span><span class={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(order.status)}`}>{order.status}</span></li>
                {:else}
                  <li class="py-4 text-sm text-slate-500">No orders for this producer yet.</li>
                {/each}
              </ul>
            </section>

            <section class="flex flex-wrap gap-2 border-t border-slate-200 pt-5">
              {#if selectedProducer.status !== "active"}<button type="button" class={btnPrimary} onclick={() => setProducerStatus(selectedProducer, "approved")}>Approve</button>{/if}
              {#if selectedProducer.status === "pending"}
                <button type="button" class={btnDanger} onclick={() => setProducerStatus(selectedProducer, "rejected")}>Reject</button>
              {:else if selectedProducer.status === "active"}
                <button type="button" class={btnWarn} onclick={() => setProducerStatus(selectedProducer, "suspended")}>Suspend</button>
              {/if}
            </section>
          {:else if selectedCustomer}
            <div class="grid grid-cols-3 gap-3">
              {#each [["Orders", selectedCustomer.order_count], ["Total spent", currency.format(selectedCustomer.total_spent).replace(".00", "")], ["Addresses", customerAddresses.length]] as [label, value]}
                <div class={`${card} p-4 text-center`}><p class="text-xs font-semibold text-slate-500">{label}</p><p class="mt-1 text-lg font-extrabold text-[#173f2a]">{value}</p></div>
              {/each}
            </div>

            <section>
              <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">Account details</h3>
              <dl class="mt-3 grid gap-3 sm:grid-cols-2">
                {#each [["Email", selectedCustomer.email], ["Phone", selectedCustomer.phone ?? "Not provided"], ["Joined", fullDate(selectedCustomer.created_at)], ...extraFields(selectedCustomer, "customer")] as [label, value]}
                  <div class="rounded-xl bg-white p-4 ring-1 ring-[#e3ebe5]"><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd class="mt-1 break-words font-semibold">{value}</dd></div>
                {/each}
              </dl>
            </section>

            <section>
              <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">Delivery addresses used</h3>
              <ul class="mt-3 space-y-2">
                {#each customerAddresses as address}
                  <li class="rounded-xl bg-white p-4 text-sm ring-1 ring-[#e3ebe5]">{address}</li>
                {:else}
                  <li class="rounded-xl bg-[#f4f8f5] p-4 text-sm text-slate-500">No orders placed yet.</li>
                {/each}
              </ul>
            </section>

            <section>
              <h3 class="text-sm font-bold uppercase tracking-wide text-slate-500">Order history ({customerOrders.length})</h3>
              <ul class="mt-3 space-y-3">
                {#each customerOrders.slice(0, 8) as order (order.id)}
                  <li class="rounded-xl bg-white p-4 ring-1 ring-[#e3ebe5]">
                    <div class="flex items-start justify-between gap-3"><div><p class="font-semibold">Order #{order.id}</p><p class="text-xs text-slate-500">{fullDate(order.created_at)}</p></div><div class="text-right"><span class={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badgeClass(order.status)}`}>{order.status}</span><p class="mt-1 text-sm font-bold">{currency.format(order.total_amount)}</p></div></div>
                    <p class="mt-2 text-sm text-slate-600">{(order.items ?? []).map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")}</p>
                  </li>
                {:else}
                  <li class="rounded-xl bg-[#f4f8f5] p-4 text-sm text-slate-500">This customer has not ordered yet.</li>
                {/each}
              </ul>
              {#if customerOrders.length > 8}<p class="mt-2 text-xs text-slate-500">+ {customerOrders.length - 8} more orders</p>{/if}
            </section>
          {/if}
        </div>
      </dialog>
    </div>
  {/if}
</PortalLayout>
<script>
  import { router, useForm } from "@inertiajs/svelte";
  import DashboardTabs from "../../components/DashboardTabs.svelte";
  import DashboardWelcome from "../../components/DashboardWelcome.svelte";
  import MessageInbox from "../../components/MessageInbox.svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { auth, farms = [], products = [], orders = [], customers = [], conversations = [], stats = {}, flash } = $props();
  let activeView = $state("overview");
  let farmForm = useForm({ farm_name: "", location: "", county: "", description: "" });
  let editingFarmId = $state(null);
  let farmEditForm = useForm({ farm_name: "", location: "", county: "", description: "", farm_size: "", farm_size_unit: "acres", phone: "", email: "", status: "active" });
  let productForm = useForm({ farm_id: "", name: "", category: "", description: "", price: "", unit: "kg", quantity_posted: "", image: null });
  let editingProductId = $state(null);
  let inventoryForm = useForm({ price: "", quantity_posted: "", status: "available" });
  let bulkForm = useForm({ products: [] });
  let bulkFarmId = $state("");
  let bulkFileName = $state("");
  let bulkError = $state("");
  let bulkImporting = $state(false);
  let bulkFileInput = $state(null);
  let autoRefresh = $state(typeof window !== "undefined" && window.localStorage.getItem("modern-farms-producer-auto-refresh") === "true");
  let orderFilter = $state("all");
  let updating = $state({});
  let deliveryForms = $state({});
  let deleting = $state({});
  let deletionErrors = $state({});

  $effect(() => {
    for (const order of orders) {
      if (!deliveryForms[order.id]) {
        deliveryForms[order.id] = useForm({
          delivery_fee: order.delivery_fee ?? "",
          courier_name: order.courier_name ?? "",
          tracking_number: order.tracking_number ?? "",
          estimated_delivery_at: order.estimated_delivery_at ?? "",
        });
      }
    }
  });

  const currency = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 2 });
  const quantityFormat = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 2 });
  const nextStatuses = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["ready", "cancelled"],
    ready: ["shipped", "cancelled"],
    shipped: ["delivered"],
  };
  const progress = ["pending", "confirmed", "processing", "ready", "shipped", "delivered"];
  const actionLabel = { confirmed: "Accept order", processing: "Start processing", ready: "Mark ready", shipped: "Mark shipped", delivered: "Mark delivered" };
  const labelFor = (order, status) => status === "cancelled" ? (order.status === "pending" ? "Decline order" : "Cancel order") : actionLabel[status];
  const badge = {
    pending: "bg-amber-100 text-amber-800", confirmed: "bg-blue-100 text-blue-800", processing: "bg-indigo-100 text-indigo-800",
    ready: "bg-teal-100 text-teal-800", shipped: "bg-sky-100 text-sky-800", delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-700",
    available: "bg-green-100 text-green-800", active: "bg-green-100 text-green-800", inactive: "bg-slate-200 text-slate-700", sold_out: "bg-red-100 text-red-700"
  };
  const badgeClass = (s) => badge[s] ?? "bg-slate-100 text-slate-700";

  const card = "rounded-2xl border border-[#e3ebe5] bg-white shadow-[0_8px_30px_-22px_rgba(24,69,42,.35)]";
  const btnPrimary = "rounded-xl bg-[#176b3b] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b482b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#176b3b] disabled:cursor-not-allowed disabled:opacity-60";
  const btnDanger = "rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60";
  const field = "mt-1.5 w-full rounded-xl border border-[#d6e0d8] bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-[#438150] focus:outline-none focus:ring-2 focus:ring-[#438150]/25";
  const cell = "rounded-lg border border-[#d6e0d8] px-2 py-1.5 text-sm focus:border-[#438150] focus:outline-none focus:ring-2 focus:ring-[#438150]/25";
  const lbl = "block text-sm font-semibold";
  let bulkErrors = $derived(Object.entries(bulkForm.errors)
    .filter(([key]) => key === "products" || key.startsWith("products."))
    .map(([, message]) => message));

  const icons = {
    box: "M4 8l8-4 8 4v8l-8 4-8-4V8zm0 0l8 4m0 0l8-4m-8 4v8",
    leaf: "M12 21v-8m0 0c0-4 3-6 7-6 0 4-3 6-7 6zm0 0c0-3-2-5-6-5 0 3 2 5 6 5z",
    receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6",
    clock: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z"
  };

  let pendingOrders = $derived(orders.filter((o) => o.status === "pending"));
  let recentOrders = $derived(orders.slice(0, 3));
  let unreadMessages = $derived(conversations.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0));
  let filteredOrders = $derived(orders.filter((o) => orderFilter === "all" || o.status === orderFilter));
  let lowStock = $derived(products.filter((p) => p.status === "available" && p.quantity_remaining <= 5));
  let initials = $derived((auth.user.full_name ?? "?").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase());

  let tabs = $derived([
    { view: "overview", label: "Overview", icon: "⌂" },
    { view: "farms", label: "Farms", icon: "⌘" },
    { view: "inventory", label: "Inventory", icon: "▦", badge: lowStock.length || null, tone: "bg-red-500 text-white" },
    { view: "orders", label: "Orders", icon: "▤", badge: pendingOrders.length || null, tone: "bg-amber-400 text-amber-950", count: stats.orders ?? orders.length },
    { view: "customers", label: "Customers", icon: "♙" },
    { view: "analytics", label: "Analytics", icon: "◷" },
    { view: "messages", label: "Messages", icon: "✉", count: unreadMessages || undefined },
    { view: "profile", label: "Profile", icon: "◎" },
    { view: "settings", label: "Settings", icon: "⚙" }
  ]);

  let statCards = $derived([
    { label: "Products", value: stats.products ?? 0, icon: icons.box, tile: "bg-indigo-100", stroke: "#4338ca", view: "inventory" },
    { label: "Available inventory", value: `${stats.inventory ?? 0}`, icon: icons.leaf, tile: "bg-[#e7f3df]", stroke: "#176b3b", view: "inventory", sub: lowStock.length ? `${lowStock.length} running low` : "Stock levels healthy" },
    { label: "Orders", value: stats.orders ?? 0, icon: icons.receipt, tile: "bg-teal-100", stroke: "#0f766e", view: "orders" },
    { label: "Pending orders", value: stats.pending_orders ?? pendingOrders.length, icon: icons.clock, tile: "bg-amber-100", stroke: "#b45309", view: "orders", alert: (stats.pending_orders ?? pendingOrders.length) > 0, sub: "Waiting for your approval" }
  ]);

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
    farmForm.post("/dashboard/farms", {
      preserveScroll: true,
      onSuccess: () => {
        farmForm.resetAndClearErrors();
        productForm.farm_id = farms[0]?.id ?? "";
      },
    });
  }

  function startEditingFarm(farm) {
    editingFarmId = farm.id;
    farmEditForm.farm_name = farm.farm_name;
    farmEditForm.location = farm.location ?? "";
    farmEditForm.county = farm.county ?? "";
    farmEditForm.description = farm.description ?? "";
    farmEditForm.farm_size = farm.farm_size ?? "";
    farmEditForm.farm_size_unit = farm.farm_size_unit ?? "acres";
    farmEditForm.phone = farm.phone ?? "";
    farmEditForm.email = farm.email ?? "";
    farmEditForm.status = farm.status;
    farmEditForm.clearErrors();
  }

  function saveFarmEdit(event, farm) {
    event.preventDefault();
    farmEditForm.put(`/dashboard/farms/${farm.id}`, {
      preserveScroll: true,
      onSuccess: () => { editingFarmId = null; },
    });
  }

  function deleteFarm(farm) {
    if (!window.confirm(`Delete "${farm.farm_name}" and all ${farm.products_count} of its products? Farms with order history cannot be deleted.`)) return;

    const key = `farm-${farm.id}`;
    delete deletionErrors[key];
    router.delete(`/dashboard/farms/${farm.id}`, {
      preserveScroll: true,
      onStart: () => { deleting[key] = true; },
      onError: (errors) => { deletionErrors[key] = Object.values(errors)[0] ?? "The farm could not be deleted."; },
      onSuccess: () => {
        delete deletionErrors[key];
        if (String(productForm.farm_id) === String(farm.id)) {
          productForm.farm_id = farms.find((item) => item.id !== farm.id)?.id ?? "";
        }
      },
      onFinish: () => { delete deleting[key]; },
    });
  }

  function saveProduct(event) {
    event.preventDefault();
    productForm.farm_id ||= farms[0]?.id ?? "";
    productForm.post("/dashboard/products", {
      preserveScroll: true,
      onSuccess: () => {
        productForm.resetAndClearErrors();
      },
    });
  }

  function deleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}" from your inventory? Products with order history cannot be deleted.`)) return;

    const key = `product-${product.id}`;
    delete deletionErrors[key];
    router.delete(`/dashboard/products/${product.id}`, {
      preserveScroll: true,
      onStart: () => { deleting[key] = true; },
      onError: (errors) => { deletionErrors[key] = Object.values(errors)[0] ?? "The product could not be deleted."; },
      onSuccess: () => {
        delete deletionErrors[key];
        if (editingProductId === product.id) editingProductId = null;
      },
      onFinish: () => { delete deleting[key]; },
    });
  }

  function parseProductCsv(csv, farmId) {
    const records = [];
    let row = [];
    let fieldValue = "";
    let insideQuotes = false;
    const lines = csv.replace(/^\uFEFF/, "");

    for (let index = 0; index < lines.length; index += 1) {
      const character = lines[index];

      if (insideQuotes) {
        if (character === '"' && lines[index + 1] === '"') {
          fieldValue += '"';
          index += 1;
        } else if (character === '"') {
          insideQuotes = false;
        } else {
          fieldValue += character;
        }
      } else if (character === '"' && fieldValue.length === 0) {
        insideQuotes = true;
      } else if (character === ",") {
        row.push(fieldValue.trim());
        fieldValue = "";
      } else if (character === "\n") {
        row.push(fieldValue.trim());
        if (row.some((value) => value !== "")) records.push(row);
        row = [];
        fieldValue = "";
      } else if (character !== "\r") {
        fieldValue += character;
      }
    }

    if (insideQuotes) {
      throw new Error("The CSV has an unclosed quoted field.");
    }
    if (fieldValue.length > 0 || row.length > 0) {
      row.push(fieldValue.trim());
      if (row.some((value) => value !== "")) records.push(row);
    }
    if (records.length < 2) {
      throw new Error("The CSV needs a header row and at least one product.");
    }

    const headers = records.shift().map((header) => header.toLowerCase());
    if (new Set(headers).size !== headers.length) {
      throw new Error("The CSV has duplicate column names.");
    }

    const allowedHeaders = ["name", "category", "description", "price", "unit", "quantity_posted", "image"];
    const unknownHeaders = headers.filter((header) => !allowedHeaders.includes(header));
    if (unknownHeaders.length > 0) {
      throw new Error(`Unknown columns: ${unknownHeaders.join(", ")}.`);
    }

    const requiredHeaders = ["name", "category", "price", "quantity_posted"];
    const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(", ")}.`);
    }

    if (records.length > 1500) {
      throw new Error("A single upload can contain at most 1,500 products.");
    }

    return records.map((values, index) => {
      if (values.length !== headers.length) {
        throw new Error(`Row ${index + 2} has a different number of values than the header.`);
      }

      const rowValues = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]]));
      const price = rowValues.price;
      const quantity = rowValues.quantity_posted;

      if (!rowValues.name || !rowValues.category) {
        throw new Error(`Row ${index + 2} needs a product name and category.`);
      }
      if (!/^\d+(\.\d{1,2})?$/.test(price) || !/^\d+(\.\d{1,2})?$/.test(quantity) || Number(quantity) <= 0) {
        throw new Error(`Row ${index + 2} needs a valid price and a positive quantity (up to 2 decimal places).`);
      }

      return {
        farm_id: farmId,
        name: rowValues.name,
        category: rowValues.category,
        description: rowValues.description || null,
        price,
        unit: rowValues.unit || "kg",
        quantity_posted: quantity,
        image: rowValues.image || null,
      };
    });
  }

  async function importProducts(event) {
    event.preventDefault();
    bulkError = "";
    const file = bulkFileInput?.files?.[0];

    if (!bulkFarmId) {
      bulkError = "Choose a farm for these product listings.";
      return;
    }
    if (!file) {
      bulkError = "Choose a CSV file to upload.";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      bulkError = "The CSV file must be 2 MB or smaller.";
      return;
    }

    try {
      const productsToImport = parseProductCsv(await file.text(), bulkFarmId);
      bulkFileName = file.name;
      bulkImporting = true;
      bulkForm.products = productsToImport;
      bulkForm.post("/dashboard/products/bulk", {
        preserveScroll: true,
        onSuccess: () => {
          bulkError = "";
          bulkFileName = "";
          bulkForm.resetAndClearErrors();
          if (bulkFileInput) bulkFileInput.value = "";
        },
        onError: (validationErrors) => {
          bulkError = Object.values(validationErrors).find(Boolean) ?? "Check the product rows and try again.";
        },
        onFinish: () => {
          bulkImporting = false;
        },
      });
    } catch (error) {
      bulkError = error instanceof Error ? error.message : "The CSV could not be read.";
    }
  }

  function downloadCsvTemplate() {
    const csv = "name,category,description,price,unit,quantity_posted,image\nTomatoes,Vegetables,Fresh tomatoes,120,kg,15,\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "modern-farms-products-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function startEditingProduct(product) {
    editingProductId = product.id;
    inventoryForm.price = product.price;
    inventoryForm.quantity_posted = product.quantity_posted;
    inventoryForm.status = product.status === "inactive" ? "inactive" : "available";
    inventoryForm.clearErrors();
  }

  function saveInventory(product) {
    inventoryForm.put(`/dashboard/products/${product.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        editingProductId = null;
        inventoryForm.resetAndClearErrors();
      },
    });
  }

  function setOrderStatus(order, status) {
    if (updating[order.id]) return; // ignore repeat clicks while a request is in flight
    updating[order.id] = true;
    router.post(`/dashboard/orders/${order.id}/status`, { status }, {
      preserveScroll: true,
      onFinish: () => delete updating[order.id],
    });
  }

  function saveDeliveryDetails(order) {
    const form = deliveryForms[order.id];
    if (!form || updating[order.id]) return;

    updating[order.id] = true;
    form.post(`/dashboard/orders/${order.id}/status`, {
      preserveScroll: true,
      onFinish: () => { updating[order.id] = false; },
    });
  }

  function formatDate(value) {
    return value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value)) : "";
  }
</script>

<PortalLayout title="Producer dashboard" user={auth.user}>
  <section class="dashboard-shell mx-auto max-w-7xl space-y-5 px-5 py-6 lg:px-8 lg:py-8" data-dashboard-role="producer">
    <DashboardWelcome compact accent="producer" eyebrow="Producer portal" title={`Welcome, ${auth.user.full_name}`} description="Manage your farms, products, inventory and customer orders">
      {#snippet children()}
        {#if auth.user.status === "active"}
          {#if pendingOrders.length > 0}
            <button type="button" onclick={() => (activeView = "orders")} class="w-full rounded-2xl border border-amber-200/30 bg-amber-300 px-5 py-3.5 text-left text-sm font-extrabold text-amber-950 shadow-lg transition hover:bg-amber-200 sm:w-auto">
              <span class="block text-xs font-bold uppercase tracking-wide text-amber-900/70">Action needed</span>
              <span class="mt-1 block">{pendingOrders.length} new order{pendingOrders.length === 1 ? "" : "s"} to approve <span aria-hidden="true">→</span></span>
            </button>
          {:else}
            <p class="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.09] px-4 py-3 text-sm font-semibold text-green-50">
              <span class="grid size-9 place-items-center rounded-xl bg-[#c6df9e]/15 text-[#c6df9e]" aria-hidden="true">✓</span>
              <span><span class="block text-xs font-bold uppercase tracking-wide text-green-50/65">Orders</span><span class="mt-0.5 block">No orders waiting</span></span>
            </p>
          {/if}
        {/if}
      {/snippet}
    </DashboardWelcome>

    <div class={`items-start gap-5 xl:gap-6 ${auth.user.status === "active" ? "grid lg:grid-cols-[190px_minmax(0,1fr)]" : ""}`}>
      {#if auth.user.status === "active"}
        <DashboardTabs
          tabs={tabs}
          activeView={activeView}
          onSelect={(view) => (activeView = view)}
          label="Producer dashboard sections"
          heading="Farm workspace"
          description="Manage your operation"
          accent="producer"
        />
      {/if}
      <div class="min-w-0">

    {#if flash?.status}
      <p class="mt-6 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm font-medium text-green-900" role="status"><span aria-hidden="true">✓</span> {flash.status}</p>
    {/if}

    {#if auth.user.status !== "active"}
      <div class="mt-8 flex gap-5 rounded-3xl border border-amber-200 bg-amber-50 p-7 text-amber-950">
        <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-200" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z" /></svg>
        </span>
        <div>
          <h2 class="text-lg font-bold">Your producer account is awaiting approval</h2>
          <p class="mt-2 text-sm leading-6">An administrator must approve your account before farm and inventory tools become available. We'll unlock everything as soon as it's approved.</p>
        </div>
      </div>
    {:else if activeView === "overview"}
      <div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {#each statCards as s}
          <button type="button" onclick={() => (activeView = s.view)} class={`${card} min-h-20 p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-xl ${s.alert ? "ring-2 ring-amber-300" : ""}`}>
            <p class="text-sm font-medium text-slate-500">{s.label}</p>
            <p class="mt-0.5 text-2xl font-extrabold tracking-tight text-[#813f29]">{s.value}</p>
            {#if s.sub}<p class="mt-0.5 text-xs text-slate-500">{s.sub}</p>{/if}
          </button>
        {/each}
      </div>

      <div class="mt-3 grid items-start gap-3 lg:grid-cols-[1.4fr_1fr]">
        <article class={`${card} min-w-0 p-4 sm:p-5`}>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div><h2 class="text-lg font-bold">Orders awaiting your approval</h2><p class="mt-1 text-sm text-slate-500">Accept or decline new orders from customers.</p></div>
            <button type="button" class="text-sm font-bold text-[#a84c2d] hover:underline" onclick={() => (activeView = "orders")}>View all →</button>
          </div>
          {#if pendingOrders.length === 0}
            <div class="mt-4 flex items-center gap-3 rounded-xl bg-[#fbf0eb] px-4 py-3">
              <span class="rounded-full bg-[#dcefe1] px-2.5 py-1 text-xs font-bold text-[#286344]">Done</span>
              <span><span class="block text-sm font-bold">You're all caught up</span><span class="block text-xs text-slate-600">New orders will appear here</span></span>
            </div>
          {:else}
            <ul class="mt-3 divide-y divide-slate-100">
              {#each pendingOrders.slice(0, 4) as order (order.id)}
                <li class="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p class="font-bold">#{order.id} · {order.customer_name ?? "Customer"}</p><p class="text-sm text-slate-500">{order.items.length} item{order.items.length === 1 ? "" : "s"} · {currency.format(order.total_amount)}</p></div>
                  <div class="flex gap-2">
                    <button type="button" class={btnPrimary} disabled={updating[order.id]} onclick={() => setOrderStatus(order, "confirmed")}>Accept</button>
                    <button type="button" class={btnDanger} disabled={updating[order.id]} onclick={() => setOrderStatus(order, "cancelled")}>Decline</button>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}

          <div class="mt-3 border-t border-slate-100 pt-3">
            <h3 class="text-sm font-bold">Recent orders</h3>
            {#if recentOrders.length}
              <ul class="mt-1 divide-y divide-slate-100">
                {#each recentOrders as order (order.id)}
                  <li class="flex items-center justify-between gap-3 py-2.5">
                    <span class="min-w-0"><span class="block truncate text-sm font-semibold">#{order.id} {order.customer_name ?? "Customer"}</span><span class="block text-xs text-slate-500">{order.items.length} item{order.items.length === 1 ? "" : "s"}</span></span>
                    <span class={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${badgeClass(order.status)}`}>{order.status}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="mt-2 text-sm text-slate-500">Your order activity will appear here.</p>
            {/if}
          </div>
        </article>

        <div class="space-y-3">
          <article class={`${card} p-4 sm:p-5`}>
            <h2 class="text-lg font-bold">Low stock</h2>
            {#if lowStock.length === 0}
              <p class="mt-3 rounded-xl bg-[#e8f3e9] p-3 text-sm font-medium text-[#315d42]">All listings are well stocked</p>
            {:else}
              <ul class="mt-4 space-y-2">
                {#each lowStock.slice(0, 4) as product (product.id)}
                  <li class="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm"><span class="font-semibold">{product.name}</span><span class="font-bold text-amber-800">{product.quantity_remaining} {product.unit} left</span></li>
                {/each}
              </ul>
              <button type="button" class="mt-3 text-sm font-bold text-[#a84c2d] hover:underline" onclick={() => (activeView = "inventory")}>Update stock →</button>
            {/if}
          </article>
          <article class={`${card} p-4 sm:p-5`}>
            <div class="flex items-center justify-between gap-4">
              <h2 class="text-lg font-bold">Your farms</h2>
              <button type="button" class="text-sm font-bold text-[#a84c2d] hover:underline" onclick={() => (activeView = "farms")}>Manage farms</button>
            </div>
            {#if farms.length === 0}
              <p class="mt-4 text-sm text-slate-600">Add a farm to start listing products.</p>
            {:else}
              <ul class="mt-3 divide-y divide-slate-100">
                {#each farms.slice(0, 4) as farm (farm.id)}
                  <li class="flex justify-between gap-3 py-3"><span class="font-semibold">{farm.farm_name}</span><span class="text-sm text-slate-500">{farm.products_count} products</span></li>
                {/each}
              </ul>
            {/if}
          </article>
        </div>
      </div>
    {:else if activeView === "farms"}
      <div class="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article class={`${card} p-6`}>
          <h2 class="text-2xl font-bold tracking-tight">Farm profiles</h2>
          {#if farms.length === 0}
            <div class="mt-5 rounded-xl bg-[#f4f8f5] p-8 text-center text-sm text-slate-600">No farms added yet. Use the form to add your first farm.</div>
          {:else}
            <div class="mt-5 space-y-4">
              {#each farms as farm (farm.id)}
                <div class="rounded-2xl border border-[#e3ebe5] p-5">
                  {#if editingFarmId === farm.id}
                    <form onsubmit={(event) => saveFarmEdit(event, farm)} class="grid gap-4 sm:grid-cols-2">
                      <div><label for={`edit-farm-name-${farm.id}`} class={lbl}>Farm name</label><input id={`edit-farm-name-${farm.id}`} bind:value={farmEditForm.farm_name} required maxlength="150" class={field} aria-invalid={farmEditForm.errors.farm_name ? "true" : undefined} />{#if farmEditForm.errors.farm_name}<p class="mt-1 text-sm text-red-700" role="alert">{farmEditForm.errors.farm_name}</p>{/if}</div>
                      <div><label for={`edit-farm-location-${farm.id}`} class={lbl}>Location</label><input id={`edit-farm-location-${farm.id}`} bind:value={farmEditForm.location} class={field} /></div>
                      <div><label for={`edit-farm-county-${farm.id}`} class={lbl}>County</label><input id={`edit-farm-county-${farm.id}`} bind:value={farmEditForm.county} class={field} /></div>
                      <div><label for={`edit-farm-phone-${farm.id}`} class={lbl}>Phone</label><input id={`edit-farm-phone-${farm.id}`} bind:value={farmEditForm.phone} class={field} /></div>
                      <div><label for={`edit-farm-email-${farm.id}`} class={lbl}>Email</label><input id={`edit-farm-email-${farm.id}`} bind:value={farmEditForm.email} type="email" class={field} /></div>
                      <div class="grid grid-cols-2 gap-2"><div><label for={`edit-farm-size-${farm.id}`} class={lbl}>Size</label><input id={`edit-farm-size-${farm.id}`} bind:value={farmEditForm.farm_size} type="number" min="0" step="0.01" class={field} /></div><div><label for={`edit-farm-size-unit-${farm.id}`} class={lbl}>Unit</label><input id={`edit-farm-size-unit-${farm.id}`} bind:value={farmEditForm.farm_size_unit} class={field} /></div></div>
                      <div class="sm:col-span-2"><label for={`edit-farm-description-${farm.id}`} class={lbl}>Description</label><textarea id={`edit-farm-description-${farm.id}`} bind:value={farmEditForm.description} rows="2" class={field}></textarea></div>
                      <div><label for={`edit-farm-status-${farm.id}`} class={lbl}>Farm status</label><select id={`edit-farm-status-${farm.id}`} bind:value={farmEditForm.status} class={field}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                      <div class="flex items-end gap-3"><button class={btnPrimary}>Save changes</button><button type="button" class="font-semibold text-slate-500 hover:underline" onclick={() => (editingFarmId = null)}>Cancel</button></div>
                    </form>
                  {:else}
                    <div class="flex flex-wrap items-start justify-between gap-3">
                      <div class="flex items-start gap-4">
                        <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e7f3df]" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#176b3b" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d={icons.leaf} /></svg></span>
                        <div><h3 class="text-lg font-bold">{farm.farm_name}</h3><p class="mt-1 text-sm text-slate-600">{[farm.location, farm.county].filter(Boolean).join(", ") || "Location not set"}</p></div>
                      </div>
                      <div class="flex flex-wrap items-center gap-3"><span class={`rounded-full px-3 py-1 text-xs font-bold capitalize ${badgeClass(farm.status)}`}>{farm.status}</span><button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={() => startEditingFarm(farm)}>Edit</button><button type="button" class="text-sm font-bold text-red-700 hover:underline disabled:opacity-50" aria-label={`Delete ${farm.farm_name}`} disabled={deleting[`farm-${farm.id}`]} onclick={() => deleteFarm(farm)}>{deleting[`farm-${farm.id}`] ? "Deleting…" : "Delete farm"}</button></div>
                    </div>
                    {#if farm.description}<p class="mt-4 text-sm leading-6 text-slate-600">{farm.description}</p>{/if}
                    <p class="mt-4 inline-block rounded-full bg-[#f1f6ef] px-3 py-1 text-xs font-semibold text-slate-600">{farm.products_count} listed products{farm.farm_size ? ` · ${farm.farm_size} ${farm.farm_size_unit ?? "acres"}` : ""}</p>
                    {#if deletionErrors[`farm-${farm.id}`]}<p class="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{deletionErrors[`farm-${farm.id}`]}</p>{/if}
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </article>
        <form onsubmit={saveFarm} class={`${card} p-6`}>
          <h2 class="text-lg font-bold">Add a farm</h2>
          <label class={`${lbl} mt-4`} for="farm-name">Farm name</label>
          <input id="farm-name" bind:value={farmForm.farm_name} maxlength="150" required class={field} />
          {#if farmForm.errors.farm_name}<p class="mt-1 text-sm text-red-700" role="alert">{farmForm.errors.farm_name}</p>{/if}
          <label class={`${lbl} mt-4`} for="farm-location">Location</label>
          <input id="farm-location" bind:value={farmForm.location} maxlength="200" class={field} />
          <label class={`${lbl} mt-4`} for="farm-county">County</label>
          <input id="farm-county" bind:value={farmForm.county} maxlength="100" class={field} />
          <label class={`${lbl} mt-4`} for="farm-description">Description</label>
          <textarea id="farm-description" bind:value={farmForm.description} rows="3" class={field}></textarea>
          <button class={`${btnPrimary} mt-5 w-full py-3`}>Save farm</button>
        </form>
      </div>
    {:else if activeView === "inventory"}
      <div class="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article class={`${card} overflow-hidden`}>
          <div class="border-b border-slate-100 p-6"><h2 class="text-2xl font-bold tracking-tight">Inventory</h2><p class="mt-1 text-sm text-slate-500">Update stock levels and marketplace availability.</p></div>
          {#if products.length === 0}
            <p class="p-8 text-center text-sm text-slate-600">Add a farm before creating product listings.</p>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] text-left text-sm">
                <thead class="bg-[#f4f8f5] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-6 py-3.5 font-semibold">Product</th><th class="px-6 py-3.5 font-semibold">Price</th><th class="px-6 py-3.5 font-semibold">Stock</th><th class="px-6 py-3.5 font-semibold">Status</th><th class="px-6 py-3.5 font-semibold">Actions</th></tr></thead>
                <tbody class="divide-y divide-slate-100">
                  {#each products as product (product.id)}
                    <tr class="transition hover:bg-[#fafcf9]">
                      <td class="px-6 py-4"><p class="font-semibold">{product.name}</p><p class="text-xs text-slate-500">{product.farm_name} · {product.category}</p></td>
                      <td class="px-6 py-4">
                        {#if editingProductId === product.id}
                          <input aria-label={`Price for ${product.name}`} bind:value={inventoryForm.price} type="number" min="0" step="0.01" class={`${cell} w-28`} />
                        {:else}
                          <span class="font-semibold">{currency.format(product.price)}</span> <span class="text-slate-500">/ {product.unit}</span>
                        {/if}
                      </td>
                      <td class="px-6 py-4">
                        {#if editingProductId === product.id}
                          <input aria-label={`Quantity for ${product.name}`} bind:value={inventoryForm.quantity_posted} type="number" min="0" step="0.01" class={`${cell} w-24`} />
                        {:else}
                          <span class={product.quantity_remaining <= 5 ? "font-bold text-amber-700" : "font-semibold"}>{product.quantity_remaining} {product.unit}</span><p class="text-xs text-slate-500">{product.quantity_sold} sold</p>
                        {/if}
                      </td>
                      <td class="px-6 py-4">
                        {#if editingProductId === product.id}
                          <select bind:value={inventoryForm.status} aria-label={`Listing status for ${product.name}`} class={cell}><option value="available">Available</option><option value="inactive">Paused</option></select>
                        {:else}
                          <span class={`rounded-full px-3 py-1 text-xs font-bold capitalize ${badgeClass(product.status)}`}>{product.status.replaceAll("_", " ")}</span>
                        {/if}
                      </td>
                      <td class="px-6 py-4">
                        {#if editingProductId === product.id}
                          <div class="flex gap-3"><button type="button" class="font-bold text-[#176b3b] hover:underline" onclick={() => saveInventory(product)}>Save</button><button type="button" class="font-semibold text-slate-500 hover:underline" onclick={() => (editingProductId = null)}>Cancel</button></div>
                        {:else}
                          <div class="flex flex-wrap items-center gap-x-3 gap-y-2"><button type="button" class="font-bold text-[#176b3b] hover:underline" onclick={() => startEditingProduct(product)}>Edit stock</button><button type="button" class="font-bold text-red-700 hover:underline disabled:opacity-50" aria-label={`Delete ${product.name}`} disabled={deleting[`product-${product.id}`]} onclick={() => deleteProduct(product)}>{deleting[`product-${product.id}`] ? "Deleting…" : "Delete"}</button></div>
                          {#if deletionErrors[`product-${product.id}`]}<p class="mt-2 max-w-48 text-xs text-red-700" role="alert">{deletionErrors[`product-${product.id}`]}</p>{/if}
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </article>
        <div class="grid gap-6">
        <form onsubmit={saveProduct} class={`${card} p-6`}>
          <h2 class="text-lg font-bold">Add a product</h2>
          {#if farms.length === 0}
            <p class="mt-3 rounded-xl bg-[#f4f8f5] p-4 text-sm text-slate-600">Create a farm before adding products.</p>
          {:else}
            <label for="product-farm" class={`${lbl} mt-4`}>Farm</label>
            <select id="product-farm" value={productForm.farm_id || farms[0]?.id || ""} onchange={(event) => (productForm.farm_id = event.currentTarget.value)} required class={field}>
              {#each farms as farm (farm.id)}<option value={farm.id}>{farm.farm_name}</option>{/each}
            </select>
            <label for="product-name" class={`${lbl} mt-4`}>Product name</label>
            <input id="product-name" bind:value={productForm.name} maxlength="150" required class={field} />
            {#if productForm.errors.name}<p class="mt-1 text-sm text-red-700" role="alert">{productForm.errors.name}</p>{/if}
            <label for="product-category" class={`${lbl} mt-4`}>Category</label>
            <input id="product-category" bind:value={productForm.category} maxlength="100" required class={field} />
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div><label for="product-price" class={lbl}>Price (KES)</label><input id="product-price" bind:value={productForm.price} type="number" min="0" step="0.01" required class={field} /></div>
              <div><label for="product-stock" class={lbl}>Quantity</label><input id="product-stock" bind:value={productForm.quantity_posted} type="number" min="0.01" step="0.01" required class={field} /></div>
            </div>
            <label for="product-unit" class={`${lbl} mt-4`}>Unit</label>
            <input id="product-unit" bind:value={productForm.unit} maxlength="50" class={field} />
            <label for="product-description" class={`${lbl} mt-4`}>Description</label>
            <textarea id="product-description" bind:value={productForm.description} rows="3" class={field}></textarea>
            <label for="product-image" class={`${lbl} mt-4`}>Product image</label>
            <input id="product-image" type="file" accept="image/jpeg,image/png,image/webp" onchange={(event) => (productForm.image = event.currentTarget.files?.[0] ?? null)} class={`${field} file:mr-3 file:rounded-lg file:border-0 file:bg-[#eaf1e3] file:px-3 file:py-2 file:font-semibold file:text-[#173f2a]`} />
            {#if productForm.errors.image}<p class="mt-1 text-sm text-red-700" role="alert">{productForm.errors.image}</p>{/if}
            <button class={`${btnPrimary} mt-5 w-full py-3`}>Add to marketplace</button>
          {/if}
        </form>
        <section class={`${card} p-6`} aria-labelledby="bulk-products-heading">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="bulk-products-heading" class="text-lg font-bold">Upload a product CSV</h2>
              <p class="mt-1 text-sm leading-6 text-slate-600">Add up to 1,500 listings to one of your farms in a single upload.</p>
            </div>
            <button type="button" class="text-sm font-bold text-[#176b3b] hover:underline" onclick={downloadCsvTemplate}>Download template</button>
          </div>
          {#if farms.length > 0}
            <form onsubmit={importProducts} class="mt-4 grid gap-4">
              <label for="bulk-product-farm" class={lbl}>Farm for these products</label>
              <select id="bulk-product-farm" bind:value={bulkFarmId} required class={field}>
                <option value="">Choose a farm</option>
                {#each farms as farm (farm.id)}
                  <option value={farm.id}>{farm.farm_name}</option>
                {/each}
              </select>
              <label for="bulk-product-file" class={lbl}>CSV file</label>
              <input bind:this={bulkFileInput} id="bulk-product-file" type="file" accept=".csv,text/csv" class={`${field} file:mr-3 file:rounded-lg file:border-0 file:bg-[#eaf1e3] file:px-3 file:py-2 file:font-semibold file:text-[#173f2a]`} />
              {#if bulkFileName}<p class="text-xs text-slate-500">Selected: {bulkFileName}</p>{/if}
              <p class="text-xs leading-5 text-slate-500">Required columns: name, category, price, quantity_posted. Optional: description, unit, image. Quote values containing commas or line breaks.</p>
              {#if bulkError}<p class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{bulkError}</p>{/if}
              {#each bulkErrors.slice(0, 3) as message}
                <p class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{message}</p>
              {/each}
              <button type="submit" class={`${btnPrimary} w-full py-3`} disabled={bulkImporting || bulkForm.processing}>
                {bulkImporting || bulkForm.processing ? "Uploading products…" : "Upload products"}
              </button>
            </form>
          {:else}
            <p class="mt-4 rounded-xl bg-[#f4f8f5] p-4 text-sm text-slate-600">Create a farm before uploading product listings.</p>
          {/if}
        </section>
        </div>
      </div>
    {:else if activeView === "orders"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Customer orders</h2>
        <p class="mt-1 text-sm text-slate-500">You approve and fulfil orders for your products. Move each order forward as it progresses.</p>
        <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter orders by status">
          {#each ["all", ...progress, "cancelled"] as st}
            <button type="button" aria-pressed={orderFilter === st} onclick={() => (orderFilter = st)} class={`rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition ${orderFilter === st ? "bg-[#176b3b] text-white" : "border border-[#d6e0d8] bg-white text-slate-600 hover:border-[#438150]"}`}>{st}</button>
          {/each}
        </div>
        {#if orders.length === 0}
          <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center text-sm text-slate-600">Orders for your products will appear here.</div>
        {:else}
          <div class="mt-5 space-y-5">
            {#each filteredOrders as order (order.id)}
              {@const step = progress.indexOf(order.status)}
              <article class={`${card} p-6 ${order.status === "pending" ? "ring-2 ring-amber-300" : ""}`}>
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div><h3 class="text-lg font-bold">Order #{order.id} · {order.customer_name ?? "Customer"}</h3><p class="mt-1 text-sm text-slate-500">{formatDate(order.created_at)} · {order.delivery_address}</p></div>
                  <div class="text-right"><span class={`rounded-full px-3 py-1 text-sm font-bold capitalize ${badgeClass(order.status)}`}>{order.status === "pending" ? "Awaiting approval" : order.status}</span><p class="mt-2 text-lg font-extrabold text-[#173f2a]">{currency.format(order.total_amount)}</p></div>
                </div>
                {#if order.status !== "cancelled"}
                  <ol class="mt-5 grid grid-cols-6 gap-1" aria-label="Order progress">
                    {#each progress as p, i}
                      <li class="text-center"><span class={`block h-1.5 rounded-full ${i <= step ? "bg-[#176b3b]" : "bg-slate-200"}`}></span><span class={`mt-1.5 block text-[11px] font-semibold capitalize ${i <= step ? "text-[#176b3b]" : "text-slate-400"}`}>{p}</span></li>
                    {/each}
                  </ol>
                {/if}
                <ul class="mt-5 divide-y divide-slate-100 rounded-xl bg-[#f8faf7] px-4">
                  {#each order.items as item}
                    <li class="flex justify-between gap-3 py-3 text-sm"><span>{item.quantity} {item.unit} · {item.name}</span><span class="font-semibold">{currency.format(item.subtotal)}</span></li>
                  {/each}
                </ul>
                {#if deliveryForms[order.id]}
                  {@const deliveryForm = deliveryForms[order.id]}
                  <fieldset class="mt-5 rounded-xl border border-[#e3ebe5] bg-[#fbfcfa] p-4">
                    <legend class="px-1 text-sm font-bold text-[#34483c]">Delivery details</legend>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <label class={lbl}>Delivery fee (KES)
                        <input type="number" min="0" step="0.01" bind:value={deliveryForm.delivery_fee} class={field} aria-invalid={deliveryForm.errors.delivery_fee ? "true" : undefined} />
                        {#if deliveryForm.errors.delivery_fee}<span class="mt-1 block text-xs text-red-700" role="alert">{deliveryForm.errors.delivery_fee}</span>{/if}
                      </label>
                      <label class={lbl}>Courier
                        <input type="text" maxlength="150" bind:value={deliveryForm.courier_name} class={field} aria-invalid={deliveryForm.errors.courier_name ? "true" : undefined} />
                        {#if deliveryForm.errors.courier_name}<span class="mt-1 block text-xs text-red-700" role="alert">{deliveryForm.errors.courier_name}</span>{/if}
                      </label>
                      <label class={lbl}>Tracking number
                        <input type="text" maxlength="150" bind:value={deliveryForm.tracking_number} class={field} aria-invalid={deliveryForm.errors.tracking_number ? "true" : undefined} />
                        {#if deliveryForm.errors.tracking_number}<span class="mt-1 block text-xs text-red-700" role="alert">{deliveryForm.errors.tracking_number}</span>{/if}
                      </label>
                      <label class={lbl}>Estimated delivery
                        <input type="datetime-local" bind:value={deliveryForm.estimated_delivery_at} class={field} aria-invalid={deliveryForm.errors.estimated_delivery_at ? "true" : undefined} />
                        {#if deliveryForm.errors.estimated_delivery_at}<span class="mt-1 block text-xs text-red-700" role="alert">{deliveryForm.errors.estimated_delivery_at}</span>{/if}
                      </label>
                    </div>
                    {#if deliveryForm.errors.status}<p class="mt-2 text-sm text-red-700" role="alert">{deliveryForm.errors.status}</p>{/if}
                    <div class="mt-3 flex justify-end">
                      <button type="button" class={btnPrimary} disabled={updating[order.id] || deliveryForm.processing} onclick={() => saveDeliveryDetails(order)}>{deliveryForm.processing ? "Saving…" : "Save delivery details"}</button>
                    </div>
                  </fieldset>
                {/if}
                {#if nextStatuses[order.status]}
                  <div class="mt-4 flex flex-wrap justify-end gap-2">
                    {#each nextStatuses[order.status] as status}
                      <button type="button" class={status === "cancelled" ? btnDanger : btnPrimary} disabled={updating[order.id]} onclick={() => setOrderStatus(order, status)}>{updating[order.id] ? "Updating…" : labelFor(order, status)}</button>
                    {/each}
                  </div>
                {/if}
              </article>
            {:else}
              <div class="rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-10 text-center text-sm text-slate-600">No {orderFilter} orders.</div>
            {/each}
          </div>
        {/if}
      </section>
    {:else if activeView === "customers"}
      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div><h2 class="text-2xl font-bold tracking-tight">Your customers</h2><p class="mt-1 text-sm text-slate-500">Customers who have ordered from your farms.</p></div>
          <p class="rounded-full bg-[#e7f3df] px-4 py-1.5 text-sm font-bold text-[#176b3b]">{customers.length} unique {customers.length === 1 ? "customer" : "customers"}</p>
        </div>
        {#if customers.length === 0}
          <div class="mt-5 rounded-2xl border border-dashed border-[#cbd9ce] bg-white p-12 text-center text-sm text-slate-600">Customer information will appear here after your first order.</div>
        {:else}
          <div class={`${card} mt-5 overflow-x-auto`}>
            <table class="w-full min-w-[650px] text-left text-sm">
              <thead class="bg-[#f4f8f5] text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-6 py-3.5 font-semibold">Customer</th><th class="px-6 py-3.5 font-semibold">Orders</th><th class="px-6 py-3.5 font-semibold">Order value</th></tr></thead>
              <tbody class="divide-y divide-slate-100">
                {#each customers as customer (customer.id)}
                  <tr class="transition hover:bg-[#fafcf9]"><td class="px-6 py-4"><div class="flex items-center gap-3"><span class="grid size-9 place-items-center rounded-full bg-blue-100 font-bold text-blue-800" aria-hidden="true">{customer.name?.[0] ?? "?"}</span><div><p class="font-semibold">{customer.name}</p><p class="text-xs text-slate-500">{customer.email ?? "Email not provided"}</p></div></div></td><td class="px-6 py-4 font-semibold">{customer.orders}</td><td class="px-6 py-4 font-semibold">{currency.format(customer.total_value)}</td></tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {:else if activeView === "analytics"}
      {@const comparisonMax = Math.max(stats.inventory_value ?? 0, stats.sold_value ?? 0, stats.revenue ?? 0, 1)}
      <section class="mt-8">
        <div><h2 class="text-2xl font-bold tracking-tight">Farm analytics</h2><p class="mt-1 text-sm text-slate-500">Inventory, sales, revenue, and this month’s activity.</p></div>
        <div class="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {#each [["Inventory value", currency.format(stats.inventory_value ?? 0)], ["Units sold", quantityFormat.format(stats.units_sold ?? 0)], ["Active products", stats.active_products ?? 0], ["Revenue", currency.format(stats.revenue ?? 0)]] as [label, value]}
            <article class={`${card} p-6`}><p class="text-sm font-semibold text-slate-600">{label}</p><p class="mt-2 text-2xl font-extrabold tracking-tight text-[#173f2a]">{value}</p></article>
          {/each}
        </div>
        <article class={`${card} mt-6 p-6`}>
          <h3 class="text-lg font-bold">Sales performance</h3>
          <div class="mt-5 space-y-4">
            {#each [["Inventory", stats.inventory_value ?? 0, "bg-indigo-400"], ["Sold", stats.sold_value ?? 0, "bg-teal-400"], ["Orders", stats.revenue ?? 0, "bg-[#438150]"]] as [label, value, color]}
              <div class="grid grid-cols-[90px_minmax(0,1fr)_auto] items-center gap-3 text-sm"><span class="text-slate-600">{label}</span><div class="h-3 overflow-hidden rounded-full bg-slate-100"><div class={`h-full rounded-full ${color}`} style={`width:${Math.min(100, (value / comparisonMax) * 100)}%`}></div></div><strong>{currency.format(value)}</strong></div>
            {/each}
          </div>
        </article>
        <div class="mt-6 grid gap-4 sm:grid-cols-3">
          {#each [["Products added", stats.month_products ?? 0], ["Orders this month", stats.month_orders ?? 0], ["Revenue this month", currency.format(stats.month_revenue ?? 0)]] as [label, value]}
            <article class={`${card} bg-[#f4f8f5] p-6`}><p class="text-sm text-slate-500">{label}</p><p class="mt-2 text-xl font-extrabold text-[#173f2a]">{value}</p></article>
          {/each}
        </div>
      </section>
    {:else if activeView === "profile"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Producer profile</h2>
        <article class={`${card} mt-5 max-w-2xl overflow-hidden`}>
          <div class="h-24 bg-gradient-to-r from-[#0e3020] to-[#1f6b43]"></div>
          <div class="px-6 pb-6">
            <div class="-mt-10 flex items-end gap-4">
              <div class="grid size-20 place-items-center rounded-full border-4 border-white bg-[#d8e9b8] text-xl font-extrabold text-[#173f2a]">{initials}</div>
              <div class="pb-1"><h3 class="text-lg font-bold">{auth.user.full_name}</h3><p class="text-sm text-slate-500">Producer account</p></div>
            </div>
            <dl class="mt-6 grid gap-3 sm:grid-cols-2">
              {#each [["Email", auth.user.email], ["Phone", auth.user.phone ?? "Not provided"], ["Role", auth.user.role], ["Account status", auth.user.status]] as [label, value]}
                <div class="rounded-xl bg-[#f4f8f5] p-4"><dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd class={`mt-1 break-words font-semibold ${label === "Role" || label === "Account status" ? "capitalize" : ""}`}>{value}</dd></div>
              {/each}
            </dl>
          </div>
        </article>
      </section>
    {:else if activeView === "settings"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Dashboard settings</h2>
        <article class={`${card} mt-5 max-w-2xl divide-y divide-slate-100 px-6`}>
          <label class="flex cursor-pointer items-center justify-between gap-5 py-5"><span><strong class="block">Auto-refresh dashboard</strong><span class="mt-1 block text-sm text-slate-500">Refresh orders and inventory every minute so new orders show up without reloading.</span></span><input type="checkbox" bind:checked={autoRefresh} class="size-5 accent-[#176b3b]" /></label>
          <div class="py-5"><strong class="block">Low inventory</strong><span class="mt-1 block text-sm text-slate-500">{lowStock.length} listings have 5 or fewer units remaining.</span></div>
        </article>
      </section>
    {:else if activeView === "messages"}
      <section class="mt-8">
        <h2 class="text-2xl font-bold tracking-tight">Messages with customers</h2>
        <p class="mb-5 mt-1 text-sm text-slate-500">Answer questions about your harvest and orders.</p>
        <MessageInbox user={auth.user} {conversations} {errors} accent="producer" />
      </section>
    {/if}
      </div>
    </div>
  </section>
</PortalLayout>
/* =========================================================
   MODERN FARMS - PRODUCER DASHBOARD
   frontend/js/producer.js
   ========================================================= */

(function () {
    "use strict";

    /* =========================================================
       CONSTANTS
       ========================================================= */

    const LOGIN_URL = "/frontend/pages/login.html";
    const CUSTOMER_DASHBOARD_URL = "/frontend/pages/customer-dashboard.html";
    const REFRESH_INTERVAL_MS = 60000;
    const LOW_STOCK_THRESHOLD = 10;

    /*
     * Order statuses must match the backend (orders.py):
     * pending -> confirmed -> processing -> ready -> shipped -> delivered
     * with "cancelled" allowed from pending/confirmed/processing/ready.
     *
     * "Accept" = confirmed, "Reject" = cancelled.
     */
    const ORDER_ACTIONS = {
        pending: [
            {
                label: "Accept",
                status: "confirmed",
                confirm: "Accept this order?"
            },
            {
                label: "Reject",
                status: "cancelled",
                danger: true,
                confirm:
                    "Reject this order?\n\nThe reserved stock will be returned to your inventory."
            }
        ],
        confirmed: [
            {
                label: "Start Processing",
                status: "processing",
                confirm: "Start processing this order?"
            },
            {
                label: "Cancel",
                status: "cancelled",
                danger: true,
                confirm:
                    "Cancel this order?\n\nThe reserved stock will be returned to your inventory."
            }
        ],
        processing: [
            {
                label: "Mark Ready",
                status: "ready",
                confirm: "Mark this order as ready?"
            },
            {
                label: "Cancel",
                status: "cancelled",
                danger: true,
                confirm:
                    "Cancel this order?\n\nThe reserved stock will be returned to your inventory."
            }
        ],
        ready: [
            {
                label: "Mark Shipped",
                status: "shipped",
                confirm: "Mark this order as shipped?"
            },
            {
                label: "Cancel",
                status: "cancelled",
                danger: true,
                confirm:
                    "Cancel this order?\n\nThe reserved stock will be returned to your inventory."
            }
        ],
        shipped: [
            {
                label: "Mark Delivered",
                status: "delivered",
                confirm: "Mark this order as delivered?"
            }
        ]
    };

    /* Legacy wording still accepted by window.changeOrderStatus */
    const STATUS_ALIASES = {
        accept: "confirmed",
        accepted: "confirmed",
        reject: "cancelled",
        rejected: "cancelled",
        canceled: "cancelled",
        complete: "delivered",
        completed: "delivered"
    };

    /* Orders that still need the producer's attention */
    const OPEN_ORDER_STATUSES = [
        "pending",
        "confirmed",
        "processing",
        "ready"
    ];

    const INACTIVE_PRODUCT_STATUSES = [
        "inactive",
        "disabled",
        "deleted"
    ];

    const TOKEN_KEYS = [
        "modern_farms_token",
        "access_token",
        "token"
    ];

    /* =========================================================
       STATE
       ========================================================= */

    let currentUser = null;
    let currentFarm = null;
    let products = [];
    let orders = [];
    let refreshTimer = null;
    let isLoading = false;

    const ordersInFlight = new Set();

    const API = window.ModernFarmsAPI;

    /* =========================================================
       INITIALIZATION
       ========================================================= */

    document.addEventListener("DOMContentLoaded", initProducerDashboard);

    async function initProducerDashboard() {
        try {
            if (!API) {
                console.error("ModernFarmsAPI is not available.");
                showError("The API client could not be loaded.");
                return;
            }

            if (!API.isAuthenticated()) {
                window.location.href = LOGIN_URL;
                return;
            }

            const ok = await loadUser();

            if (!ok) {
                return;
            }

            await Promise.all([
                loadFarm(),
                loadProducts(),
                loadOrders()
            ]);

            renderDashboard();
            startAutoRefresh();

        } catch (error) {
            console.error("Producer dashboard initialization failed:", error);
            showError("Unable to load your producer dashboard.");
        }
    }

    /* =========================================================
       USER
       ========================================================= */

    /**
     * Loads the signed-in user.
     * Returns true when the dashboard should continue loading.
     */
    async function loadUser() {
        try {
            const response = await API.me();

            const user =
                response?.user ||
                response?.data?.user ||
                response?.data ||
                API.getCurrentUser?.();

            if (!user) {
                throw new Error("User information was not returned.");
            }

            currentUser = user;

        } catch (error) {
            console.error("Failed to load producer:", error);

            const cachedUser = API.getCurrentUser?.();

            if (!cachedUser) {
                showError("Unable to load your account information.");
                return false;
            }

            currentUser = cachedUser;
        }

        const role = String(currentUser.role || "").toLowerCase();

        if (role && role !== "producer") {
            if (role === "customer") {
                window.location.href = CUSTOMER_DASHBOARD_URL;
            } else {
                showError("This dashboard is only available to producers.");
            }

            return false;
        }

        renderUser();
        return true;
    }

    function renderUser() {
        if (!currentUser) {
            return;
        }

        const fullName =
            currentUser.name ||
            currentUser.full_name ||
            `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() ||
            "Producer";

        const email = currentUser.email || currentUser.username || "—";
        const phone = currentUser.phone || currentUser.phone_number || "—";
        const initials = getInitials(fullName);

        setText("producerName", fullName);
        setText("profileName", fullName);
        setText("profileFullName", fullName);
        setText("profileEmail", email);
        setText("profilePhone", phone);

        setText("accountInitials", initials);
        setText("profileInitials", initials);

        setText(
            "accountStatus",
            currentUser.is_active === false ? "Inactive" : "Active"
        );
    }

    /* =========================================================
       FARM
       ========================================================= */

    async function loadFarm() {
        try {
            const response = await API.getFarms();

            const farmList = Array.isArray(response)
                ? response
                : (
                    response?.farms ||
                    response?.data?.farms ||
                    response?.data ||
                    []
                );

            if (!Array.isArray(farmList) || !farmList.length) {
                currentFarm = null;
                renderFarm();
                return;
            }

            const userId = Number(currentUser?.id);

            currentFarm = farmList.find(
                farm => Number(farm.producer_id) === userId
            ) || null;

            /*
             * Only fall back to the first farm when the API does not
             * expose producer_id at all (i.e. it already filtered the
             * list for this producer). Never show someone else's farm.
             */
            if (!currentFarm) {
                const hasOwnerField = farmList.some(
                    farm => farm.producer_id !== undefined
                );

                currentFarm = hasOwnerField ? null : farmList[0];
            }

            renderFarm();

        } catch (error) {
            console.error("Failed to load farm:", error);
            currentFarm = null;
            renderFarm();
        }
    }

    function renderFarm() {
        const farmName =
            currentFarm?.name ||
            currentFarm?.farm_name ||
            "My Farm";

        const location =
            currentFarm?.location ||
            currentFarm?.address ||
            currentFarm?.county ||
            "Location not set";

        const size =
            currentFarm?.size ||
            currentFarm?.farm_size ||
            currentFarm?.acreage ||
            "—";

        const phone =
            currentFarm?.phone ||
            currentFarm?.phone_number ||
            currentUser?.phone ||
            "—";

        setText("sidebarFarmName", farmName);
        setText("sidebarFarmLocation", location);
        setText("sidebarFarmSize", formatFarmSize(size));

        setText("farmName", farmName);
        setText("farmLocation", location);
        setText("farmSize", formatFarmSize(size));
        setText("farmPhone", phone);
    }

    function formatFarmSize(value) {
        if (
            value === null ||
            value === undefined ||
            value === "" ||
            value === "—"
        ) {
            return "—";
        }

        if (typeof value === "number") {
            return `${formatNumber(value)} acres`;
        }

        return String(value);
    }

    /* =========================================================
       PRODUCTS
       ========================================================= */

    async function loadProducts() {
        try {
            const response = await API.getMyProducts();

            let list =
                response?.products ||
                response?.inventory ||
                response?.data?.products ||
                response?.data ||
                response;

            products = Array.isArray(list) ? list : [];

        } catch (error) {
            console.error("getMyProducts failed:", error);

            try {
                if (typeof API.getInventory === "function") {
                    const response = await API.getInventory();

                    const list =
                        response?.products ||
                        response?.inventory ||
                        response?.data ||
                        response;

                    products = Array.isArray(list) ? list : [];
                } else {
                    products = [];
                }
            } catch (inventoryError) {
                console.error("Inventory fallback failed:", inventoryError);
                products = [];
            }
        }
    }

    function getActiveProducts() {
        return products.filter(product =>
            !INACTIVE_PRODUCT_STATUSES.includes(
                normalizeStatus(product.status)
            )
        );
    }

    function getProductName(product) {
        return product?.name || product?.product_name || "Unnamed Product";
    }

    function getProductQuantity(product) {
        return numberValue(
            product.quantity_remaining ??
            product.quantity_available ??
            product.quantity ??
            product.stock ??
            product.available_quantity ??
            0
        );
    }

    function getProductSold(product) {
        return numberValue(
            product.quantity_sold ??
            product.sold_quantity ??
            product.sold ??
            0
        );
    }

    function getProductPosted(product) {
        const explicitPosted =
            product.quantity_posted ??
            product.quantity_initial ??
            product.initial_quantity;

        if (explicitPosted !== undefined && explicitPosted !== null) {
            return numberValue(explicitPosted);
        }

        return getProductQuantity(product) + getProductSold(product);
    }

    function getProductPrice(product) {
        return numberValue(product.price ?? product.unit_price ?? 0);
    }

    /* =========================================================
       ORDERS
       ========================================================= */

    async function loadOrders() {
        try {
            const response = await API.getProducerOrders();

            let list =
                response?.orders ||
                response?.data?.orders ||
                response?.data ||
                response;

            if (!Array.isArray(list)) {
                list = [];
            }

            orders = [...list].sort(
                (a, b) => getTimestamp(b) - getTimestamp(a)
            );

        } catch (error) {
            console.error("Failed to load orders:", error);
            orders = [];
        }
    }

    function getTimestamp(item) {
        const value =
            item?.created_at ||
            item?.createdAt ||
            item?.order_date ||
            item?.date ||
            item?.updated_at;

        const timestamp = value ? new Date(value).getTime() : 0;

        return Number.isFinite(timestamp) ? timestamp : 0;
    }

    function getOrderNumber(order) {
        return (
            order.order_number ||
            order.orderNumber ||
            order.reference ||
            `#${order.id ?? "—"}`
        );
    }

    function getOrderCustomer(order) {
        return (
            order.customer_name ||
            order.customerName ||
            order.customer?.name ||
            order.customer?.email ||
            "Customer"
        );
    }

    function getOrderQuantity(order) {
        if (Array.isArray(order.items) && order.items.length) {
            return order.items.reduce(
                (sum, item) => sum + numberValue(item.quantity),
                0
            );
        }

        return numberValue(order.quantity ?? order.total_quantity ?? 0);
    }

    function getOrderItemsSummary(order) {
        if (!Array.isArray(order.items) || !order.items.length) {
            return "";
        }

        return order.items
            .map(item => {
                const name =
                    item.product_name ||
                    item.name ||
                    item.product?.name ||
                    "Item";

                return `${name} × ${formatNumber(item.quantity)}`;
            })
            .join(", ");
    }

    /* =========================================================
       DASHBOARD RENDER
       ========================================================= */

    function renderDashboard() {
        renderStatistics();
        renderInventoryOverview();
        renderRecentOrders();
        renderProductsTable();
        renderManagementProducts();
        renderOrdersPage();
        renderAnalytics();
        renderMonthlySummary();
        renderCustomers();
    }

    /* =========================================================
       STATISTICS
       ========================================================= */

    function renderStatistics() {
        const activeProducts = getActiveProducts();

        const totalInventory = activeProducts.reduce(
            (sum, product) => sum + getProductQuantity(product),
            0
        );

        const openOrders = orders.filter(order =>
            OPEN_ORDER_STATUSES.includes(normalizeStatus(order.status))
        ).length;

        setText("totalProducts", formatNumber(activeProducts.length));
        setText("totalInventory", formatNumber(totalInventory));
        setText("totalOrders", formatNumber(orders.length));
        setText("pendingOrders", formatNumber(openOrders));
        setText("totalRevenue", formatCurrency(calculateRevenue()));

        setText("sidebarOrderBadge", formatNumber(openOrders));
        setText("ordersBadge", formatNumber(openOrders));
    }

    /* =========================================================
       INVENTORY
       ========================================================= */

    function renderInventoryOverview() {
        const activeProducts = getActiveProducts();

        let available = 0;
        let sold = 0;
        let posted = 0;

        activeProducts.forEach(product => {
            available += getProductQuantity(product);
            sold += getProductSold(product);
            posted += getProductPosted(product);
        });

        if (posted <= 0) {
            posted = available + sold;
        }

        const percent =
            posted > 0 ? Math.round((available / posted) * 100) : 0;

        const lowStock = activeProducts.filter(product => {
            const quantity = getProductQuantity(product);

            return quantity > 0 && quantity <= LOW_STOCK_THRESHOLD;
        }).length;

        setText("inventoryPercent", `${percent}%`);
        setText("availableInventory", formatNumber(available));
        setText("stockInventory", formatNumber(available));
        setText("soldInventory", formatNumber(sold));
        setText("lowStockProducts", formatNumber(lowStock));

        setText(
            "availableUnit",
            activeProducts.length === 1 ? "unit" : "units"
        );

        const ring = document.getElementById("inventoryRing");

        if (ring) {
            ring.style.setProperty("--inventory-percent", `${percent}%`);

            ring.style.background =
                `conic-gradient(
                    var(--green-500) 0 ${percent}%,
                    #e5e7eb ${percent}% 100%
                )`;
        }
    }

    /* =========================================================
       RECENT ORDERS
       ========================================================= */

    function renderRecentOrders() {
        const container = document.getElementById("recentOrders");

        if (!container) {
            return;
        }

        const recentOrders = orders.slice(0, 3);

        if (!recentOrders.length) {
            container.innerHTML = emptyState(
                "No recent orders",
                "New orders will appear here."
            );
            return;
        }

        container.innerHTML = recentOrders.map(createRecentOrder).join("");
    }

    function createRecentOrder(order) {
        const quantity = getOrderQuantity(order);
        const status = normalizeStatus(order.status);

        return `
            <div class="recent-order-item">
                <div class="recent-order-main">
                    <strong>${escapeHtml(getOrderNumber(order))}</strong>
                    <span>${escapeHtml(getOrderCustomer(order))}</span>
                </div>

                <div class="recent-order-meta">
                    <span>${formatNumber(quantity)} item${quantity === 1 ? "" : "s"}</span>
                    <strong>${formatCurrency(getOrderTotal(order))}</strong>
                    <span class="status-badge status-${escapeHtml(status)}">
                        ${escapeHtml(capitalize(status))}
                    </span>
                </div>
            </div>
        `;
    }

    /* =========================================================
       PRODUCTS TABLE
       ========================================================= */

    function renderProductsTable() {
        const tbody = document.getElementById("productsTableBody");
        const footer = document.getElementById("productsFooter");

        if (!tbody) {
            return;
        }

        if (!products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
                        ${emptyState(
                            "No products yet",
                            "Add your first farm product to start selling."
                        )}
                    </td>
                </tr>
            `;

            if (footer) {
                footer.textContent = "0 products";
            }

            return;
        }

        tbody.innerHTML = products.map(createProductRow).join("");

        if (footer) {
            footer.textContent =
                `${products.length} product${products.length === 1 ? "" : "s"}`;
        }
    }

    function createProductRow(product) {
        const id = Number(product.id);
        const name = getProductName(product);
        const category = product.category || "General";
        const unit = product.unit || product.measurement_unit || "unit";
        const status = normalizeStatus(product.status || "active");

        return `
            <tr>
                <td>
                    <div class="product-table-name">
                        <span class="product-icon">
                            ${getProductIcon(category)}
                        </span>

                        <div>
                            <strong>${escapeHtml(name)}</strong>
                            <small>${escapeHtml(category)}</small>
                        </div>
                    </div>
                </td>

                <td>${escapeHtml(category)}</td>

                <td>${formatCurrency(getProductPrice(product))}</td>

                <td>
                    ${formatNumber(getProductQuantity(product))}
                    ${escapeHtml(unit)}
                </td>

                <td>${formatNumber(getProductSold(product))}</td>

                <td>
                    <span class="status-badge status-${escapeHtml(status)}">
                        ${escapeHtml(capitalize(status))}
                    </span>
                </td>

                <td class="table-actions">
                    <button type="button" class="icon-action"
                        title="Edit product"
                        data-action="edit-product" data-id="${id}">✎</button>

                    <button type="button" class="icon-action"
                        title="Duplicate product"
                        data-action="duplicate-product" data-id="${id}">⧉</button>

                    <button type="button" class="icon-action danger"
                        title="Delete product"
                        data-action="delete-product" data-id="${id}">×</button>
                </td>
            </tr>
        `;
    }

    /* =========================================================
       PRODUCT MANAGEMENT
       ========================================================= */

    function renderManagementProducts() {
        const container = document.getElementById("productsManagement");

        if (!container) {
            return;
        }

        if (!products.length) {
            container.innerHTML = emptyState(
                "No products to manage",
                "Add a product to begin managing your inventory."
            );
            return;
        }

        container.innerHTML = products
            .map(product => {
                const id = Number(product.id);
                const category = product.category || "General";

                return `
                    <div class="management-product-card">

                        <div class="management-product-icon">
                            ${getProductIcon(category)}
                        </div>

                        <div class="management-product-info">
                            <h4>${escapeHtml(getProductName(product))}</h4>
                            <span>${escapeHtml(category)}</span>
                        </div>

                        <div class="management-product-stats">
                            <div>
                                <small>Price</small>
                                <strong>${formatCurrency(getProductPrice(product))}</strong>
                            </div>

                            <div>
                                <small>Available</small>
                                <strong>${formatNumber(getProductQuantity(product))}</strong>
                            </div>

                            <div>
                                <small>Sold</small>
                                <strong>${formatNumber(getProductSold(product))}</strong>
                            </div>
                        </div>

                        <div class="management-product-actions">
                            <button type="button"
                                data-action="edit-product" data-id="${id}">
                                Edit
                            </button>

                            <button type="button"
                                data-action="duplicate-product" data-id="${id}">
                                Duplicate
                            </button>

                            <button type="button" class="danger"
                                data-action="delete-product" data-id="${id}">
                                Delete
                            </button>
                        </div>

                    </div>
                `;
            })
            .join("");
    }

    /* =========================================================
       ORDERS PAGE
       ========================================================= */

    function renderOrdersPage() {
        const container = document.getElementById("ordersManagement");

        if (!container) {
            return;
        }

        if (!orders.length) {
            container.innerHTML = emptyState(
                "No orders yet",
                "Orders from customers will appear here."
            );
            return;
        }

        container.innerHTML = orders.map(createOrderRow).join("");
    }

    function createOrderRow(order) {
        const id = Number(order.id);
        const status = normalizeStatus(order.status || "pending");
        const itemsSummary = getOrderItemsSummary(order);

        const actions = (ORDER_ACTIONS[status] || [])
            .map(action => `
                <button
                    type="button"
                    class="${action.danger ? "danger" : ""}"
                    data-action="order-status"
                    data-id="${id}"
                    data-status="${action.status}"
                    ${ordersInFlight.has(id) ? "disabled" : ""}
                >
                    ${escapeHtml(action.label)}
                </button>
            `)
            .join("");

        return `
            <div class="order-management-row">

                <div>
                    <strong>${escapeHtml(getOrderNumber(order))}</strong>
                    <span>${escapeHtml(getOrderCustomer(order))}</span>
                    ${
                        itemsSummary
                            ? `<small>${escapeHtml(itemsSummary)}</small>`
                            : ""
                    }
                </div>

                <div>${formatNumber(getOrderQuantity(order))}</div>

                <div>${formatCurrency(getOrderTotal(order))}</div>

                <div>
                    <span class="status-badge status-${escapeHtml(status)}">
                        ${escapeHtml(capitalize(status))}
                    </span>
                </div>

                <div class="order-actions">
                    ${actions}
                </div>

            </div>
        `;
    }

    /* =========================================================
       ANALYTICS
       ========================================================= */

    function renderAnalytics() {
        const activeProducts = getActiveProducts();

        const inventoryValue = activeProducts.reduce(
            (sum, product) =>
                sum + getProductQuantity(product) * getProductPrice(product),
            0
        );

        const soldValue = activeProducts.reduce(
            (sum, product) =>
                sum + getProductSold(product) * getProductPrice(product),
            0
        );

        const totalSold = activeProducts.reduce(
            (sum, product) => sum + getProductSold(product),
            0
        );

        const revenue = calculateRevenue();

        setText("analyticsInventoryValue", formatCurrency(inventoryValue));
        setText("analyticsSold", formatNumber(totalSold));
        setText("analyticsProducts", formatNumber(activeProducts.length));
        setText("analyticsRevenue", formatCurrency(revenue));
        setText("inventoryValue", formatCurrency(inventoryValue));

        const maximum = Math.max(inventoryValue, soldValue, revenue, 1);

        setBar("inventoryBar", (inventoryValue / maximum) * 100);
        setBar("soldBar", (soldValue / maximum) * 100);
        setBar("ordersBar", (revenue / maximum) * 100);
    }

    /* =========================================================
       MONTHLY SUMMARY
       ========================================================= */

    function renderMonthlySummary() {
        const now = new Date();

        const monthProducts = products.filter(product =>
            isSameMonth(product, now)
        ).length;

        const monthOrders = orders.filter(order =>
            isSameMonth(order, now) && !isCancelled(order)
        );

        const monthRevenue = monthOrders.reduce(
            (sum, order) => sum + getOrderTotal(order),
            0
        );

        setText("monthProducts", formatNumber(monthProducts));
        setText("monthOrders", formatNumber(monthOrders.length));
        setText("monthRevenue", formatCurrency(monthRevenue));
    }

    function isSameMonth(item, referenceDate) {
        const timestamp = getTimestamp(item);

        if (!timestamp) {
            return false;
        }

        const date = new Date(timestamp);

        return (
            date.getFullYear() === referenceDate.getFullYear() &&
            date.getMonth() === referenceDate.getMonth()
        );
    }

    /* =========================================================
       CUSTOMERS
       ========================================================= */

    function renderCustomers() {
        const container = document.getElementById("customersContent");

        if (!container) {
            return;
        }

        const customers = new Map();

        orders.forEach(order => {
            if (isCancelled(order)) {
                return;
            }

            const customer = order.customer || null;

            const id =
                order.customer_id ??
                customer?.id ??
                order.customer_email ??
                customer?.email ??
                order.customer_name ??
                customer?.name;

            if (!id) {
                return;
            }

            const key = String(id);

            if (!customers.has(key)) {
                customers.set(key, {
                    name: order.customer_name || customer?.name || "Customer",
                    email: order.customer_email || customer?.email || "—",
                    orders: 0,
                    value: 0
                });
            }

            const entry = customers.get(key);

            entry.orders += 1;
            entry.value += getOrderTotal(order);
        });

        if (!customers.size) {
            container.innerHTML = emptyState(
                "No customers yet",
                "Customer information will appear after your first order."
            );
            return;
        }

        const customerList = Array.from(customers.values())
            .sort((a, b) => b.value - a.value);

        container.innerHTML = `
            <div class="customers-summary">
                <strong>${formatNumber(customerList.length)}</strong>
                <span>unique customer${customerList.length === 1 ? "" : "s"}</span>
            </div>

            <div class="customers-list">
                ${customerList.map(customer => `
                    <div class="customer-row">
                        <div>
                            <strong>${escapeHtml(customer.name)}</strong>
                            <span>${escapeHtml(customer.email)}</span>
                        </div>

                        <div>
                            <strong>${formatNumber(customer.orders)}</strong>
                            <span>orders</span>
                        </div>

                        <div>
                            <strong>${formatCurrency(customer.value)}</strong>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    /* =========================================================
       REVENUE
       ========================================================= */

    function isCancelled(order) {
        return ["rejected", "cancelled", "canceled"].includes(
            normalizeStatus(order?.status)
        );
    }

    function calculateRevenue() {
        /*
         * Prefer order-level financial data. This prevents double
         * counting when both product sold quantities and orders exist.
         */
        const ordersWithTotals = orders.filter(
            order => extractOrderTotal(order) !== null
        );

        if (ordersWithTotals.length) {
            return ordersWithTotals
                .filter(order => !isCancelled(order))
                .reduce(
                    (sum, order) => sum + (extractOrderTotal(order) || 0),
                    0
                );
        }

        return getActiveProducts().reduce(
            (sum, product) =>
                sum + getProductSold(product) * getProductPrice(product),
            0
        );
    }

    function extractOrderTotal(order) {
        const candidates = [
            order?.total_amount,
            order?.total_price,
            order?.grand_total,
            order?.order_total,
            order?.amount
        ];

        for (const candidate of candidates) {
            if (
                candidate !== undefined &&
                candidate !== null &&
                candidate !== ""
            ) {
                return numberValue(candidate);
            }
        }

        if (Array.isArray(order?.items)) {
            return order.items.reduce((sum, item) => {
                const subtotal =
                    item?.subtotal ??
                    (
                        numberValue(item?.quantity) *
                        numberValue(item?.unit_price ?? item?.price)
                    );

                return sum + numberValue(subtotal);
            }, 0);
        }

        return null;
    }

    function getOrderTotal(order) {
        return extractOrderTotal(order) ?? 0;
    }

    /* =========================================================
       ADD PRODUCT
       ========================================================= */

    async function addProduct(event) {
        if (event) {
            event.preventDefault();
        }

        if (isLoading) {
            return;
        }

        const name = getValue("productName").trim();
        const category = getValue("productCategory").trim();
        const price = numberValue(getValue("productPrice"));
        const unit = getValue("productUnit").trim();
        const quantity = numberValue(getValue("productQuantity"));
        const description = getValue("productDescription").trim();

        if (!name) {
            showError("Product name is required.");
            return;
        }

        if (!category) {
            showError("Product category is required.");
            return;
        }

        if (price <= 0) {
            showError("Product price must be greater than zero.");
            return;
        }

        if (quantity < 0) {
            showError("Quantity cannot be negative.");
            return;
        }

        if (!currentFarm?.id) {
            showError(
                "No farm is associated with your account. Please create a farm first."
            );
            return;
        }

        const payload = {
            farm_id: currentFarm.id,
            name,
            category,
            description,
            price,
            unit: unit || "unit",
            quantity_posted: quantity
        };

        try {
            isLoading = true;
            setFormLoading(true);

            await API.createProduct(payload);

            showSuccess("Product added successfully.");

            closeProductModal();

            await loadProducts();
            renderDashboard();

        } catch (error) {
            console.error("Failed to add product:", error);

            showError(
                extractErrorMessage(error, "Unable to add the product.")
            );

        } finally {
            isLoading = false;
            setFormLoading(false);
        }
    }

    /* =========================================================
       DELETE PRODUCT
       ========================================================= */

    async function deleteProduct(productId) {
        const product = findProduct(productId);
        const name = product ? getProductName(product) : "this product";

        if (!window.confirm(
            `Delete "${name}"?\n\nThis action cannot be undone.`
        )) {
            return;
        }

        try {
            await API.deleteProduct(productId);

            showSuccess("Product deleted successfully.");

            await loadProducts();
            renderDashboard();

        } catch (error) {
            console.error("Delete product failed:", error);

            showError(
                extractErrorMessage(error, "Unable to delete the product.")
            );
        }
    }

    /* =========================================================
       EDIT PRODUCT
       ========================================================= */

    async function editProduct(productId) {
        const product = findProduct(productId);

        if (!product) {
            showError("Product could not be found.");
            return;
        }

        const newPrice = window.prompt(
            `Enter the new price for "${getProductName(product)}":`,
            getProductPrice(product)
        );

        if (newPrice === null) {
            return;
        }

        const price = numberValue(newPrice);

        if (price <= 0) {
            showError("Price must be greater than zero.");
            return;
        }

        const payload = {
            farm_id: product.farm_id || currentFarm?.id,
            name: getProductName(product),
            category: product.category || "General",
            description: product.description || "",
            price,
            unit: product.unit || "unit",
            quantity_posted:
                product.quantity_posted ?? getProductPosted(product)
        };

        try {
            if (typeof API.updateProduct !== "function") {
                showError(
                    "Product editing is not available in the API client yet."
                );
                return;
            }

            await API.updateProduct(productId, payload);

            showSuccess("Product updated successfully.");

            await loadProducts();
            renderDashboard();

        } catch (error) {
            console.error("Edit product failed:", error);

            showError(
                extractErrorMessage(error, "Unable to update the product.")
            );
        }
    }

    /* =========================================================
       DUPLICATE PRODUCT
       ========================================================= */

    function duplicateProduct(productId) {
        const product = findProduct(productId);

        if (!product) {
            showError("Product could not be found.");
            return;
        }

        window.openProductModal();

        setValue("productName", `${getProductName(product)} Copy`);
        setValue("productCategory", product.category || "");
        setValue("productPrice", getProductPrice(product));
        setValue("productUnit", product.unit || "unit");
        setValue("productQuantity", getProductQuantity(product));
        setValue("productDescription", product.description || "");
    }

    function findProduct(productId) {
        return products.find(item => Number(item.id) === Number(productId));
    }

    /* =========================================================
       ORDER STATUS
       ========================================================= */

    function getAuthToken() {
        try {
            const fromApi = API.getToken?.();

            if (fromApi) {
                return fromApi;
            }
        } catch (error) {
            /* fall through to storage lookup */
        }

        for (const key of TOKEN_KEYS) {
            const value =
                localStorage.getItem(key) ||
                sessionStorage.getItem(key);

            if (value) {
                return value;
            }
        }

        return null;
    }

    /**
     * Sends PUT /api/orders/<id>/status with { status }.
     * Uses the API client when it provides updateOrderStatus,
     * otherwise calls the endpoint directly.
     */
    async function sendOrderStatus(orderId, status) {
        if (typeof API.updateOrderStatus === "function") {
            return API.updateOrderStatus(orderId, status);
        }

        const token = getAuthToken();

        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ status })
        });

        let data = null;

        try {
            data = await response.json();
        } catch (error) {
            data = null;
        }

        if (!response.ok || data?.success === false) {
            throw new Error(
                data?.message ||
                data?.msg ||
                `Request failed (${response.status})`
            );
        }

        return data;
    }

    function getConfirmMessage(order, status) {
        const currentStatus = normalizeStatus(order?.status);

        const action = (ORDER_ACTIONS[currentStatus] || []).find(
            item => item.status === status
        );

        return (
            action?.confirm ||
            `Change this order status to "${capitalize(status)}"?`
        );
    }

    async function changeOrderStatus(orderId, requestedStatus) {
        const id = Number(orderId);

        if (!id || !requestedStatus) {
            return;
        }

        const rawStatus = normalizeStatus(requestedStatus);
        const status = STATUS_ALIASES[rawStatus] || rawStatus;

        if (ordersInFlight.has(id)) {
            return;
        }

        const order = orders.find(item => Number(item.id) === id);

        if (!window.confirm(getConfirmMessage(order, status))) {
            return;
        }

        try {
            ordersInFlight.add(id);
            renderOrdersPage();

            await sendOrderStatus(id, status);

            showSuccess(
                status === "cancelled"
                    ? "Order rejected and stock restored."
                    : `Order marked as ${capitalize(status).toLowerCase()}.`
            );

            await Promise.all([loadOrders(), loadProducts()]);

        } catch (error) {
            console.error("Order status update failed:", error);

            showError(
                extractErrorMessage(error, "Unable to update the order.")
            );

        } finally {
            ordersInFlight.delete(id);
            renderDashboard();
        }
    }

    /* =========================================================
       NAVIGATION
       ========================================================= */

    window.showSection = function (sectionId, button) {
        const target = document.getElementById(sectionId);

        if (!target) {
            console.error(`Dashboard section "${sectionId}" was not found.`);
            return;
        }

        document.querySelectorAll(".dashboard-section").forEach(section => {
            section.classList.remove("active");
            section.classList.add("hidden-section");
            section.style.display = "none";
        });

        target.classList.remove("hidden-section");
        target.classList.add("active");
        target.style.display = "block";

        document.querySelectorAll(".nav-item").forEach(item => {
            item.classList.remove("active");
        });

        const activeButton =
            button ||
            document.querySelector(`.nav-item[data-section="${sectionId}"]`);

        if (activeButton) {
            activeButton.classList.add("active");
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    /* =========================================================
       PRODUCT MODAL
       ========================================================= */

    window.openProductModal = function () {
        const modal = document.getElementById("productModal");

        if (!modal) {
            console.error("Product modal not found.");
            return;
        }

        modal.hidden = false;
        modal.classList.add("active");
        modal.style.display = "flex";

        setTimeout(() => {
            document.getElementById("productName")?.focus();
        }, 100);
    };

    window.openAddProduct = function () {
        resetProductForm();
        window.openProductModal();
    };

    window.closeProductModal = function () {
        const modal = document.getElementById("productModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("active");
        modal.style.display = "none";
        modal.hidden = true;

        resetProductForm();
    };

    function closeProductModal() {
        window.closeProductModal();
    }

    function resetProductForm() {
        document.getElementById("addProductForm")?.reset();
    }

    /* =========================================================
       LOGOUT
       ========================================================= */

    window.logout = function () {
        stopAutoRefresh();

        try {
            if (typeof API.logout === "function") {
                API.logout();
            } else {
                TOKEN_KEYS.forEach(key => {
                    localStorage.removeItem(key);
                    sessionStorage.removeItem(key);
                });
            }
        } catch (error) {
            console.error("Logout error:", error);
        }

        window.location.href = LOGIN_URL;
    };

    /* =========================================================
       AUTO REFRESH
       ========================================================= */

    function startAutoRefresh() {
        stopAutoRefresh();

        const toggle = document.getElementById("autoRefreshToggle");

        if (!toggle || !toggle.checked) {
            return;
        }

        refreshTimer = window.setInterval(
            refreshDashboardData,
            REFRESH_INTERVAL_MS
        );
    }

    async function refreshDashboardData() {
        /* Don't re-render underneath an in-progress order update */
        if (ordersInFlight.size) {
            return;
        }

        try {
            await Promise.all([loadProducts(), loadOrders()]);
            renderDashboard();

        } catch (error) {
            console.error("Auto-refresh failed:", error);
        }
    }

    function stopAutoRefresh() {
        if (refreshTimer) {
            window.clearInterval(refreshTimer);
            refreshTimer = null;
        }
    }

    /* =========================================================
       EVENT LISTENERS
       ========================================================= */

    document.addEventListener("change", event => {
        if (event.target?.id === "autoRefreshToggle") {
            if (event.target.checked) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        }
    });

    document.addEventListener("submit", event => {
        if (event.target?.id === "addProductForm") {
            addProduct(event);
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeProductModal();
        }
    });

    /* Delegated clicks: product/order buttons and modal backdrop */
    document.addEventListener("click", event => {
        const modal = document.getElementById("productModal");

        if (modal && event.target === modal) {
            closeProductModal();
            return;
        }

        const button = event.target.closest?.("[data-action]");

        if (!button || button.disabled) {
            return;
        }

        const id = Number(button.dataset.id);

        switch (button.dataset.action) {
            case "edit-product":
                editProduct(id);
                break;

            case "duplicate-product":
                duplicateProduct(id);
                break;

            case "delete-product":
                deleteProduct(id);
                break;

            case "order-status":
                changeOrderStatus(id, button.dataset.status);
                break;

            default:
                break;
        }
    });

    /* =========================================================
       HELPERS
       ========================================================= */

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent =
                value === null || value === undefined
                    ? "—"
                    : String(value);
        }
    }

    function setValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.value =
                value === null || value === undefined ? "" : value;
        }
    }

    function getValue(id) {
        return document.getElementById(id)?.value ?? "";
    }

    function setBar(id, percentage) {
        const element = document.getElementById(id);

        if (!element) {
            return;
        }

        const value = Math.max(0, Math.min(100, Number(percentage) || 0));

        element.style.width = `${value}%`;
    }

    function numberValue(value) {
        const number = Number.parseFloat(value);

        return Number.isFinite(number) ? number : 0;
    }

    function getInitials(name) {
        const parts = String(name || "Producer")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!parts.length) {
            return "P";
        }

        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
        }

        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function normalizeStatus(status) {
        return String(status || "pending")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "_");
    }

    function capitalize(value) {
        if (!value) {
            return "";
        }

        return String(value)
            .replace(/_/g, " ")
            .replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function formatNumber(value) {
        return new Intl.NumberFormat("en-KE").format(numberValue(value));
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
            maximumFractionDigits: 2
        }).format(numberValue(value));
    }

    function getProductIcon(category) {
        const value = String(category || "").toLowerCase();

        if (/vegetable|spinach|kale/.test(value)) return "🥬";
        if (/fruit|banana|mango/.test(value)) return "🍎";
        if (/grain|maize|cereal/.test(value)) return "🌾";
        if (/milk|dairy/.test(value)) return "🥛";
        if (/egg|poultry|chicken/.test(value)) return "🥚";
        if (/meat|beef|goat/.test(value)) return "🥩";

        return "🌱";
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function emptyState(title, message) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">🌱</div>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(message)}</p>
            </div>
        `;
    }

    function extractErrorMessage(error, fallback) {
        if (!error) {
            return fallback;
        }

        if (typeof error === "string") {
            return error;
        }

        return (
            error?.response?.data?.message ||
            error?.response?.data?.msg ||
            error?.data?.message ||
            error?.message ||
            fallback
        );
    }

    function showError(message) {
        console.error(message);

        if (typeof window.showToast === "function") {
            window.showToast(message, "error");
            return;
        }

        const alertBox = document.getElementById("errorAlert");

        if (alertBox) {
            alertBox.textContent = message;
            alertBox.classList.add("show");

            setTimeout(() => {
                alertBox.classList.remove("show");
            }, 5000);
            return;
        }

        window.alert(message);
    }

    function showSuccess(message) {
        console.log(message);

        if (typeof window.showToast === "function") {
            window.showToast(message, "success");
            return;
        }

        const alertBox = document.getElementById("successAlert");

        if (alertBox) {
            alertBox.textContent = message;
            alertBox.classList.add("show");

            setTimeout(() => {
                alertBox.classList.remove("show");
            }, 3000);
        }
    }

    function setFormLoading(loading) {
        const form = document.getElementById("addProductForm");

        if (!form) {
            return;
        }

        form
            .querySelectorAll("button[type='submit'], input[type='submit']")
            .forEach(button => {
                button.disabled = loading;

                if (loading) {
                    button.dataset.originalText = button.textContent;
                    button.textContent = "Saving...";
                } else if (button.dataset.originalText) {
                    button.textContent = button.dataset.originalText;
                }
            });
    }

    /* =========================================================
       PUBLIC API
       ========================================================= */

    window.editProduct = editProduct;
    window.addProduct = addProduct;
    window.deleteProduct = deleteProduct;
    window.duplicateProduct = duplicateProduct;
    window.changeOrderStatus = changeOrderStatus;

    window.loadProducts = async function () {
        await loadProducts();
        renderDashboard();
    };

    window.loadOrders = async function () {
        await loadOrders();
        renderDashboard();
    };

    window.ModernFarmsProducer = {
        getUser: () => currentUser,
        getFarm: () => currentFarm,
        getProducts: () => products,
        getOrders: () => orders,
        refresh: refreshDashboardData
    };

})();
/**
 * Customer Dashboard Logic
 * Handles Authentication, Navigation, Marketplace Browsing, Cart & Checkout, and Orders.
 */
(function () {
    "use strict";

    const API_BASE = "http://127.0.0.1:5000/api";
    const $ = (selector) => document.querySelector(selector);
    const $$ = (selector) => document.querySelectorAll(selector);

    // State Management
    let state = {
        products: [],
        orders: [],
        cart: [],
        activeTab: "overview",
        selectedCategory: "all"
    };

    /* =========================================================
       1. AUTHENTICATION & HEADERS
       ========================================================= */
    function getAuthToken() {
        return localStorage.getItem("modern_farms_token") || localStorage.getItem("access_token");
    }

    function getAuthHeaders() {
        const token = getAuthToken();
        return {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token.replace(/^Bearer\s+/i, "")}` : ""
        };
    }

    async function apiFetch(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const headers = { ...getAuthHeaders(), ...(options.headers || {}) };

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (response.status === 401) {
                console.warn("Session expired or unauthorized. Redirecting to login...");
                localStorage.clear();
                window.location.href = "login.html";
                return;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API Fetch Error (${endpoint}):`, error);
            throw error;
        }
    }

    /* =========================================================
       2. INITIALIZATION & METRICS
       ========================================================= */
    async function initCustomerDashboard() {
        setupNavigation();
        setupCartEvents();
        setupSearchAndFilters();
        
        // Load initial data
        await Promise.all([loadProducts(), loadOrders()]);
        renderCart();
    }

    async function loadProducts() {
        try {
            const data = await apiFetch("/products");
            state.products = data.products || data.data || (Array.isArray(data) ? data : []);
            renderProducts();
        } catch (error) {
            console.warn("Failed to fetch products:", error.message);
            const grid = $("#freshProductsGrid") || $("#productsGrid");
            if (grid) grid.innerHTML = `<div class="p-4 text-center text-red-500">Failed to load marketplace products.</div>`;
        }
    }

    async function loadOrders() {
        try {
            const data = await apiFetch("/orders/my-orders");
            state.orders = data.orders || data.data || (Array.isArray(data) ? data : []);
            renderOrders();
            updateCustomerDashboardStats(state.orders);
        } catch (error) {
            console.warn("Failed to fetch orders:", error.message);
        }
    }

    function updateCustomerDashboardStats(orders) {
        const totalSpent = orders.reduce((sum, o) => {
            const status = String(o.status || "").toLowerCase();
            return ["completed", "delivered", "paid"].includes(status)
                ? sum + Number(o.total || o.total_amount || 0)
                : sum;
        }, 0);

        const pendingCount = orders.filter(o => 
            ["pending", "processing", "in transit", "shipped"].includes(String(o.status).toLowerCase())
        ).length;

        const completedCount = orders.filter(o => 
            ["completed", "delivered"].includes(String(o.status).toLowerCase())
        ).length;

        // UI DOM Updates
        if ($("#statTotalSpent")) $("#statTotalSpent").textContent = `Ksh ${totalSpent.toLocaleString()}`;
        if ($("#statPendingOrders")) $("#statPendingOrders").textContent = pendingCount;
        if ($("#statCompletedOrders")) $("#statCompletedOrders").textContent = completedCount;
        if ($("#statTotalOrders")) $("#statTotalOrders").textContent = orders.length;
    }

    /* =========================================================
       3. RENDERERS (MARKETPLACE & ORDERS)
       ========================================================= */
    function renderProducts() {
        const grid = $("#freshProductsGrid") || $("#productsGrid");
        if (!grid) return;

        let filtered = state.products;
        if (state.selectedCategory !== "all") {
            filtered = filtered.filter(p => (p.category || "").toLowerCase() === state.selectedCategory.toLowerCase());
        }

        const searchTerm = ($("#productSearch")?.value || "").toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(p => (p.name || "").toLowerCase().includes(searchTerm));
        }

        if (filtered.length === 0) {
            grid.innerHTML = `<div class="p-4 text-center text-gray-500 col-span-full">No products available.</div>`;
            return;
        }

        grid.innerHTML = filtered.map(p => `
            <div class="product-card border rounded p-3 bg-white shadow-sm hover:shadow transition">
                <img src="${p.image_url || 'https://via.placeholder.com/150'}" alt="${escapeHtml(p.name)}" class="w-full h-32 object-cover rounded mb-2">
                <span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">${escapeHtml(p.category || 'Produce')}</span>
                <h4 class="font-bold text-md mt-1">${escapeHtml(p.name)}</h4>
                <p class="text-sm text-gray-600 mb-2">Ksh ${Number(p.price).toFixed(2)} / ${escapeHtml(p.unit || 'unit')}</p>
                <button data-id="${p.id}" class="add-to-cart-btn btn-primary w-full py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700">
                    Add to Cart
                </button>
            </div>
        `).join('');

        $$(".add-to-cart-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const prodId = e.target.getAttribute("data-id");
                addToCart(prodId);
            });
        });
    }

    function renderOrders() {
        const container = $("#ordersTableBody") || $("#recentOrdersList");
        if (!container) return;

        if (state.orders.length === 0) {
            container.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">No order history found.</td></tr>`;
            return;
        }

        container.innerHTML = state.orders.map(o => `
            <tr class="border-b">
                <td class="p-2 font-semibold">#${o.id || o.order_id}</td>
                <td class="p-2">${new Date(o.created_at || Date.now()).toLocaleDateString()}</td>
                <td class="p-2">Ksh ${Number(o.total || o.total_amount || 0).toLocaleString()}</td>
                <td class="p-2">
                    <span class="px-2 py-1 text-xs rounded uppercase font-bold ${getStatusClass(o.status)}">
                        ${escapeHtml(o.status || 'Pending')}
                    </span>
                </td>
                <td class="p-2">
                    <button data-id="${o.id || o.order_id}" class="view-order-btn text-blue-600 hover:underline text-sm">Details</button>
                </td>
            </tr>
        `).join('');
    }

    /* =========================================================
       4. CART & CHECKOUT LOGIC
       ========================================================= */
    function addToCart(productId) {
        const product = state.products.find(p => String(p.id) === String(productId));
        if (!product) return;

        const existing = state.cart.find(item => String(item.id) === String(productId));
        if (existing) {
            existing.quantity += 1;
        } else {
            state.cart.push({ ...product, quantity: 1 });
        }
        renderCart();
    }

    function renderCart() {
        const cartContainer = $("#cartItemsList");
        const cartBadge = $("#cartBadge");
        const cartTotalEl = $("#cartTotalAmount");

        const totalItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (cartBadge) cartBadge.textContent = totalItems;
        if (cartTotalEl) cartTotalEl.textContent = `Ksh ${totalPrice.toLocaleString()}`;

        if (!cartContainer) return;

        if (state.cart.length === 0) {
            cartContainer.innerHTML = `<p class="p-4 text-center text-gray-500">Your cart is empty.</p>`;
            return;
        }

        cartContainer.innerHTML = state.cart.map(item => `
            <div class="flex items-center justify-between p-2 border-b">
                <div>
                    <h5 class="font-bold text-sm">${escapeHtml(item.name)}</h5>
                    <span class="text-xs text-gray-500">Ksh ${item.price} x ${item.quantity}</span>
                </div>
                <div class="flex items-center space-x-2">
                    <button data-id="${item.id}" class="cart-dec px-2 py-0.5 bg-gray-200 rounded">-</button>
                    <span class="text-sm">${item.quantity}</span>
                    <button data-id="${item.id}" class="cart-inc px-2 py-0.5 bg-gray-200 rounded">+</button>
                </div>
            </div>
        `).join('');

        $$(".cart-dec").forEach(btn => btn.addEventListener("click", (e) => updateCartQty(e.target.dataset.id, -1)));
        $$(".cart-inc").forEach(btn => btn.addEventListener("click", (e) => updateCartQty(e.target.dataset.id, 1)));
    }

    function updateCartQty(id, delta) {
        const item = state.cart.find(i => String(i.id) === String(id));
        if (!item) return;

        item.quantity += delta;
        if (item.quantity <= 0) {
            state.cart = state.cart.filter(i => String(i.id) !== String(id));
        }
        renderCart();
    }

    async function checkout() {
        if (state.cart.length === 0) {
            alert("Your cart is empty!");
            return;
        }

        const payload = {
            items: state.cart.map(i => ({ product_id: i.id, quantity: i.quantity, price: i.price })),
            total_amount: state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)
        };

        try {
            await apiFetch("/orders", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            alert("Order placed successfully!");
            state.cart = [];
            renderCart();
            loadOrders();
        } catch (error) {
            alert(`Checkout failed: ${error.message}`);
        }
    }

    /* =========================================================
       5. HELPERS & EVENT LISTENERS
       ========================================================= */
    function setupNavigation() {
        $$("[data-tab]").forEach(tab => {
            tab.addEventListener("click", (e) => {
                e.preventDefault();
                const targetTab = tab.getAttribute("data-tab");
                state.activeTab = targetTab;

                $$(".dashboard-panel").forEach(panel => panel.classList.add("hidden"));
                $(`#panel-${targetTab}`)?.classList.remove("hidden");

                $$("[data-tab]").forEach(t => t.classList.remove("active", "font-bold"));
                tab.classList.add("active", "font-bold");
            });
        });
    }

    function setupCartEvents() {
        $("#checkoutBtn")?.addEventListener("click", checkout);
    }

    function setupSearchAndFilters() {
        $("#productSearch")?.addEventListener("input", renderProducts);
        $("#categoryFilter")?.addEventListener("change", (e) => {
            state.selectedCategory = e.target.value;
            renderProducts();
        });
    }

    function getStatusClass(status = "") {
        switch (status.toLowerCase()) {
            case "completed": case "delivered": return "bg-green-100 text-green-800";
            case "pending": case "processing": return "bg-yellow-100 text-yellow-800";
            case "cancelled": return "bg-red-100 text-red-800";
            default: return "bg-gray-100 text-gray-800";
        }
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    document.addEventListener("DOMContentLoaded", initCustomerDashboard);
})();
/*
=========================================================
MODERN FARMS - CUSTOMER DASHBOARD CONTROLLER
=========================================================
*/

(function () {
    "use strict";

    const API = window.ModernFarmsAPI;
    const UI = window.ModernFarms;

    document.addEventListener("DOMContentLoaded", () => {
        verifyCustomerAuth();
        initializeTabs();
        loadCustomerOrders();
        loadAvailableProduce();
        initializeOrderModal();
    });

    /*
    =========================================================
    AUTH & SESSION CHECK
    =========================================================
    */
    function verifyCustomerAuth() {
        const user = API ? API.getCurrentUser() : JSON.parse(localStorage.getItem("modern_farms_user") || "null");

        if (!user) {
            window.location.replace("/frontend/pages/login.html");
            return;
        }

        const role = String(user.role || "").toLowerCase();
        const isCustomer = ["customer", "buyer", "client"].includes(role);

        if (!isCustomer) {
            // Redirect non-customers (producers/admins) to their appropriate panel
            window.location.replace("/frontend/pages/producer-dashboard.html");
            return;
        }

        // Render customer info on sidebar/header
        const nameEl = document.getElementById("customerName");
        const emailEl = document.getElementById("customerEmail");

        if (nameEl) nameEl.textContent = user.name || "Valued Customer";
        if (emailEl) emailEl.textContent = user.email || "";
    }

    /*
    =========================================================
    NAVIGATION TABS
    =========================================================
    */
    function initializeTabs() {
        const tabLinks = document.querySelectorAll(".dash-tab-link");
        const tabPanes = document.querySelectorAll(".dash-tab-pane");

        tabLinks.forEach(link => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const targetId = link.dataset.tab;

                tabLinks.forEach(l => l.classList.remove("active"));
                tabPanes.forEach(p => p.classList.remove("active"));

                link.classList.add("active");
                const activePane = document.getElementById(targetId);
                if (activePane) activePane.classList.add("active");
            });
        });
    }

    /*
    =========================================================
    CUSTOMER ORDERS
    =========================================================
    */
    async function loadCustomerOrders() {
        const ordersContainer = document.getElementById("customerOrdersList");
        if (!ordersContainer) return;

        ordersContainer.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading your order history...</p>
            </div>
        `;

        try {
            const response = await fetch(`${API ? API.baseURL : "http://127.0.0.1:5000"}/api/orders/my-orders`, {
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("modern_farms_token") || ""}`
                }
            });

            if (!response.ok) throw new Error("Failed to load orders");

            const data = await response.json();
            const orders = Array.isArray(data.orders) ? data.orders : (Array.isArray(data) ? data : []);

            if (orders.length === 0) {
                ordersContainer.innerHTML = `
                    <div class="empty-orders">
                        <p>You haven't placed any orders yet.</p>
                        <a href="#browse-tab" class="btn btn-primary dash-tab-link" data-tab="browseProduceTab">Browse Marketplace</a>
                    </div>
                `;
                return;
            }

            renderOrdersTable(ordersContainer, orders);
        } catch (error) {
            console.error("Order history error:", error);
            ordersContainer.innerHTML = `
                <div class="error-state">
                    <p>Unable to load orders. Please try again later.</p>
                </div>
            `;
        }
    }

    function renderOrdersTable(container, orders) {
        container.innerHTML = `
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Total (KSh)</th>
                        <th>Status</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.map(order => `
                        <tr>
                            <td>#${UI ? UI.escapeHTML(order.id) : order.id}</td>
                            <td>${UI ? UI.escapeHTML(order.product_name || "Farm Item") : order.product_name}</td>
                            <td>${order.quantity} ${order.unit || "kg"}</td>
                            <td>KSh ${UI ? UI.formatPrice(order.total_price) : order.total_price}</td>
                            <td><span class="status-badge ${String(order.status).toLowerCase()}">${UI ? UI.escapeHTML(order.status) : order.status}</span></td>
                            <td>${new Date(order.created_at || Date.now()).toLocaleDateString("en-KE")}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    }

    /*
    =========================================================
    AVAILABLE PRODUCE MARKETPLACE
    =========================================================
    */
    async function loadAvailableProduce() {
        const grid = document.getElementById("customerProduceGrid");
        if (!grid) return;

        if (window.ModernFarms && typeof window.ModernFarms.loadMarketplaceProducts === "function") {
            // Re-use logic from app.js to populate the dashboard produce tab
            window.ModernFarms.loadMarketplaceProducts();
        }
    }

    /*
    =========================================================
    ORDER PLACEMENT MODAL & ACTIONS
    =========================================================
    */
    function initializeOrderModal() {
        const modal = document.getElementById("orderModal");
        const form = document.getElementById("orderForm");
        if (!modal || !form) return;

        // Open modal when clicking any produce item
        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".order-now-btn");
            if (!btn) return;

            const productId = btn.dataset.productId;
            const productName = btn.dataset.productName;
            const price = btn.dataset.price;

            document.getElementById("modalProductId").value = productId;
            document.getElementById("modalProductName").textContent = productName;
            document.getElementById("modalUnitPrice").value = price;

            modal.classList.add("open");
        });

        // Close modal handlers
        document.querySelectorAll(".close-modal-btn").forEach(btn => {
            btn.addEventListener("click", () => modal.classList.remove("open"));
        });

        // Form submit
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const productId = document.getElementById("modalProductId").value;
            const quantity = Number(document.getElementById("modalQuantity").value);
            const address = document.getElementById("modalAddress").value.trim();

            try {
                const response = await fetch(`${API ? API.baseURL : "http://127.0.0.1:5000"}/api/orders/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("modern_farms_token") || ""}`
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        quantity: quantity,
                        delivery_address: address
                    })
                });

                if (!response.ok) throw new Error("Order creation failed.");

                modal.classList.remove("open");
                alert("Order placed successfully!");
                loadCustomerOrders();
            } catch (err) {
                alert(err.message || "Could not complete order.");
            }
        });
    }

    /*
    =========================================================
    EXPORTS
    =========================================================
    */
    window.CustomerDashboard = {
        loadCustomerOrders,
        loadAvailableProduce
    };
})();
/**
 * Producer Dashboard Logic
 * Handles Inventory Management, Add/Edit Products, Metrics Reporting, and Order Status Operations.
 */
(function () {
    "use strict";

    const API_BASE = "http://127.0.0.1:5000/api";
    const $ = (s) => document.querySelector(s);
    const $$ = (s) => document.querySelectorAll(s);

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

    async function producerFetch(endpoint, options = {}) {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: { ...getAuthHeaders(), ...(options.headers || {}) }
        });

        if (res.status === 401) {
            window.location.href = "login.html";
            return;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `API Error: ${res.status}`);
        }
        return res.json();
    }

    /* =========================================================
       1. CORE INITIALIZATION
       ========================================================= */
    async function initProducerDashboard() {
        setupProducerEvents();
        await loadProducerData();
    }

    async function loadProducerData() {
        try {
            const [metrics, productsData, ordersData] = await Promise.all([
                producerFetch("/producer/metrics").catch(() => null),
                producerFetch("/producer/products").catch(() => []),
                producerFetch("/producer/orders").catch(() => [])
            ]);

            const products = productsData.products || productsData.data || (Array.isArray(productsData) ? productsData : []);
            const orders = ordersData.orders || ordersData.data || (Array.isArray(ordersData) ? ordersData : []);

            if (metrics) {
                renderMetrics(metrics);
            } else {
                calculateAndRenderMetrics(products, orders);
            }

            renderInventoryTable(products);
            renderOrdersOverview(orders);
        } catch (err) {
            console.error("Error loading producer dashboard data:", err);
        }
    }

    /* =========================================================
       2. METRICS & TABLES RENDERERS
       ========================================================= */
    function renderMetrics(m) {
        if ($("#totalProductsCount")) $("#totalProductsCount").textContent = m.total_products || 0;
        if ($("#totalInventoryCount")) $("#totalInventoryCount").textContent = m.total_inventory || 0;
        if ($("#totalOrdersCount")) $("#totalOrdersCount").textContent = m.total_orders || 0;
        if ($("#pendingOrdersCount")) $("#pendingOrdersCount").textContent = m.pending_orders || 0;
        if ($("#totalRevenue")) $("#totalRevenue").textContent = `Ksh ${(m.total_revenue || 0).toLocaleString()}`;
    }

    function calculateAndRenderMetrics(products, orders) {
        const totalProducts = products.length;
        const totalInventory = products.reduce((sum, p) => sum + Number(p.quantity || p.stock || 0), 0);
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => ["pending", "processing"].includes((o.status || "").toLowerCase())).length;
        const totalRevenue = orders.reduce((sum, o) => {
            return ["completed", "delivered", "paid"].includes((o.status || "").toLowerCase())
                ? sum + Number(o.total || o.amount || 0)
                : sum;
        }, 0);

        renderMetrics({
            total_products: totalProducts,
            total_inventory: totalInventory,
            total_orders: totalOrders,
            pending_orders: pendingOrders,
            total_revenue: totalRevenue
        });
    }

    function renderInventoryTable(items) {
        const tbody = $("#producerProductsTableBody") || $("#inventoryTableBody");
        if (!tbody) return;

        if (!items.length) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center p-4 text-gray-500">No products listed in your inventory yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = items.map(p => {
            const stock = Number(p.quantity ?? p.stock ?? 0);
            return `
                <tr class="border-b">
                    <td class="p-2 font-bold">${escapeHtml(p.name)}</td>
                    <td class="p-2"><span class="px-2 py-1 text-xs bg-gray-100 rounded">${escapeHtml(p.category || 'General')}</span></td>
                    <td class="p-2">Ksh ${Number(p.price).toFixed(2)} / ${escapeHtml(p.unit || 'item')}</td>
                    <td class="p-2">${stock}</td>
                    <td class="p-2">${p.sold || 0}</td>
                    <td class="p-2">
                        <span class="px-2 py-1 text-xs rounded ${stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${stock > 0 ? 'In Stock' : 'Out of Stock'}
                        </span>
                    </td>
                    <td class="p-2">
                        <button data-id="${p.id}" class="edit-prod-btn p-1 hover:text-blue-600">✏️</button>
                        <button data-id="${p.id}" class="delete-prod-btn p-1 hover:text-red-600">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

        $$(".delete-prod-btn").forEach(btn => btn.addEventListener("click", (e) => deleteProduct(e.target.dataset.id)));
    }

    function renderOrdersOverview(orders) {
        const container = $("#recentOrdersContainer") || $("#producerOrdersBody");
        if (!container) return;

        if (!orders.length) {
            container.innerHTML = `<div class="p-4 text-center text-gray-500">No active customer orders.</div>`;
            return;
        }

        container.innerHTML = orders.slice(0, 5).map(o => `
            <div class="p-3 border rounded mb-2 flex justify-between items-center bg-white shadow-sm">
                <div>
                    <span class="font-bold text-sm">Order #${o.id || o.order_id}</span>
                    <p class="text-xs text-gray-500">Amount: Ksh ${Number(o.total || o.amount || 0).toLocaleString()}</p>
                </div>
                <div class="flex items-center space-x-2">
                    <span class="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 font-bold">${escapeHtml(o.status || 'Pending')}</span>
                    <button data-id="${o.id || o.order_id}" class="update-status-btn text-xs bg-gray-800 text-white px-2 py-1 rounded">Update</button>
                </div>
            </div>
        `).join('');
    }

    /* =========================================================
       3. INVENTORY ACTIONS & MODALS
       ========================================================= */
    function setupProducerEvents() {
        $("#addProductForm")?.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                name: $("#prodName")?.value,
                category: $("#prodCategory")?.value,
                price: Number($("#prodPrice")?.value || 0),
                unit: $("#prodUnit")?.value || "item",
                quantity: Number($("#prodQuantity")?.value || 0),
                description: $("#prodDescription")?.value || ""
            };

            try {
                await producerFetch("/producer/products", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
                closeModal("#addProductModal");
                loadProducerData();
            } catch (err) {
                alert("Failed to save product: " + err.message);
            }
        });

        $("#openAddProductModalBtn")?.addEventListener("click", () => openModal("#addProductModal"));
        $$(".close-modal-btn").forEach(btn => btn.addEventListener("click", (e) => {
            const modal = e.target.closest(".modal");
            if (modal) modal.classList.add("hidden");
        }));
    }

    async function deleteProduct(id) {
        if (!confirm("Are you sure you want to delete this product listing?")) return;
        try {
            await producerFetch(`/producer/products/${id}`, { method: "DELETE" });
            loadProducerData();
        } catch (err) {
            alert("Failed to delete product: " + err.message);
        }
    }

    function openModal(selector) {
        $(selector)?.classList.remove("hidden");
    }

    function closeModal(selector) {
        $(selector)?.classList.add("hidden");
    }

    function escapeHtml(str) {
        return String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    document.addEventListener("DOMContentLoaded", initProducerDashboard);
})();
/*
=========================================================
MODERN FARMS - PRODUCER DASHBOARD CONTROLLER
=========================================================
*/

(function () {
    "use strict";

    const API = window.ModernFarmsAPI;
    const UI = window.ModernFarms;

    document.addEventListener("DOMContentLoaded", () => {
        verifyProducerAuth();
        loadProducerInventory();
        initializeAddProductForm();
    });

    function verifyProducerAuth() {
        const user = API ? API.getCurrentUser() : JSON.parse(localStorage.getItem("modern_farms_user") || "null");

        if (!user) {
            window.location.replace("/frontend/pages/login.html");
            return;
        }

        const role = String(user.role || "").toLowerCase();
        const isProducer = ["producer", "farmer", "seller", "vendor"].includes(role);

        if (!isProducer) {
            window.location.replace("/frontend/pages/customer-dashboard.html");
            return;
        }

        const nameEl = document.getElementById("producerName");
        if (nameEl) nameEl.textContent = user.name || "Farm Producer";
    }

    async function loadProducerInventory() {
        const tableBody = document.getElementById("producerInventoryBody");
        if (!tableBody) return;

        try {
            const response = await fetch(`${API ? API.baseURL : "http://127.0.0.1:5000"}/api/products/my-products`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("modern_farms_token") || ""}`
                }
            });

            if (!response.ok) throw new Error("Failed to fetch inventory");

            const data = await response.json();
            const products = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);

            if (products.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" class="text-center">No products listed yet. Add your first harvest below!</td></tr>`;
                return;
            }

            tableBody.innerHTML = products.map(item => `
                <tr>
                    <td><strong>${UI ? UI.escapeHTML(item.name) : item.name}</strong></td>
                    <td>${UI ? UI.escapeHTML(item.category || "Produce") : item.category}</td>
                    <td>KSh ${UI ? UI.formatPrice(item.price) : item.price} / ${UI ? UI.escapeHTML(item.unit || "kg") : item.unit}</td>
                    <td>${item.quantity_remaining ?? item.quantity_posted ?? 0}</td>
                    <td>
                        <button class="btn btn-sm btn-danger delete-item-btn" data-id="${item.id}">Delete</button>
                    </td>
                </tr>
            `).join("");
        } catch (err) {
            console.error("Inventory load error:", err);
            tableBody.innerHTML = `<tr><td colspan="5" class="text-center error">Failed to load inventory.</td></tr>`;
        }
    }

    function initializeAddProductForm() {
        const form = document.getElementById("addProductForm");
        if (!form) return;

        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const payload = {
                name: document.getElementById("prodName").value.trim(),
                category: document.getElementById("prodCategory").value,
                price: parseFloat(document.getElementById("prodPrice").value),
                unit: document.getElementById("prodUnit").value || "kg",
                quantity_posted: parseInt(document.getElementById("prodQuantity").value, 10),
                description: document.getElementById("prodDescription").value.trim()
            };

            try {
                const response = await fetch(`${API ? API.baseURL : "http://127.0.0.1:5000"}/api/products/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("modern_farms_token") || ""}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error("Could not save product.");

                form.reset();
                alert("Produce added successfully!");
                loadProducerInventory();
            } catch (err) {
                alert(err.message || "Failed to add product.");
            }
        });
    }
})();
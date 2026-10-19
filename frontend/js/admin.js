/* =========================================================
   MODERN FARMS - ADMIN DASHBOARD
   frontend/js/admin.js
   ========================================================= */

(function () {
    "use strict";

    const LOGIN_URL = "/frontend/pages/login.html";
    const TOKEN_KEYS = ["modern_farms_token", "access_token", "token"];
    const ADMIN_ROLES = ["admin", "administrator"];

    const state = {
        producers: [],
        customers: [],
        products: [],
        search: { producers: "", customers: "", products: "" },
        producerFilter: ""
    };

    /* ---------------------------------------------------------
       API
       --------------------------------------------------------- */

    function getToken() {
        for (const key of TOKEN_KEYS) {
            const value = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (value) return value;
        }
        return null;
    }

    async function api(path, { method = "GET", body } = {}) {
        const token = getToken();

        if (!token) {
            logout();
            throw new Error("Not signed in");
        }

        const response = await fetch(`/api/${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: body ? JSON.stringify(body) : undefined
        });

        let data = null;
        try { data = await response.json(); } catch (e) { /* no body */ }

        if (response.status === 401 || response.status === 422) {
            logout();
            throw new Error("Session expired");
        }

        if (!response.ok || data?.success === false) {
            throw new Error(data?.message || `Request failed (${response.status})`);
        }

        return data;
    }

    /* ---------------------------------------------------------
       INIT
       --------------------------------------------------------- */

    document.addEventListener("DOMContentLoaded", init);

    async function init() {
        try {
            const me = await api("auth/me");
            const user = me?.user || me?.data?.user || me?.data;
            const role = String(user?.role || "").toLowerCase();

            if (!ADMIN_ROLES.includes(role)) {
                toast("Admin access only. Redirecting…", true);
                setTimeout(logout, 1800);
                return;
            }

            await loadAll();

        } catch (error) {
            console.error(error);
            toast(error.message, true);
        }
    }

    async function loadAll() {
        const [stats, producers, customers, products] = await Promise.all([
            api("admin/stats"),
            api("admin/producers"),
            api("admin/customers"),
            api("admin/products")
        ]);

        state.producers = producers.producers || [];
        state.customers = customers.customers || [];
        state.products = products.products || [];

        renderStats(stats.stats || {});
        renderAll();
    }

    function renderAll() {
        renderPending();
        renderProducers();
        renderCustomers();
        renderProducts();
    }

    /* ---------------------------------------------------------
       RENDER
       --------------------------------------------------------- */

    function renderStats(s) {
        setText("sProducers", s.producers_total);
        setText("sPending", s.producers_pending);
        setText("sCustomers", s.customers);
        setText("sProducts", s.products);
        setText("sOrders", s.orders);

        const badge = document.getElementById("pendingBadge");
        badge.textContent = s.producers_pending || 0;
        badge.dataset.zero = s.producers_pending ? "0" : "1";
    }

    function renderPending() {
        const pending = state.producers.filter(p => p.approval_status === "pending");
        const box = document.getElementById("pendingList");

        if (!pending.length) {
            box.innerHTML = `<div class="empty">No producers are waiting for approval.</div>`;
            return;
        }

        box.innerHTML = pending.map(p => `
            <div class="pending-row">
                <div>
                    <strong>${esc(p.name)}</strong>
                    <small>${esc(p.email)}${p.farm_name ? " · " + esc(p.farm_name) : ""}</small>
                </div>
                <div>${producerActions(p)}</div>
            </div>
        `).join("");
    }

    function producerActions(p) {
        const btn = (status, label, danger) => `
            <button class="btn ${danger ? "danger" : ""}" data-action="producer"
                data-id="${p.id}" data-status="${status}">${label}</button>`;

        switch (p.approval_status) {
            case "pending":   return btn("approved", "Approve") + btn("rejected", "Reject", true);
            case "approved":  return btn("suspended", "Suspend", true);
            case "suspended": return btn("approved", "Reinstate");
            case "rejected":  return btn("approved", "Approve");
            default:          return "";
        }
    }

    function renderProducers() {
        const q = state.search.producers;

        const rows = state.producers.filter(p =>
            (!state.producerFilter || p.approval_status === state.producerFilter) &&
            matches(q, p.name, p.email, p.farm_name)
        );

        table("producersTable", ["Producer", "Farm", "Products", "Status", ""], rows, p => `
            <tr>
                <td><strong>${esc(p.name)}</strong><small>${esc(p.email)}</small></td>
                <td>${esc(p.farm_name || "—")}</td>
                <td>${p.product_count}</td>
                <td>${pill(p.approval_status)}</td>
                <td class="actions">${producerActions(p)}</td>
            </tr>
        `, "No producers found.");
    }

    function renderCustomers() {
        const rows = state.customers.filter(c =>
            matches(state.search.customers, c.name, c.email)
        );

        table("customersTable", ["Customer", "Phone", "Orders", "Total spent", "Joined"], rows, c => `
            <tr>
                <td><strong>${esc(c.name)}</strong><small>${esc(c.email)}</small></td>
                <td>${esc(c.phone || "—")}</td>
                <td>${c.order_count}</td>
                <td>${money(c.total_spent)}</td>
                <td>${fmtDate(c.created_at)}</td>
            </tr>
        `, "No customers found.");
    }

    function renderProducts() {
        const rows = state.products.filter(p =>
            matches(state.search.products, p.name, p.producer_name, p.farm_name, p.category)
        );

        table("productsTable",
            ["Product", "Producer / Farm", "Price", "Stock", "Sold", "Status", ""], rows, p => `
            <tr>
                <td><strong>${esc(p.name)}</strong><small>${esc(p.category || "General")}</small></td>
                <td>${esc(p.producer_name || "—")}<small>${esc(p.farm_name || "")}</small></td>
                <td>${money(p.price)}</td>
                <td>${num(p.quantity_remaining)} ${esc(p.unit || "")}</td>
                <td>${num(p.quantity_sold)}</td>
                <td>${pill(p.status)}</td>
                <td class="actions">
                    ${p.status === "inactive"
                        ? `<button class="btn" data-action="product" data-id="${p.id}" data-status="available">Enable</button>`
                        : `<button class="btn danger" data-action="product" data-id="${p.id}" data-status="inactive">Disable</button>`}
                </td>
            </tr>
        `, "No products found.");
    }

    function table(id, headers, rows, rowFn, emptyText) {
        const box = document.getElementById(id);

        if (!rows.length) {
            box.innerHTML = `<div class="empty">${emptyText}</div>`;
            return;
        }

        box.innerHTML = `
            <table>
                <thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
                <tbody>${rows.map(rowFn).join("")}</tbody>
            </table>`;
    }

    /* ---------------------------------------------------------
       ACTIONS
       --------------------------------------------------------- */

    async function setProducerStatus(id, status) {
        const producer = state.producers.find(p => p.id === id);
        const verbs = { approved: "Approve", rejected: "Reject", suspended: "Suspend" };

        if (!confirm(`${verbs[status] || "Update"} ${producer?.name || "this producer"}?`)) {
            return;
        }

        await run(async () => {
            await api(`admin/producers/${id}/approval`, { method: "PUT", body: { status } });
            toast(`Producer marked as ${status}.`);
            await loadAll();
        });
    }

    async function setProductStatus(id, status) {
        await run(async () => {
            await api(`admin/products/${id}/status`, { method: "PUT", body: { status } });
            toast(status === "inactive" ? "Product disabled." : "Product enabled.");
            await loadAll();
        });
    }

    async function run(task) {
        try {
            await task();
        } catch (error) {
            console.error(error);
            toast(error.message, true);
        }
    }

    function logout() {
        TOKEN_KEYS.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        window.location.href = LOGIN_URL;
    }

    /* ---------------------------------------------------------
       EVENTS
       --------------------------------------------------------- */

    document.addEventListener("click", event => {
        const nav = event.target.closest(".nav-item");

        if (nav) {
            document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
            document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
            nav.classList.add("active");
            document.getElementById(nav.dataset.section)?.classList.add("active");
            return;
        }

        const btn = event.target.closest("[data-action]");
        if (!btn) return;

        const id = Number(btn.dataset.id);

        switch (btn.dataset.action) {
            case "producer": setProducerStatus(id, btn.dataset.status); break;
            case "product":  setProductStatus(id, btn.dataset.status); break;
            case "logout":   logout(); break;
        }
    });

    document.addEventListener("input", event => {
        const key = event.target.dataset?.search;
        if (!key) return;

        state.search[key] = event.target.value;
        ({ producers: renderProducers, customers: renderCustomers, products: renderProducts })[key]();
    });

    document.addEventListener("change", event => {
        if (event.target.id === "producerFilter") {
            state.producerFilter = event.target.value;
            renderProducers();
        }
    });

    /* ---------------------------------------------------------
       HELPERS
       --------------------------------------------------------- */

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? 0;
    }

    function matches(query, ...fields) {
        const q = String(query || "").trim().toLowerCase();
        return !q || fields.some(f => String(f ?? "").toLowerCase().includes(q));
    }

    function pill(status) {
        const s = String(status || "unknown").toLowerCase();
        return `<span class="pill ${esc(s)}">${esc(s.replace(/_/g, " "))}</span>`;
    }

    function money(value) {
        return new Intl.NumberFormat("en-KE", {
            style: "currency", currency: "KES", maximumFractionDigits: 2
        }).format(Number(value) || 0);
    }

    function num(value) {
        return new Intl.NumberFormat("en-KE").format(Number(value) || 0);
    }

    function fmtDate(value) {
        const d = value ? new Date(value) : null;
        return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-KE") : "—";
    }

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    let toastTimer = null;

    function toast(message, isError) {
        const el = document.getElementById("toast");
        if (!el) return;

        el.textContent = message;
        el.className = `toast show${isError ? " error" : ""}`;

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.className = "toast"; }, 3500);
    }

})();
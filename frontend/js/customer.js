"use strict";

/*
=========================================================
MODERN FARMS
CUSTOMER DASHBOARD CONTROLLER
=========================================================

Uses:
    /frontend/js/api.js

Backend order API:
    GET  /api/orders/
    POST /api/orders/
    GET  /api/orders/<id>
    PUT  /api/orders/<id>/status

=========================================================
*/


let customerCart = [];
let customerProducts = [];
let activeProductCategory = "all";
let checkoutSubmitting = false;


/* =========================================================
INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeCustomerDashboard
);


async function initializeCustomerDashboard() {

    if (!protectCustomerDashboard()) {
        return;
    }

    setupCustomerNavigation();
    setupLogout();
    setupDashboardButtons();

    initializeCustomerCart();

    loadCustomerProfile();

    showCustomerSection(
        "dashboard"
    );

    await loadCustomerDashboard();
}


/* =========================================================
AUTH
========================================================= */

function protectCustomerDashboard() {

    const API =
        window.ModernFarmsAPI;

    if (!API) {

        console.error(
            "ModernFarmsAPI is not loaded."
        );

        return false;
    }


    const token =
        typeof API.getAuthToken === "function"
            ? API.getAuthToken()
            : null;


    if (!token) {

        window.location.href =
            "/frontend/pages/login.html";

        return false;
    }


    const user =
        typeof API.getCurrentUser === "function"
            ? API.getCurrentUser()
            : null;


    if (
        user &&
        user.role &&
        String(user.role).toLowerCase() !== "customer"
    ) {

        if (
            String(user.role).toLowerCase()
            === "producer"
        ) {

            window.location.href =
                "/frontend/pages/producer-dashboard.html";
        }

        return false;
    }


    return true;
}


/* =========================================================
PROFILE
========================================================= */

function loadCustomerProfile() {

    const API =
        window.ModernFarmsAPI;

    if (!API) {
        return;
    }


    const user =
        typeof API.getCurrentUser === "function"
            ? API.getCurrentUser()
            : null;


    if (!user) {
        return;
    }


    const name =
        user.full_name ||
        user.name ||
        "Customer";


    const email =
        user.email ||
        "Customer Account";


    setText(
        "customerName",
        name
    );

    setText(
        "customerEmail",
        email
    );

    setText(
        "customerHeaderName",
        name
    );

    setText(
        "customerTopName",
        name
    );

    setText(
        "profileName",
        name
    );

    setText(
        "profileEmail",
        email
    );


    const initials =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(
                part =>
                    part[0].toUpperCase()
            )
            .join("") || "C";


    document
        .querySelectorAll(
            ".customer-avatar"
        )
        .forEach(
            avatar => {

                if (
                    !avatar.querySelector("img")
                ) {

                    avatar.textContent =
                        initials;
                }

            }
        );
}


/* =========================================================
NAVIGATION
========================================================= */

function setupCustomerNavigation() {

    document
        .querySelectorAll(
            ".customer-nav-item"
        )
        .forEach(
            button => {

                if (
                    button.dataset.navigationBound
                    === "true"
                ) {
                    return;
                }


                if (
                    button.getAttribute("onclick")
                ) {

                    button.dataset.navigationBound =
                        "true";

                    return;
                }


                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        const section =
                            button.dataset.section;

                        if (section) {

                            showCustomerSection(
                                section,
                                button
                            );
                        }

                    }
                );


                button.dataset.navigationBound =
                    "true";
            }
        );
}


function showCustomerSection(
    sectionId,
    clickedButton = null
) {

    const sections =
        document.querySelectorAll(
            ".customer-section, .dashboard-section"
        );


    sections.forEach(
        section => {

            section.classList.add(
                "hidden"
            );

            section.classList.remove(
                "active"
            );

            section.style.display =
                "none";
        }
    );


    const target =
        document.getElementById(
            sectionId
        );


    if (!target) {

        console.warn(
            "Customer section not found:",
            sectionId
        );

        return false;
    }


    target.classList.remove(
        "hidden"
    );

    target.classList.add(
        "active"
    );

    target.style.display =
        "block";


    document
        .querySelectorAll(
            ".customer-nav-item"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );


                if (
                    button.dataset.section
                    === sectionId
                ) {

                    button.classList.add(
                        "active"
                    );
                }

            }
        );


    if (clickedButton) {

        clickedButton.classList.add(
            "active"
        );
    }


    if (
        sectionId === "dashboard"
    ) {

        loadCustomerDashboard();
    }


    if (
        sectionId === "orders"
    ) {

        loadCustomerOrders(
            false
        );
    }


    if (
        sectionId === "history"
    ) {

        loadOrderHistory();
    }


    if (
        sectionId === "products"
    ) {

        loadCustomerProducts(
            false
        );
    }


    return true;
}


/* =========================================================
LOGOUT
========================================================= */

function setupLogout() {

    document
        .querySelectorAll(
            "[data-action='logout'], [data-action='customer-logout']"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        customerLogout();
                    }
                );
            }
        );
}


async function customerLogout() {

    try {

        if (
            window.ModernFarmsAPI &&
            typeof window.ModernFarmsAPI.logout
            === "function"
        ) {

            await window.ModernFarmsAPI.logout();
        }

    }
    finally {

        window.location.href =
            "/frontend/pages/login.html";
    }
}


/* =========================================================
DASHBOARD BUTTONS
========================================================= */

function setupDashboardButtons() {

    document
        .querySelectorAll(
            "[data-action='open-cart'], .cart-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        renderCart();
                    }
                );
            }
        );
}


function openMarketplace() {

    showCustomerSection(
        "products"
    );

    loadCustomerProducts(
        false
    );

    setTimeout(
        () => {

            document
                .getElementById("products")
                ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

        },
        50
    );
}


/* =========================================================
DASHBOARD
========================================================= */

async function loadCustomerDashboard() {

    hideCustomerAlerts();


    try {

        const results =
            await Promise.all([
                loadCustomerOrders(true),
                loadCustomerProducts(true)
            ]);


        const orders =
            results[0] || [];


        const products =
            results[1] || [];


        updateOrderStatistics(
            orders
        );


        renderFreshProducts(
            products
        );


        updateCartCount();


        return {
            orders,
            products
        };

    }
    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        showCustomerError(
            error.message ||
            "Unable to load dashboard."
        );


        return {
            orders: [],
            products: []
        };
    }
}


/* =========================================================
ORDERS
========================================================= */

async function loadCustomerOrders(
    dashboardMode = false
) {

    const container =
        document.getElementById(
            dashboardMode
                ? "recentOrders"
                : "allOrders"
        );


    if (container) {

        container.innerHTML =
            loadingMarkup(
                "Loading orders..."
            );
    }


    try {

        const response =
            await window.ModernFarmsAPI
                .getMyOrders();


        const orders =
            extractArray(
                response,
                [
                    "orders",
                    "data"
                ]
            );


        updateOrderStatistics(
            orders
        );


        if (dashboardMode) {

            renderRecentOrders(
                orders
            );

        }
        else if (container) {

            renderOrders(
                container,
                orders
            );
        }


        return orders;

    }
    catch (error) {

        console.error(
            "Failed to load orders:",
            error
        );


        if (container) {

            container.innerHTML =
                emptyMarkup(
                    "Unable to load orders. Please refresh and try again."
                );
        }


        showCustomerError(
            error.message ||
            "Unable to load your orders."
        );


        return [];
    }
}


async function loadOrderHistory() {

    const container =
        document.getElementById(
            "orderHistory"
        );


    if (!container) {
        return [];
    }


    container.innerHTML =
        loadingMarkup(
            "Loading purchase history..."
        );


    try {

        const response =
            await window.ModernFarmsAPI
                .getMyOrders();


        const orders =
            extractArray(
                response,
                [
                    "orders",
                    "data"
                ]
            );


        const history =
            orders.filter(
                order => {

                    const status =
                        normalizeStatus(
                            order.status
                        );


                    return [
                        "delivered",
                        "completed",
                        "cancelled",
                        "rejected",
                        "confirmed"
                    ].includes(
                        status
                    );
                }
            );


        renderOrders(
            container,
            history,
            {
                showCancel: false
            }
        );


        return history;

    }
    catch (error) {

        console.error(
            "Order history error:",
            error
        );


        container.innerHTML =
            emptyMarkup(
                "Unable to load order history."
            );


        showCustomerError(
            error.message ||
            "Unable to load order history."
        );


        return [];
    }
}


/* =========================================================
ORDER STATISTICS
========================================================= */

function updateOrderStatistics(
    orders
) {

    const safeOrders =
        Array.isArray(orders)
            ? orders
            : [];


    const counts = {

        total: safeOrders.length,

        pending: 0,

        processing: 0,

        inTransit: 0,

        delivered: 0,

        cancelled: 0,

        completed: 0,

        rejected: 0
    };


    let totalSpent = 0;


    safeOrders.forEach(
        order => {

            const status =
                normalizeStatus(
                    order.status
                );


            totalSpent +=
                getOrderTotal(
                    order
                );


            if (
                status === "pending"
            ) {

                counts.pending++;

            }
            else if (
                [
                    "confirmed",
                    "accepted",
                    "shipped",
                    "ready"
                ].includes(status)
            ) {

                counts.inTransit++;

            }
            else if (
                status === "processing"
            ) {

                counts.processing++;

            }
            else if (
                status === "delivered"
            ) {

                counts.delivered++;
                counts.completed++;

            }
            else if (
                status === "completed"
            ) {

                counts.completed++;

            }
            else if (
                status === "cancelled"
            ) {

                counts.cancelled++;

            }
            else if (
                status === "rejected"
            ) {

                counts.rejected++;
            }

        }
    );


    setText(
        "totalOrders",
        counts.total
    );


    setText(
        "pendingOrders",
        counts.pending
    );


    setText(
        "completedOrders",
        counts.completed
    );


    setText(
        "totalSpent",
        formatCurrency(
            totalSpent
        )
    );


    setText(
        "deliveredCount",
        counts.delivered
    );


    setText(
        "inTransitCount",
        counts.inTransit
    );


    setText(
        "processingCount",
        counts.processing +
        counts.pending
    );


    setText(
        "cancelledCount",
        counts.cancelled +
        counts.rejected
    );


    setText(
        "statusTotal",
        counts.total
    );


    const badge =
        document.querySelector(
            ".customer-nav-item[data-section='orders'] .nav-badge"
        );


    if (badge) {

        badge.textContent =
            counts.pending;

        badge.hidden =
            counts.pending === 0;
    }


    updateStatusDonut(
        counts
    );


    return counts;
}


function updateStatusDonut(
    counts
) {

    const donut =
        document.getElementById(
            "statusDonut"
        );


    if (!donut) {
        return;
    }


    const total =
        counts.total;


    if (!total) {

        donut.style.setProperty(
            "--delivered",
            "0%"
        );

        donut.style.background =
            "#e5ece8";

        return;
    }


    const delivered =
        counts.delivered /
        total *
        100;


    const transit =
        counts.inTransit /
        total *
        100;


    const processing =
        (
            counts.processing +
            counts.pending
        ) /
        total *
        100;


    const cancelled =
        (
            counts.cancelled +
            counts.rejected
        ) /
        total *
        100;


    let cursor = 0;


    const deliveredEnd =
        cursor + delivered;

    cursor =
        deliveredEnd;


    const transitEnd =
        cursor + transit;

    cursor =
        transitEnd;


    const processingEnd =
        cursor + processing;


    donut.style.background =
        `conic-gradient(
            #0b9b52 0 ${deliveredEnd}%,
            #438bd0 ${deliveredEnd}% ${transitEnd}%,
            #e2a043 ${transitEnd}% ${processingEnd}%,
            #d75b5b ${processingEnd}% 100%
        )`;
}


/* =========================================================
ORDER RENDERING
========================================================= */

function renderRecentOrders(
    orders
) {

    const container =
        document.getElementById(
            "recentOrders"
        );


    if (!container) {
        return;
    }


    if (!orders.length) {

        container.innerHTML =
            emptyMarkup(
                "No orders yet. Start shopping from the marketplace."
            );

        return;
    }


    const recent =
        [...orders]
            .sort(
                (a, b) =>
                    dateValue(
                        b.created_at
                    ) -
                    dateValue(
                        a.created_at
                    )
            )
            .slice(0, 5);


    container.innerHTML =
        recent
            .map(
                order =>
                    orderRowMarkup(
                        order,
                        false
                    )
            )
            .join("");
}


function renderOrders(
    container,
    orders,
    options = {}
) {

    if (!container) {
        return;
    }


    const showCancel =
        options.showCancel !== false;


    if (!orders.length) {

        container.innerHTML =
            emptyMarkup(
                "No orders found. Your purchases will appear here."
            );

        return;
    }


    container.innerHTML =
        orders
            .sort(
                (a, b) =>
                    dateValue(
                        b.created_at
                    ) -
                    dateValue(
                        a.created_at
                    )
            )
            .map(
                order =>
                    orderRowMarkup(
                        order,
                        showCancel
                    )
            )
            .join("");
}


function orderRowMarkup(
    order,
    showCancel = false
) {

    const status =
        normalizeStatus(
            order.status
        );


    const productName =
        getOrderProductName(
            order
        );


    const total =
        formatCurrency(
            getOrderTotal(
                order
            )
        );


    const quantity =
        getOrderQuantity(
            order
        );


    const date =
        formatDate(
            order.created_at
        );


    const statusLabel =
        getCustomerStatusLabel(
            status
        );


    const statusClass =
        getCustomerStatusClass(
            status
        );


    const canCancel =
        showCancel &&
        status === "pending" &&
        order.id != null;


    return `
        <article class="customer-order-row">

            <div class="customer-order-main">

                <div class="customer-order-icon">
                    📦
                </div>

                <div class="customer-order-info">

                    <strong>
                        ${escapeHTML(productName)}
                    </strong>

                    <span>
                        Order #${escapeHTML(order.id)}
                    </span>

                </div>

            </div>


            <div class="customer-order-meta">

                <span>
                    ${formatQuantity(quantity)}
                    item${quantity === 1 ? "" : "s"}
                </span>

                <span>
                    ${escapeHTML(date)}
                </span>

            </div>


            <div class="customer-order-total">

                <strong>
                    ${escapeHTML(total)}
                </strong>

                <span
                    class="customer-status ${statusClass}"
                >
                    ${escapeHTML(statusLabel)}
                </span>

            </div>


            ${
                canCancel
                    ? `
                        <button
                            type="button"
                            class="customer-order-cancel"
                            onclick="cancelCustomerOrder(${Number(order.id)})"
                        >
                            Cancel
                        </button>
                    `
                    : ""
            }

        </article>
    `;
}


function getOrderProductName(
    order
) {

    if (
        order.product_name
    ) {

        return order.product_name;
    }


    if (
        order.product &&
        order.product.name
    ) {

        return order.product.name;
    }


    if (
        Array.isArray(order.items) &&
        order.items.length
    ) {

        const names =
            order.items
                .map(
                    item =>
                        item.product?.name ||
                        item.product_name ||
                        `Product #${item.product_id}`
                );


        return names.join(
            ", "
        );
    }


    return "Modern Farms Order";
}


function getOrderQuantity(
    order
) {

    if (
        order.quantity != null
    ) {

        return Number(
            order.quantity
        );
    }


    if (
        Array.isArray(order.items)
    ) {

        return order.items.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.quantity || 0
                ),
            0
        );
    }


    return 0;
}


/* =========================================================
CANCEL ORDER
========================================================= */

async function cancelCustomerOrder(
    orderId
) {

    if (!orderId) {
        return;
    }


    const confirmed =
        window.confirm(
            "Cancel this pending order?"
        );


    if (!confirmed) {
        return;
    }


    try {

        await window.ModernFarmsAPI
            .request(
                `/orders/${orderId}/status`,
                {
                    method: "PUT",

                    body: JSON.stringify({
                        status: "cancelled"
                    })
                }
            );


        showCustomerMessage(
            "Order cancelled successfully."
        );


        await loadCustomerDashboard();


        await loadCustomerOrders(
            false
        );

    }
    catch (error) {

        console.error(
            "Order cancellation failed:",
            error
        );


        showCustomerError(
            error.message ||
            "Unable to cancel the order."
        );
    }
}


/* =========================================================
PRODUCTS
========================================================= */

async function loadCustomerProducts(
    dashboardMode = false
) {

    const container =
        dashboardMode
            ? document.getElementById(
                "freshProducts"
            )
            : document.getElementById(
                "customerProducts"
            );


    if (container) {

        container.innerHTML =
            loadingMarkup(
                "Loading products..."
            );
    }


    try {

        const response =
            await window.ModernFarmsAPI
                .getProducts();


        const products =
            extractArray(
                response,
                [
                    "products",
                    "data"
                ]
            )
            .filter(
                product =>
                    normalizeStatus(
                        product.status
                    ) !== "sold_out"
            )
            .filter(
                product =>
                    Number(
                        product.quantity_remaining ?? 0
                    ) > 0
            );


        customerProducts =
            products;


        if (dashboardMode) {

            renderFreshProducts(
                products
            );

        }
        else if (container) {

            renderProducts(
                container,
                applyProductCategory(
                    products
                )
            );
        }


        return products;

    }
    catch (error) {

        console.error(
            "Products error:",
            error
        );


        if (container) {

            container.innerHTML =
                emptyMarkup(
                    "Unable to load products. Please refresh and try again."
                );
        }


        showCustomerError(
            error.message ||
            "Unable to load products."
        );


        return [];
    }
}


function renderFreshProducts(
    products
) {

    const container =
        document.getElementById(
            "freshProducts"
        );


    if (!container) {
        return;
    }


    const fresh =
        [...products]
            .sort(
                (a, b) =>
                    dateValue(
                        b.created_at
                    ) -
                    dateValue(
                        a.created_at
                    )
            )
            .slice(0, 6);


    renderProducts(
        container,
        fresh,
        true
    );
}


function renderProducts(container, products, compact = false) {

    if (!container) {
        return;
    }

    if (!products.length) {
        container.innerHTML = emptyMarkup(
            activeProductCategory === "all"
                ? "No products are available right now."
                : `No ${activeProductCategory} products are available right now.`
        );

        return;
    }

    container.innerHTML = products.map(product => {

        const id = Number(product.id);

        const name =
            product.name ||
            "Farm Product";

        const category =
            product.category ||
            "General";

        const price =
            Number(product.price || 0);

        const unit =
            product.unit ||
            "unit";

        const stock =
            Number(product.quantity_remaining ?? 0);

        const image =
            product.image;

        const description =
            product.description ||
            "Freshly available from Modern Farms.";

        // -------------------------------------------------
        // FARM INFORMATION
        // -------------------------------------------------

        const farm =
            product.farm || {};

        const farmName =
            farm.name ||
            product.farm_name ||
            "Modern Farms Producer";

        const farmLocation =
            farm.location ||
            product.farm_location ||
            "Kenya";

        const farmPhone =
            farm.phone ||
            "";

        const producerId =
            Number(farm.producer_id || 0);

        // -------------------------------------------------
        // IMAGE
        // -------------------------------------------------

        const imageMarkup = image

            ? `
                <img
                    src="${escapeAttribute(image)}"
                    alt="${escapeAttribute(name)}"
                    loading="lazy"
                >
              `

            : `
                <div
                    class="customer-product-placeholder"
                    aria-label="${escapeAttribute(name)}"
                >
                    🌱
                </div>
              `;

        // -------------------------------------------------
        // FARM DETAILS
        // -------------------------------------------------

        const farmMarkup = `
            <div class="customer-product-farm">

                <div class="customer-product-farm-icon">
                    🌾
                </div>

                <div class="customer-product-farm-info">

                    <strong>
                        ${escapeHTML(farmName)}
                    </strong>

                    <span>
                        📍 ${escapeHTML(farmLocation)}
                    </span>

                    ${
                        farmPhone
                            ? `
                                <span>
                                    ☎ ${escapeHTML(farmPhone)}
                                </span>
                              `
                            : ""
                    }

                </div>

            </div>
        `;

        // -------------------------------------------------
        // PRODUCT CARD
        // -------------------------------------------------

        return `
            <article
                class="customer-product-card"
                data-product-id="${id}"
                data-category="${escapeAttribute(category)}"
            >

                <div class="customer-product-image">

                    ${imageMarkup}

                    <span class="customer-product-category">
                        ${escapeHTML(category)}
                    </span>

                </div>


                <div class="customer-product-body">

                    <h3>
                        ${escapeHTML(name)}
                    </h3>


                    ${

                        compact

                            ? ""

                            : `
                                <p>
                                    ${escapeHTML(description)}
                                </p>
                              `

                    }


                    ${farmMarkup}


                    <div class="customer-product-bottom">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    formatCurrency(price)
                                )}
                            </strong>

                            <small>
                                / ${escapeHTML(unit)}
                            </small>

                        </div>


                        <span class="customer-stock">

                            ${
                                stock > 0
                                    ? `${formatQuantity(stock)} available`
                                    : "Sold out"
                            }

                        </span>

                    </div>


                    <button
                        type="button"
                        class="customer-add-cart"
                        onclick="addToCart(${id})"
                        ${stock <= 0 ? "disabled" : ""}
                    >

                        ${
                            stock > 0
                                ? "Add to Cart"
                                : "Sold Out"
                        }

                    </button>

                    ${
                        producerId > 0
                            ? `
                                <button
                                    type="button"
                                    class="mf-product-message"
                                    data-message-producer="${producerId}"
                                >
                                    Message this producer
                                </button>
                              `
                            : ""
                    }

                </div>

            </article>
        `;

    }).join("");
}


/* =========================================================
CATEGORIES
========================================================= */

async function shopCategory(
    category
) {

    activeProductCategory =
        String(
            category || "all"
        )
        .trim()
        .toLowerCase();


    openMarketplace();


    if (
        !customerProducts.length
    ) {

        await loadCustomerProducts(
            false
        );

        return;
    }


    const container =
        document.getElementById(
            "customerProducts"
        );


    if (container) {

        renderProducts(
            container,
            applyProductCategory(
                customerProducts
            )
        );
    }


    document
        .querySelectorAll(
            ".customer-category-filter button"
        )
        .forEach(
            button => {

                button.classList.remove(
                    "active"
                );


                const text =
                    button.textContent
                        .trim()
                        .toLowerCase();


                if (
                    activeProductCategory
                    === "all" &&
                    text === "all"
                ) {

                    button.classList.add(
                        "active"
                    );

                }
                else if (
                    text ===
                    activeProductCategory
                ) {

                    button.classList.add(
                        "active"
                    );
                }

            }
        );
}


function applyProductCategory(
    products
) {

    if (
        !activeProductCategory ||
        activeProductCategory === "all"
    ) {

        return products;
    }


    return products.filter(
        product =>
            String(
                product.category || ""
            )
            .toLowerCase()
            .trim()
            ===
            activeProductCategory
    );
}


function startProductOrder(
    productId
) {

    const product =
        customerProducts.find(
            item =>
                Number(item.id)
                === Number(productId)
        );


    if (!product) {

        showCustomerError(
            "Product details could not be found."
        );

        return;
    }


    addToCart(
        product
    );


    openCheckout();
}


/* =========================================================
CART
========================================================= */

function initializeCustomerCart() {

    try {

        const stored =
            localStorage.getItem(
                "modern_farms_cart"
            );


        customerCart =
            stored
                ? JSON.parse(stored)
                : [];


        if (
            !Array.isArray(
                customerCart
            )
        ) {

            customerCart = [];
        }

    }
    catch (error) {

        console.warn(
            "Unable to restore cart:",
            error
        );


        customerCart = [];
    }


    saveCustomerCart();
}


function saveCustomerCart() {

    localStorage.setItem(
        "modern_farms_cart",
        JSON.stringify(
            customerCart
        )
    );


    updateCartCount();
}


function addToCart(
    productOrId
) {

    const product =
        typeof productOrId === "object"
            ? productOrId
            : customerProducts.find(
                item =>
                    Number(item.id)
                    === Number(productOrId)
            );


    if (!product) {

        showCustomerError(
            "Product could not be added to the cart."
        );

        return;
    }


    const id =
        Number(
            product.id
        );


    const stock =
        Number(
            product.quantity_remaining ?? 0
        );


    if (
        !id ||
        stock <= 0
    ) {

        showCustomerError(
            "This product is currently unavailable."
        );

        return;
    }


    const existing =
        customerCart.find(
            item =>
                Number(item.id)
                === id
        );


    if (existing) {

        if (
            Number(existing.quantity)
            >= stock
        ) {

            showCustomerError(
                "You cannot add more than the available stock."
            );

            return;
        }


        existing.quantity++;
        existing.maxQuantity = stock;

    }
    else {

        customerCart.push({

            id,

            name:
                product.name ||
                "Farm Product",

            category:
                product.category ||
                "General",

            price:
                Number(
                    product.price || 0
                ),

            unit:
                product.unit ||
                "unit",

            image:
                product.image ||
                null,

            quantity: 1,

            maxQuantity: stock
        });
    }


    saveCustomerCart();


    showCustomerMessage(
        `${product.name || "Product"} added to your cart.`
    );
}


function removeFromCart(
    productId
) {

    customerCart =
        customerCart.filter(
            item =>
                Number(item.id)
                !== Number(productId)
        );


    saveCustomerCart();


    renderCart();
}


function updateCartQuantity(
    productId,
    quantity
) {

    const item =
        customerCart.find(
            entry =>
                Number(entry.id)
                === Number(productId)
        );


    if (!item) {
        return;
    }


    let next =
        Number(quantity);


    if (
        !Number.isFinite(next)
    ) {

        next = 1;
    }


    next =
        Math.max(
            1,
            Math.floor(next)
        );


    if (
        item.maxQuantity
    ) {

        next =
            Math.min(
                next,
                Number(
                    item.maxQuantity
                )
            );
    }


    item.quantity =
        next;


    saveCustomerCart();


    renderCart();
}


function increaseCartQuantity(
    productId
) {

    const item =
        customerCart.find(
            entry =>
                Number(entry.id)
                === Number(productId)
        );


    if (!item) {
        return;
    }


    updateCartQuantity(
        productId,
        Number(item.quantity) + 1
    );
}


function decreaseCartQuantity(
    productId
) {

    const item =
        customerCart.find(
            entry =>
                Number(entry.id)
                === Number(productId)
        );


    if (!item) {
        return;
    }


    const next =
        Number(item.quantity) - 1;


    if (
        next <= 0
    ) {

        removeFromCart(
            productId
        );

        return;
    }


    updateCartQuantity(
        productId,
        next
    );
}


function getCartSubtotal() {

    return customerCart.reduce(
        (
            total,
            item
        ) =>
            total +
            Number(
                item.price || 0
            ) *
            Number(
                item.quantity || 0
            ),
        0
    );
}


function getCartItemCount() {

    return customerCart.reduce(
        (
            total,
            item
        ) =>
            total +
            Number(
                item.quantity || 0
            ),
        0
    );
}


function updateCartCount() {

    const count =
        getCartItemCount();


    document
        .querySelectorAll(
            ".cart-count, #cartCount, #topCartCount"
        )
        .forEach(
            element => {

                element.textContent =
                    count;

                element.hidden =
                    count === 0;
            }
        );
}


/* =========================================================
CART UI
========================================================= */

function renderCart() {

    let drawer =
        document.getElementById(
            "customerCartDrawer"
        );


    if (!drawer) {

        drawer =
            document.createElement(
                "aside"
            );

        drawer.id =
            "customerCartDrawer";

        drawer.className =
            "customer-cart-drawer";

        document.body.appendChild(
            drawer
        );
    }


    const subtotal =
        getCartSubtotal();


    drawer.innerHTML = `

        <div
            class="customer-cart-backdrop"
            onclick="closeCart()"
        ></div>


        <div
            class="customer-cart-panel"
            role="dialog"
            aria-modal="true"
        >

            <div
                class="customer-cart-header"
            >

                <div>

                    <span
                        class="customer-eyebrow"
                    >
                        MODERN FARMS
                    </span>

                    <h2>
                        Your Cart
                    </h2>

                </div>


                <button
                    type="button"
                    class="customer-cart-close"
                    onclick="closeCart()"
                >
                    ×
                </button>

            </div>


            <div
                class="customer-cart-items"
            >

                ${
                    customerCart.length
                        ? customerCart
                            .map(
                                cartItemMarkup
                            )
                            .join("")
                        : emptyMarkup(
                            "Your cart is empty. Add fresh products to get started."
                        )
                }

            </div>


            ${
                customerCart.length
                    ? `
                        <div
                            class="customer-cart-summary"
                        >

                            <span>
                                Subtotal
                            </span>

                            <strong>
                                ${escapeHTML(
                                    formatCurrency(
                                        subtotal
                                    )
                                )}
                            </strong>

                        </div>


                        <button
                            type="button"
                            class="customer-checkout-button"
                            onclick="openCheckout()"
                        >
                            Proceed to Checkout
                        </button>
                    `
                    : `
                        <button
                            type="button"
                            class="customer-checkout-button"
                            onclick="closeCart(); openMarketplace()"
                        >
                            Shop Products
                        </button>
                    `
            }

        </div>
    `;


    requestAnimationFrame(
        () =>
            drawer.classList.add(
                "open"
            )
    );
}


function cartItemMarkup(
    item
) {

    const subtotal =
        Number(item.price || 0)
        *
        Number(item.quantity || 0);


    return `

        <div
            class="customer-cart-item"
        >

            <div
                class="customer-cart-item-image"
            >

                ${
                    item.image
                        ? `
                            <img
                                src="${escapeAttribute(item.image)}"
                                alt="${escapeAttribute(item.name)}"
                            >
                        `
                        : "🌱"
                }

            </div>


            <div
                class="customer-cart-item-info"
            >

                <strong>
                    ${escapeHTML(item.name)}
                </strong>

                <span>
                    ${escapeHTML(
                        formatCurrency(
                            item.price
                        )
                    )}
                    /
                    ${escapeHTML(item.unit)}
                </span>


                <div
                    class="customer-cart-quantity"
                >

                    <button
                        type="button"
                        onclick="decreaseCartQuantity(${Number(item.id)})"
                    >
                        −
                    </button>

                    <span>
                        ${Number(item.quantity)}
                    </span>

                    <button
                        type="button"
                        onclick="increaseCartQuantity(${Number(item.id)})"
                    >
                        +
                    </button>

                </div>

            </div>


            <div
                class="customer-cart-item-total"
            >

                <strong>
                    ${escapeHTML(
                        formatCurrency(
                            subtotal
                        )
                    )}
                </strong>

                <button
                    type="button"
                    onclick="removeFromCart(${Number(item.id)})"
                >
                    Remove
                </button>

            </div>

        </div>
    `;
}


function closeCart() {

    const drawer =
        document.getElementById(
            "customerCartDrawer"
        );


    if (!drawer) {
        return;
    }


    drawer.classList.remove(
        "open"
    );


    setTimeout(
        () => drawer.remove(),
        220
    );
}


/* =========================================================
CHECKOUT
========================================================= */

function openCheckout() {

    if (
        !customerCart.length
    ) {

        showCustomerError(
            "Your cart is empty."
        );

        return;
    }


    closeCart();


    let modal =
        document.getElementById(
            "customerCheckoutModal"
        );


    if (!modal) {

        modal =
            document.createElement(
                "div"
            );

        modal.id =
            "customerCheckoutModal";

        modal.className =
            "customer-checkout-modal";

        document.body.appendChild(
            modal
        );
    }


    const user =
        window.ModernFarmsAPI
            .getCurrentUser() || {};


    const subtotal =
        getCartSubtotal();


    modal.innerHTML = `

        <div
            class="customer-checkout-backdrop"
            onclick="closeCheckout()"
        ></div>


        <div
            class="customer-checkout-panel"
            role="dialog"
            aria-modal="true"
        >

            <div
                class="customer-checkout-header"
            >

                <div>

                    <span
                        class="customer-eyebrow"
                    >
                        CHECKOUT
                    </span>

                    <h2>
                        Complete Your Order
                    </h2>

                    <p>
                        Fresh products from Modern Farms.
                    </p>

                </div>


                <button
                    type="button"
                    onclick="closeCheckout()"
                >
                    ×
                </button>

            </div>


            <form
                id="customerCheckoutForm"
                onsubmit="event.preventDefault(); submitCheckout();"
            >

                <div
                    class="customer-checkout-summary"
                >

                    <span>
                        ${getCartItemCount()}
                        item${getCartItemCount() === 1 ? "" : "s"}
                    </span>

                    <strong>
                        ${escapeHTML(
                            formatCurrency(
                                subtotal
                            )
                        )}
                    </strong>

                </div>


                <label>

                    Delivery Address

                    <textarea
                        id="checkoutAddress"
                        rows="3"
                        placeholder="Enter your delivery address"
                        required
                    ></textarea>

                </label>


                <label>

                    Phone Number

                    <input
                        id="checkoutPhone"
                        type="tel"
                        value="${escapeAttribute(
                            user.phone || ""
                        )}"
                        placeholder="e.g. 0712345678"
                        required
                    >

                </label>


                <label>

                    Payment Method

                    <select
                        id="checkoutPayment"
                        required
                    >

                        <option value="cash_on_delivery">
                            Cash on Delivery
                        </option>

                        <option value="mpesa">
                            M-Pesa
                        </option>

                        <option value="card">
                            Card
                        </option>

                    </select>

                </label>


                <div
                    id="checkoutError"
                    class="customer-alert customer-alert-error"
                    hidden
                ></div>


                <button
                    type="submit"
                    id="customerCheckoutSubmit"
                    class="customer-checkout-submit"
                >
                    Place Order ·
                    ${escapeHTML(
                        formatCurrency(
                            subtotal
                        )
                    )}
                </button>

            </form>

        </div>
    `;


    requestAnimationFrame(
        () =>
            modal.classList.add(
                "open"
            )
    );
}


function closeCheckout() {

    const modal =
        document.getElementById(
            "customerCheckoutModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );


    setTimeout(
        () => modal.remove(),
        220
    );
}


async function submitCheckout() {

    if (
        checkoutSubmitting
    ) {

        return;
    }


    if (
        !customerCart.length
    ) {

        showCustomerError(
            "Your cart is empty."
        );

        return;
    }


    const address =
        document
            .getElementById(
                "checkoutAddress"
            )
            ?.value
            .trim();


    const phone =
        document
            .getElementById(
                "checkoutPhone"
            )
            ?.value
            .trim();


    const payment =
        document
            .getElementById(
                "checkoutPayment"
            )
            ?.value;


    const errorBox =
        document.getElementById(
            "checkoutError"
        );


    const submitButton =
        document.getElementById(
            "customerCheckoutSubmit"
        );


    if (!address) {

        showCheckoutError(
            "Please enter your delivery address."
        );

        return;
    }


    if (!phone) {

        showCheckoutError(
            "Please enter your phone number."
        );

        return;
    }


    checkoutSubmitting =
        true;


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.textContent =
            "Placing order...";
    }


    try {

        const payload = {

            items:
                customerCart.map(
                    item => ({
                        product_id:
                            Number(item.id),

                        quantity:
                            Number(item.quantity)
                    })
                ),

            delivery_address:
                address,

            phone:
                phone,

            payment_method:
                payment
        };


        const response =
            await window.ModernFarmsAPI
                .request(
                    "/orders/",
                    {
                        method: "POST",

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


        console.log(
            "Order created:",
            response
        );


        customerCart =
            [];


        saveCustomerCart();


        closeCheckout();


        showCustomerMessage(
            response.message ||
            "Order placed successfully."
        );


        showCustomerSection(
            "orders"
        );


        await loadCustomerDashboard();


        await loadCustomerOrders(
            false
        );

    }
    catch (error) {

        console.error(
            "Checkout failed:",
            error
        );


        if (errorBox) {

            errorBox.textContent =
                error.message ||
                "Unable to place your order.";

            errorBox.hidden =
                false;
        }


        showCustomerError(
            error.message ||
            "Unable to place your order."
        );

    }
    finally {

        checkoutSubmitting =
            false;


        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.textContent =
                `Place Order · ${formatCurrency(
                    getCartSubtotal()
                )}`;
        }
    }
}


function showCheckoutError(
    message
) {

    const errorBox =
        document.getElementById(
            "checkoutError"
        );


    if (errorBox) {

        errorBox.textContent =
            message;

        errorBox.hidden =
            false;
    }


    showCustomerError(
        message
    );
}


/* =========================================================
ALERTS
========================================================= */

function hideCustomerAlerts() {

    document
        .querySelectorAll(
            "#customerError, #customerSuccess"
        )
        .forEach(
            element =>
                element.hidden = true
        );
}


function showCustomerError(
    message
) {

    const element =
        document.getElementById(
            "customerError"
        );


    if (!element) {

        console.error(
            message
        );

        return;
    }


    element.textContent =
        message;


    element.hidden =
        false;


    clearTimeout(
        element._hideTimer
    );


    element._hideTimer =
        setTimeout(
            () =>
                element.hidden = true,
            5000
        );
}


function showCustomerMessage(
    message
) {

    const element =
        document.getElementById(
            "customerSuccess"
        );


    if (!element) {

        console.info(
            message
        );

        return;
    }


    element.textContent =
        message;


    element.hidden =
        false;


    clearTimeout(
        element._hideTimer
    );


    element._hideTimer =
        setTimeout(
            () =>
                element.hidden = true,
            4000
        );
}


/* =========================================================
HELPERS
========================================================= */

function extractArray(
    response,
    keys = []
) {

    if (
        Array.isArray(response)
    ) {

        return response;
    }


    if (!response) {

        return [];
    }


    for (
        const key of keys
    ) {

        if (
            Array.isArray(
                response[key]
            )
        ) {

            return response[key];
        }
    }


    if (
        Array.isArray(
            response.data
        )
    ) {

        return response.data;
    }


    return [];
}


function normalizeStatus(
    status
) {

    return String(
        status || "unknown"
    )
    .toLowerCase()
    .trim()
    .replace(
        /\s+/g,
        "_"
    );
}


function getCustomerStatusLabel(
    status
) {

    const labels = {

        pending:
            "Processing",

        processing:
            "Processing",

        confirmed:
            "In Transit",

        accepted:
            "In Transit",

        ready:
            "Ready",

        shipped:
            "Shipped",

        delivered:
            "Delivered",

        completed:
            "Completed",

        cancelled:
            "Cancelled",

        rejected:
            "Rejected",

        unknown:
            "Pending"
    };


    return (
        labels[status] ||
        formatStatus(
            status
        )
    );
}


function getCustomerStatusClass(
    status
) {

    if (
        [
            "cancelled",
            "rejected"
        ].includes(
            status
        )
    ) {

        return "is-danger";
    }


    if (
        [
            "delivered",
            "completed"
        ].includes(
            status
        )
    ) {

        return "is-success";
    }


    if (
        [
            "confirmed",
            "accepted",
            "ready",
            "shipped"
        ].includes(
            status
        )
    ) {

        return "is-info";
    }


    return "is-warning";
}


function formatStatus(
    status
) {

    return String(
        status || "Unknown"
    )
    .replace(
        /_/g,
        " "
    )
    .replace(
        /\b\w/g,
        letter =>
            letter.toUpperCase()
    );
}


function getOrderTotal(
    order
) {

    return Number(
        order?.total_amount ??
        order?.total_price ??
        order?.total ??
        order?.amount ??
        order?.grand_total ??
        0
    );
}


function formatCurrency(
    value
) {

    if (
        window.ModernFarmsAPI &&
        typeof window.ModernFarmsAPI
            .formatCurrency
        === "function"
    ) {

        return window.ModernFarmsAPI
            .formatCurrency(
                value
            );
    }


    return new Intl.NumberFormat(
        "en-KE",
        {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 2
        }
    ).format(
        Number(
            value || 0
        )
    );
}


function formatQuantity(
    value
) {

    const number =
        Number(
            value || 0
        );


    if (
        Number.isInteger(
            number
        )
    ) {

        return String(
            number
        );
    }


    return number
        .toFixed(2)
        .replace(
            /0+$/,
            ""
        )
        .replace(
            /\.$/,
            ""
        );
}


function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );
    }


    return date.toLocaleDateString(
        "en-KE",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


function dateValue(
    value
) {

    const date =
        new Date(
            value || 0
        ).getTime();


    return Number.isFinite(
        date
    )
        ? date
        : 0;
}


function escapeHTML(
    value
) {

    if (
        window.ModernFarmsAPI &&
        typeof window.ModernFarmsAPI
            .escapeHTML
        === "function"
    ) {

        return window.ModernFarmsAPI
            .escapeHTML(
                value
            );
    }


    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );
}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    )
    .replace(
        /`/g,
        "&#096;"
    );
}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;
    }
}


function loadingMarkup(
    message
) {

    return `
        <div
            class="customer-loading-state"
        >

            <span
                class="customer-loading-spinner"
            ></span>

            <span>
                ${escapeHTML(message)}
            </span>

        </div>
    `;
}


function emptyMarkup(
    message
) {

    return `
        <div
            class="customer-empty-state"
        >

            <div
                class="customer-empty-icon"
            >
                🌱
            </div>

            <strong>
                ${escapeHTML(message)}
            </strong>

        </div>
    `;
}


/* =========================================================
GLOBAL FUNCTIONS
========================================================= */

window.showCustomerSection =
    showCustomerSection;

window.customerLogout =
    customerLogout;

window.loadCustomerDashboard =
    loadCustomerDashboard;

window.loadCustomerOrders =
    loadCustomerOrders;

window.loadCustomerProducts =
    loadCustomerProducts;

window.loadOrderHistory =
    loadOrderHistory;

window.shopCategory =
    shopCategory;

window.openMarketplace =
    openMarketplace;

window.showCustomerMessage =
    showCustomerMessage;

window.showCustomerError =
    showCustomerError;

window.startProductOrder =
    startProductOrder;

window.addToCart =
    addToCart;

window.removeFromCart =
    removeFromCart;

window.updateCartQuantity =
    updateCartQuantity;

window.increaseCartQuantity =
    increaseCartQuantity;

window.decreaseCartQuantity =
    decreaseCartQuantity;

window.renderCart =
    renderCart;

window.closeCart =
    closeCart;

window.openCheckout =
    openCheckout;

window.closeCheckout =
    closeCheckout;

window.submitCheckout =
    submitCheckout;

window.cancelCustomerOrder =
    cancelCustomerOrder;


console.log(
    "Modern Farms customer dashboard loaded successfully."
);

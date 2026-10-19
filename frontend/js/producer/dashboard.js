/*
=========================================================
MODERN FARMS
PRODUCER DASHBOARD
=========================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    initProducerDashboard
);


async function initProducerDashboard() {

    try {

        /*
        =================================================
        AUTH CHECK
        =================================================
        */

        if (
            !window.Auth ||
            !window.Auth.isAuthenticated
        ) {

            console.error(
                "Authentication service is unavailable."
            );

            showDashboardError(
                "Authentication service could not be loaded. Please refresh the page."
            );

            return;

        }


        if (
            !window.Auth.isAuthenticated()
        ) {

            window.location.href =
                "/frontend/pages/login.html";

            return;

        }


        /*
        =================================================
        CURRENT USER
        =================================================
        */

        const user =
            await window.Auth.currentUser();


        if (!user) {

            window.location.href =
                "/frontend/pages/login.html";

            return;

        }


        /*
        =================================================
        ROLE PROTECTION
        =================================================
        */

        if (
            String(user.role).toLowerCase() !==
            "producer"
        ) {

            alert(
                "This dashboard is only available to producers."
            );

            window.location.href =
                "/frontend/pages/customer-dashboard.html";

            return;

        }


        /*
        =================================================
        UPDATE USER INFORMATION
        =================================================
        */

        updateProducerIdentity(user);


        /*
        =================================================
        LOAD DATA
        =================================================
        */

        await Promise.allSettled([

            loadProducts(),

            loadOrders()

        ]);

    }

    catch (error) {

        console.error(
            "Producer dashboard initialization failed:",
            error
        );

        showDashboardError(
            error.message ||
            "Unable to load your dashboard."
        );

    }

}


/*
=========================================================
IDENTITY
=========================================================
*/

function updateProducerIdentity(user) {

    const name =
        user.full_name ||
        user.name ||
        "Producer";


    const welcome =
        document.querySelector(
            "[data-producer-name]"
        );


    if (welcome) {

        welcome.textContent =
            name;

    }


    const email =
        document.querySelector(
            "[data-producer-email]"
        );


    if (email) {

        email.textContent =
            user.email || "";

    }


    const role =
        document.querySelector(
            "[data-user-role]"
        );


    if (role) {

        role.textContent =
            "Producer Account";

    }

}


/*
=========================================================
PRODUCTS
=========================================================
*/

async function loadProducts() {

    const container =
        document.querySelector(
            "#productsContainer"
        );


    try {

        const response =
            await API.request(
                "/products/my-products"
            );


        const products =
            response.products || [];


        updateCounter(
            [
                "#productsCount",
                "#productCount"
            ],
            products.length
        );


        if (!container) {

            return;

        }


        if (!products.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        🌱
                    </div>

                    <h3>
                        No products yet
                    </h3>

                    <p>
                        Add your first farm product
                        to start selling.
                    </p>

                </div>

            `;

            return;

        }


        container.innerHTML =
            products.map(
                renderProduct
            ).join("");

    }

    catch (error) {

        console.error(
            "Products loading error:",
            error
        );


        if (container) {

            container.innerHTML = `

                <div class="error-state">

                    Unable to load products.

                    <button
                        type="button"
                        onclick="loadProducts()"
                    >
                        Retry
                    </button>

                </div>

            `;

        }

    }

}


/*
=========================================================
PRODUCT CARD
=========================================================
*/

function renderProduct(product) {

    const image =
        product.image ||
        "/frontend/assets/vegetables.jpg";


    const name =
        product.name ||
        "Unnamed product";


    const price =
        product.price != null
            ? Number(product.price).toLocaleString()
            : "0";


    const unit =
        product.unit ||
        "kg";


    const quantity =
        product.quantity_remaining ??
        product.quantity_posted ??
        0;


    return `

        <article class="dashboard-product-card">

            <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(name)}"
            >

            <div>

                <h3>
                    ${escapeHTML(name)}
                </h3>

                <p>
                    KSh ${price} / ${escapeHTML(unit)}
                </p>

                <small>
                    Stock: ${quantity}
                </small>

            </div>

        </article>

    `;

}


/*
=========================================================
ORDERS
=========================================================
*/

async function loadOrders() {

    const container =
        document.querySelector(
            "#ordersContainer"
        );


    try {

        const response =
            await API.request(
                "/orders/producer-orders"
            );


        const orders =
            response.orders || [];


        updateCounter(
            [
                "#ordersCount",
                "#orderCount"
            ],
            orders.length
        );


        const pending =
            orders.filter(
                order =>
                    String(
                        order.status || ""
                    ).toLowerCase() ===
                    "pending"
            ).length;


        updateCounter(
            [
                "#pendingOrdersCount",
                "#pendingCount"
            ],
            pending
        );


        if (!container) {

            return;

        }


        if (!orders.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        📦
                    </div>

                    <h3>
                        No orders yet
                    </h3>

                    <p>
                        Customer orders will appear here.
                    </p>

                </div>

            `;

            return;

        }


        container.innerHTML =
            orders
                .slice(0, 10)
                .map(
                    renderOrder
                )
                .join("");

    }

    catch (error) {

        console.error(
            "Orders loading error:",
            error
        );


        if (container) {

            container.innerHTML = `

                <div class="error-state">

                    Unable to load orders.

                    <button
                        type="button"
                        onclick="loadOrders()"
                    >
                        Retry
                    </button>

                </div>

            `;

        }

    }

}


/*
=========================================================
ORDER CARD
=========================================================
*/

function renderOrder(order) {

    const status =
        order.status ||
        "pending";


    return `

        <article class="dashboard-order-card">

            <div>

                <strong>
                    Order #${order.id ?? "—"}
                </strong>

                <p>
                    Quantity:
                    ${order.quantity ?? 0}
                </p>

            </div>

            <span class="status-badge ${escapeHTML(status)}">

                ${escapeHTML(status)}

            </span>

        </article>

    `;

}


/*
=========================================================
COUNTERS
=========================================================
*/

function updateCounter(
    selectors,
    value
) {

    selectors.forEach(
        selector => {

            const element =
                document.querySelector(
                    selector
                );


            if (element) {

                element.textContent =
                    value;

            }

        }
    );

}


/*
=========================================================
ERROR
=========================================================
*/

function showDashboardError(message) {

    let element =
        document.querySelector(
            "#dashboardError"
        );


    if (!element) {

        element =
            document.createElement(
                "div"
            );

        element.id =
            "dashboardError";

        element.className =
            "dashboard-error";

        document.body.prepend(
            element
        );

    }


    element.textContent =
        message;

}


/*
=========================================================
HTML ESCAPING
=========================================================
*/

function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/*
=========================================================
GLOBAL FUNCTIONS
=========================================================
*/

window.loadProducts =
    loadProducts;

window.loadOrders =
    loadOrders;

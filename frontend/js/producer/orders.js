"use strict";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadCustomerOrders();

    }
);


/* ==========================================================================
   LOAD ORDERS
========================================================================== */

async function loadCustomerOrders() {

    const container =
        document.getElementById(
            "customerOrders"
        );

    if (!container) {
        return;
    }


    try {

        const response =
            await ModernFarmsAPI
                .getCustomerOrders();


        renderCustomerOrders(
            response.orders || []
        );

    } catch (error) {

        console.error(
            "Unable to load orders:",
            error
        );


        container.innerHTML = `

            <div class="customer-empty-state">

                <div class="empty-icon">
                    📦
                </div>

                <h3>
                    Unable to load orders
                </h3>

                <p>
                    Please try again later.
                </p>

            </div>

        `;
    }
}


/* ==========================================================================
   RENDER ORDERS
========================================================================== */

function renderCustomerOrders(orders) {

    const container =
        document.getElementById(
            "customerOrders"
        );

    if (!container) {
        return;
    }


    if (!orders.length) {

        container.innerHTML = `

            <div class="customer-empty-state">

                <div class="empty-icon">
                    🛒
                </div>

                <h3>
                    No orders yet
                </h3>

                <p>
                    Your completed purchases will
                    appear here.
                </p>

                <a
                    href="#marketplace"
                    class="customer-button"
                >
                    Start Shopping
                </a>

            </div>

        `;

        return;
    }


    container.innerHTML =
        orders
            .map(
                order => `

                    <article
                        class="customer-order-card"
                    >

                        <div class="order-top">

                            <div>

                                <span class="order-number">
                                    Order #${order.id}
                                </span>

                                <small>
                                    ${formatOrderDate(
                                        order.created_at
                                    )}
                                </small>

                            </div>


                            <span
                                class="
                                    order-status
                                    ${String(
                                        order.status || ""
                                    ).toLowerCase()}
                                "
                            >
                                ${ModernFarmsAPI.escapeHTML(
                                    order.status ||
                                    "Pending"
                                )}
                            </span>

                        </div>


                        <div class="order-details">

                            <span>
                                Total
                            </span>

                            <strong>
                                ${ModernFarmsAPI.formatCurrency(
                                    order.total_amount ||
                                    order.total ||
                                    0
                                )}
                            </strong>

                        </div>

                    </article>

                `
            )
            .join("");
}


function formatOrderDate(date) {

    if (!date) {
        return "Date unavailable";
    }


    const parsed =
        new Date(date);


    if (Number.isNaN(parsed.getTime())) {
        return "Date unavailable";
    }


    return parsed.toLocaleDateString(
        "en-KE",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


window.CustomerOrders = {

    reload: loadCustomerOrders

};
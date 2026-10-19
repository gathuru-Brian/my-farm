"use strict";

let customerProducts = [];


document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeProducts();

    }
);


/* ==========================================================================
   INITIALIZE
========================================================================== */

async function initializeProducts() {

    setupProductSearch();

    setupCategoryFilter();

    await loadCustomerProducts();
}


/* ==========================================================================
   LOAD PRODUCTS
========================================================================== */

async function loadCustomerProducts() {

    const grid =
        document.getElementById(
            "productGrid"
        );

    if (!grid) {
        return;
    }


    showProductLoading();


    try {

        const response =
            await ModernFarmsAPI.getProducts();


        customerProducts =
            response.products || [];


        updateProductCount();

        populateCategories();

        renderProducts(
            customerProducts
        );

    } catch (error) {

        console.error(
            "Product loading failed:",
            error
        );


        grid.innerHTML = `

            <div class="customer-empty-state">

                <div class="empty-icon">
                    🌱
                </div>

                <h3>
                    Marketplace unavailable
                </h3>

                <p>
                    We could not load farm products.
                    Please try again.
                </p>

                <button
                    class="customer-button"
                    onclick="loadCustomerProducts()"
                >
                    Try Again
                </button>

            </div>

        `;
    }
}


/* ==========================================================================
   LOADING
========================================================================== */

function showProductLoading() {

    const grid =
        document.getElementById(
            "productGrid"
        );

    if (!grid) {
        return;
    }


    grid.innerHTML = `

        <div class="customer-loading">

            <div class="customer-spinner"></div>

            <p>
                Loading fresh products...
            </p>

        </div>

    `;
}


/* ==========================================================================
   RENDER
========================================================================== */

function renderProducts(products) {

    const grid =
        document.getElementById(
            "productGrid"
        );

    if (!grid) {
        return;
    }


    if (!products.length) {

        grid.innerHTML = `

            <div class="customer-empty-state">

                <div class="empty-icon">
                    🔎
                </div>

                <h3>
                    No products found
                </h3>

                <p>
                    Try another search or category.
                </p>

            </div>

        `;

        return;
    }


    grid.innerHTML =
        products
            .map(createProductCard)
            .join("");
}


/* ==========================================================================
   CARD
========================================================================== */

function createProductCard(product) {

    const image =
        getProductImage(product);


    const stock =
        Number(
            product.quantity_remaining || 0
        );


    const soldOut =
        stock <= 0 ||
        product.status !== "available";


    return `

        <article
            class="customer-product-card"
        >

            <div class="customer-product-image">

                <img
                    src="${ModernFarmsAPI.escapeHTML(image)}"
                    alt="${ModernFarmsAPI.escapeHTML(product.name)}"
                    loading="lazy"
                    onerror="
                        this.onerror=null;
                        this.src='/frontend/assets/vegetables.jpg';
                    "
                >

                <span class="product-category-badge">
                    ${ModernFarmsAPI.escapeHTML(
                        product.category || "Farm Produce"
                    )}
                </span>

            </div>


            <div class="customer-product-content">

                <span class="product-category">
                    ${ModernFarmsAPI.escapeHTML(
                        product.category || "Produce"
                    )}
                </span>


                <h3>
                    ${ModernFarmsAPI.escapeHTML(
                        product.name
                    )}
                </h3>


                <p>
                    ${ModernFarmsAPI.escapeHTML(
                        product.description ||
                        "Fresh agricultural produce."
                    )}
                </p>


                <div class="product-stock">

                    <span>
                        ${stock}
                        ${ModernFarmsAPI.escapeHTML(
                            product.unit || "unit"
                        )}
                        available
                    </span>

                </div>


                <div class="customer-product-footer">

                    <div class="customer-product-price">

                        <strong>
                            ${ModernFarmsAPI.formatCurrency(
                                product.price
                            )}
                        </strong>

                        <span>
                            / ${ModernFarmsAPI.escapeHTML(
                                product.unit || "unit"
                            )}
                        </span>

                    </div>


                    <button
                        type="button"
                        class="add-to-cart-button"
                        onclick="
                            CustomerCart.add(
                                ${product.id}
                            )
                        "
                        ${soldOut ? "disabled" : ""}
                    >

                        ${
                            soldOut
                                ? "Sold Out"
                                : "Add to Cart"
                        }

                    </button>

                </div>

            </div>

        </article>

    `;
}


/* ==========================================================================
   IMAGE HANDLING
========================================================================== */

function getProductImage(product) {

    if (product.image) {

        if (
            product.image.startsWith("/") ||
            product.image.startsWith("http")
        ) {

            return product.image;
        }


        return `/frontend/assets/${product.image}`;
    }


    const category =
        String(
            product.category || ""
        ).toLowerCase();


    if (category.includes("maize")) {
        return "/frontend/assets/maize.jpg";
    }


    if (
        category.includes("vegetable") ||
        category.includes("tomato")
    ) {

        return "/frontend/assets/vegetables.jpg";
    }


    if (category.includes("poultry")) {
        return "/frontend/assets/poultry.jpg";
    }


    return "/frontend/assets/our_farm.jpg";
}


/* ==========================================================================
   SEARCH
========================================================================== */

function setupProductSearch() {

    const input =
        document.getElementById(
            "productSearch"
        );

    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        filterProducts
    );
}


/* ==========================================================================
   CATEGORY
========================================================================== */

function setupCategoryFilter() {

    const filter =
        document.getElementById(
            "categoryFilter"
        );

    if (!filter) {
        return;
    }


    filter.addEventListener(
        "change",
        filterProducts
    );
}


function populateCategories() {

    const filter =
        document.getElementById(
            "categoryFilter"
        );

    if (!filter) {
        return;
    }


    const categories =
        [
            ...new Set(
                customerProducts
                    .map(
                        product =>
                            product.category
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    filter.innerHTML = `

        <option value="">
            All categories
        </option>

        ${
            categories
                .map(
                    category => `
                        <option value="${ModernFarmsAPI.escapeHTML(category)}">
                            ${ModernFarmsAPI.escapeHTML(category)}
                        </option>
                    `
                )
                .join("")
        }

    `;
}


/* ==========================================================================
   FILTER
========================================================================== */

function filterProducts() {

    const search =
        String(
            document.getElementById(
                "productSearch"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const category =
        String(
            document.getElementById(
                "categoryFilter"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const filtered =
        customerProducts.filter(
            product => {

                const text =
                    `
                    ${product.name}
                    ${product.category}
                    ${product.description}
                    `
                    .toLowerCase();


                return (
                    (!search ||
                        text.includes(search))
                    &&
                    (!category ||
                        String(
                            product.category || ""
                        ).toLowerCase() === category)
                );
            }
        );


    renderProducts(filtered);
}


/* ==========================================================================
   COUNT
========================================================================== */

function updateProductCount() {

    const element =
        document.getElementById(
            "productCount"
        );

    if (element) {

        element.textContent =
            customerProducts.length;
    }
}


/* ==========================================================================
   PUBLIC
========================================================================== */

window.CustomerProducts = {

    reload: loadCustomerProducts,

    getAll: () =>
        customerProducts
};
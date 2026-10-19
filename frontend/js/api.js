/*
 * Modern Farms
 * Central API Client (Refactored & Fixed)
 */

(function () {
    "use strict";

    const API_BASE = "/api";
    const PRIMARY_TOKEN_KEY = "modern_farms_token";
    const LEGACY_KEYS = ["access_token", "token"];
    const DEFAULT_TIMEOUT = 15000; // 15 seconds

    function getAuthToken() {
        const keys = [PRIMARY_TOKEN_KEY, ...LEGACY_KEYS];

        for (const storage of [localStorage, sessionStorage]) {
            for (const key of keys) {
                const value = storage.getItem(key);
                if (value && value !== "null" && value !== "undefined") {
                    return value;
                }
            }
        }
        return null;
    }

    function setAuthToken(token, remember = true) {
        if (!token) {
            console.warn("Attempted to store empty authentication token.");
            return;
        }

        clearAuthToken();
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem(PRIMARY_TOKEN_KEY, token);
    }

    function clearAuthToken() {
        [PRIMARY_TOKEN_KEY, ...LEGACY_KEYS].forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
    }

    function getCurrentUser() {
        const raw =
            localStorage.getItem("modern_farms_user") ||
            sessionStorage.getItem("modern_farms_user");

        if (!raw) return null;

        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function setCurrentUser(user, remember = true) {
        clearCurrentUser();
        if (!user) return;

        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("modern_farms_user", JSON.stringify(user));
    }

    function clearCurrentUser() {
        localStorage.removeItem("modern_farms_user");
        sessionStorage.removeItem("modern_farms_user");
    }

    function isAuthenticated() {
        return Boolean(getAuthToken());
    }

    async function request(endpoint, options = {}) {
        const token = getAuthToken();
        const headers = {
            Accept: "application/json",
            ...(options.headers || {})
        };

        // Automatically handle JSON vs FormData payloads
        if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        // Add timeout support using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get("content-type") || "";
            let data;

            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                const text = await response.text();
                data = {
                    message: text || `Request failed with status ${response.status}`
                };
            }

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn("Authentication failed or expired. Clearing session.");
                    clearAuthToken();
                    clearCurrentUser();
                }

                const error = new Error(
                    data.message ||
                    data.msg ||
                    data.error ||
                    `Request failed with status ${response.status}`
                );
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (err) {
            clearTimeout(timeoutId);
            if (err.name === "AbortError") {
                throw new Error("API request timed out. Please check your network connection.");
            }
            throw err;
        }
    }

    async function login(email, password, remember = true) {
        clearAuthToken();
        clearCurrentUser();

        const data = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify({
                email: email ? email.trim() : "",
                password
            })
        });

        const token = data.access_token || data.token || data.accessToken;
        const user = data.user || data.account || data.data?.user || null;

        if (!token) {
            throw new Error("Login succeeded but no access token was returned.");
        }

        setAuthToken(token, remember);
        if (user) setCurrentUser(user, remember);

        return { ...data, access_token: token, user };
    }

    async function register(payload) {
        return request("/auth/register", {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async function me() {
        return request("/auth/me", { method: "GET" });
    }

    async function logout() {
        try {
            if (getAuthToken()) {
                await request("/auth/logout", { method: "POST" });
            }
        } catch (error) {
            console.warn("Logout request failed on server:", error);
        } finally {
            clearAuthToken();
            clearCurrentUser();
        }
        return true;
    }

    async function getProducts() {
        return request("/products/", { method: "GET" });
    }

    async function getMyProducts() {
        return request("/products/my-products", { method: "GET" });
    }

    async function createProduct(product) {
        const body = product instanceof FormData ? product : JSON.stringify(product);
        return request("/products/", {
            method: "POST",
            body
        });
    }

    async function updateProduct(productId, product) {
        const body = product instanceof FormData ? product : JSON.stringify(product);
        return request(`/products/${productId}`, {
            method: "PUT",
            body
        });
    }

    async function deleteProduct(productId) {
        return request(`/products/${productId}`, { method: "DELETE" });
    }

    async function getInventory() {
        return request("/products/inventory", { method: "GET" });
    }

    async function getOrders() {
        return request("/orders/", { method: "GET" });
    }

    async function getMyOrders() {
        return request("/orders/my-orders", { method: "GET" });
    }

    async function getProducerOrders() {
        return request("/orders/producer-orders", { method: "GET" });
    }

    async function getFarm(farmId) {
        return request(`/farms/${farmId}`, { method: "GET" });
    }

    async function getFarms() {
        return request("/farms/", { method: "GET" });
    }

    async function createFarm(farm) {
        const body = farm instanceof FormData ? farm : JSON.stringify(farm);
        return request("/farms/", {
            method: "POST",
            body
        });
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: "KES",
            minimumFractionDigits: 2
        }).format(Number(value || 0));
    }

    function escapeHTML(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    window.ModernFarmsAPI = {
        API_BASE,
        request,
        login,
        register,
        me,
        logout,
        getAuthToken,
        setAuthToken,
        clearAuthToken,
        getCurrentUser,
        setCurrentUser,
        clearCurrentUser,
        isAuthenticated,
        getProducts,
        getMyProducts,
        createProduct,
        updateProduct,
        deleteProduct,
        getInventory,
        getOrders,
        getMyOrders,
        getProducerOrders,
        getFarms,
        getFarm,
        createFarm,
        formatCurrency,
        escapeHTML
    };

    console.log("Modern Farms API loaded successfully.");
})();
/* Modern Farms - Authentication Guard */

(function () {

    const TOKEN_KEY = "modern_farms_token";
    const USER_KEY = "modern_farms_user";

    function getUser() {

        try {

            return JSON.parse(
                localStorage.getItem(USER_KEY) || "null"
            );

        } catch {

            return null;
        }
    }

    function logout() {

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        window.location.href =
            "/frontend/pages/login.html";
    }

    window.ModernFarmsAuth = {

        getToken: function () {
            return localStorage.getItem(TOKEN_KEY);
        },

        getUser: getUser,

        logout: logout

    };

    const token =
        localStorage.getItem(TOKEN_KEY);

    const user = getUser();

    /*
     * No authenticated session.
     */
    if (!token || !user) {

        window.location.href =
            "/frontend/pages/login.html";

        return;
    }

    /*
     * Producer dashboard is restricted to producers.
     */
    const role =
        String(user.role || "").toLowerCase();

    if (role && role !== "producer") {

        if (role === "customer") {

            window.location.href =
                "/frontend/pages/customer-dashboard.html";

        } else if (role === "admin") {

            window.location.href =
                "/frontend/pages/admin-dashboard.html";

        } else {

            logout();
        }
    }

})();

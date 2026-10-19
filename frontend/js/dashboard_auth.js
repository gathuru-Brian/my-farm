/*
=========================================================
MODERN FARMS - DASHBOARD AUTHORIZATION
=========================================================
*/

"use strict";

const DashboardAuth = {

    async protect(requiredRole) {

        const API = window.ModernFarmsAPI;

        const LOGIN_PAGE =
            "/frontend/pages/login.html";

        if (!API) {

            console.error(
                "ModernFarmsAPI is not loaded."
            );

            window.location.replace(
                LOGIN_PAGE
            );

            return null;
        }


        if (!API.isAuthenticated()) {

            console.warn(
                "No authentication token."
            );

            window.location.replace(
                LOGIN_PAGE
            );

            return null;
        }


        try {

            const response =
                await API.getCurrentUser();


            if (
                !response ||
                !response.user
            ) {

                throw new Error(
                    "Unable to identify authenticated user."
                );
            }


            const user =
                response.user;


            const role =
                String(user.role || "")
                    .toLowerCase()
                    .trim();


            console.log(
                "Dashboard authorization:",
                {
                    requiredRole,
                    actualRole: role,
                    user
                }
            );


            /*
            =================================================
            WRONG DASHBOARD
            =================================================
            */

            if (role !== requiredRole) {

                if (role === "customer") {

                    window.location.replace(
                        "/frontend/pages/customer-dashboard.html"
                    );

                    return null;
                }


                if (role === "producer") {

                    window.location.replace(
                        "/frontend/pages/producer-dashboard.html"
                    );

                    return null;
                }


                throw new Error(
                    "Unsupported account role."
                );
            }


            /*
            =================================================
            AUTHORIZED
            =================================================
            */

            window.ModernFarmsCurrentUser =
                user;

            localStorage.setItem(
                "modernFarmsUser",
                JSON.stringify(user)
            );


            return user;


        } catch (error) {

            console.error(
                "Dashboard authorization failed:",
                error
            );


            API.removeToken();

            localStorage.removeItem(
                "modernFarmsUser"
            );


            window.location.replace(
                LOGIN_PAGE
            );


            return null;
        }
    },


    logout() {

        const API =
            window.ModernFarmsAPI;

        if (API) {
            API.logout();
        }

        localStorage.removeItem(
            "modernFarmsUser"
        );

        window.location.replace(
            "/frontend/pages/login.html"
        );
    }
};


window.ModernFarmsDashboardAuth =
    DashboardAuth;
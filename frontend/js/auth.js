/*
=========================================================
MODERN FARMS AUTHENTICATION
=========================================================
*/

(function () {
    "use strict";


    /* =====================================================
       SESSION HELPERS
    ===================================================== */

    function getToken() {

        return (
            localStorage.getItem("access_token") ||
            sessionStorage.getItem("access_token") ||
            ""
        );
    }


    function getStoredUser() {

        try {

            const stored =
                localStorage.getItem("user") ||
                sessionStorage.getItem("user");

            return stored
                ? JSON.parse(stored)
                : null;

        } catch (error) {

            console.error(
                "Unable to parse stored user:",
                error
            );

            return null;
        }
    }


    function saveSession(
        token,
        user,
        remember = true
    ) {

        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");


        const storage =
            remember
                ? localStorage
                : sessionStorage;


        if (token) {

            storage.setItem(
                "access_token",
                token
            );
        }


        if (user) {

            storage.setItem(
                "user",
                JSON.stringify(user)
            );
        }
    }


    function clearSession() {

        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
    }


    /* =====================================================
       EXISTING SESSION
    ===================================================== */

    async function checkExistingSession() {

        const token = getToken();


        if (!token) {

            return false;
        }


        try {

            if (
                !window.ModernFarmsAPI ||
                typeof window.ModernFarmsAPI.me !==
                "function"
            ) {

                console.warn(
                    "API client unavailable while checking session."
                );

                return false;
            }


            const response =
                await window.ModernFarmsAPI.me();


            const user =
                response?.user ||
                response?.data ||
                response;


            if (!user || !user.role) {

                clearSession();

                return false;
            }


            const remember =
                localStorage.getItem(
                    "access_token"
                ) !== null;


            saveSession(
                token,
                user,
                remember
            );


            redirectUserByRole(
                user,
                false
            );


            return true;

        } catch (error) {

            console.warn(
                "Existing session is no longer valid.",
                error
            );


            clearSession();

            return false;
        }
    }


    /* =====================================================
       INITIALIZATION
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            verifyDependencies();

            initializeLogin();

            initializeRegister();

            setupPasswordToggle();
        }
    );


    function verifyDependencies() {

        if (
            typeof window.ModernFarmsAPI ===
            "undefined"
        ) {

            console.error(
                "ModernFarmsAPI is missing. " +
                "Make sure api.js is loaded before auth.js."
            );
        }
    }


    /* =====================================================
       LOGIN INITIALIZATION
    ===================================================== */

    function initializeLogin() {

        const loginForm =
            document.getElementById(
                "loginForm"
            );


        if (!loginForm) {

            return;
        }


        if (
            loginForm.dataset.authInitialized ===
            "true"
        ) {

            return;
        }


        loginForm.dataset.authInitialized =
            "true";


        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    /* =====================================================
       REGISTER INITIALIZATION
    ===================================================== */

    function initializeRegister() {

        const registerForm =
            document.getElementById(
                "registerForm"
            );


        if (!registerForm) {

            return;
        }


        if (
            registerForm.dataset.authInitialized ===
            "true"
        ) {

            return;
        }


        registerForm.dataset.authInitialized =
            "true";


        registerForm.addEventListener(
            "submit",
            handleRegister
        );
    }


    /* =====================================================
       LOGIN
    ===================================================== */

    async function handleLogin(event) {

        event.preventDefault();


        const emailInput =
            document.getElementById(
                "loginEmail"
            );


        const passwordInput =
            document.getElementById(
                "loginPassword"
            );


        const rememberInput =
            document.getElementById(
                "loginRemember"
            ) ||
            document.getElementById(
                "remember"
            );


        const email =
            emailInput
                ? emailInput.value.trim()
                : "";


        const password =
            passwordInput
                ? passwordInput.value
                : "";


        const remember =
            rememberInput
                ? rememberInput.checked
                : true;


        clearErrors();


        if (!email) {

            showFieldError(
                "loginEmailError",
                "Please enter your email address."
            );

            return;
        }


        if (!password) {

            showFieldError(
                "loginPasswordError",
                "Please enter your password."
            );

            return;
        }


        setLoading(true);


        try {

            if (
                !window.ModernFarmsAPI ||
                typeof window.ModernFarmsAPI.login !==
                "function"
            ) {

                throw new Error(
                    "Authentication API is unavailable."
                );
            }


            const response =
                await window.ModernFarmsAPI.login(
                    email,
                    password,
                    remember
                );


            let user =
                response?.user;


            const token =
                response?.access_token ||
                response?.token;


            if (
                !user &&
                typeof window.ModernFarmsAPI.me ===
                "function"
            ) {

                const meResponse =
                    await window.ModernFarmsAPI.me();


                user =
                    meResponse?.user ||
                    meResponse?.data ||
                    meResponse;
            }


            if (!user) {

                throw new Error(
                    "Unable to identify account details."
                );
            }


            saveSession(
                token || getToken(),
                user,
                remember
            );


            if (
                typeof window.ModernFarmsAPI
                    .setCurrentUser ===
                "function"
            ) {

                window.ModernFarmsAPI.setCurrentUser(
                    user,
                    remember
                );
            }


            showMessage(
                "Login successful. Opening your dashboard...",
                "success"
            );


            redirectUserByRole(
                user,
                true
            );

        } catch (error) {

            console.error(
                "Login error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to sign in.",
                "error"
            );

            setTimeout(() => {
                showMessage(null);
            }, 3000);

        } finally {

            setLoading(false);
        }
    }


    /* =====================================================
       REGISTER
    ===================================================== */

    async function handleRegister(event) {

        event.preventDefault();


        const nameInput =
            document.getElementById(
                "registerName"
            );


        const emailInput =
            document.getElementById(
                "registerEmail"
            );


        const passwordInput =
            document.getElementById(
                "registerPassword"
            );


        const roleInput =
            document.getElementById(
                "registerRole"
            );


        const name =
            nameInput
                ? nameInput.value.trim()
                : "";


        const email =
            emailInput
                ? emailInput.value.trim()
                : "";


        const password =
            passwordInput
                ? passwordInput.value
                : "";


        const role =
            roleInput
                ? roleInput.value
                : "customer";


        clearErrors();


        if (!name) {

            showFieldError(
                "registerNameError",
                "Please enter your full name."
            );

            return;
        }


        if (
            !email ||
            !email.includes("@")
        ) {

            showFieldError(
                "registerEmailError",
                "Please enter a valid email."
            );

            return;
        }


        if (
            !password ||
            password.length < 6
        ) {

            showFieldError(
                "registerPasswordError",
                "Password must be at least 10 characters."
            );

            return;
        }


        setLoading(
            true,
            "register"
        );


        try {

            const response =
                await window.ModernFarmsAPI.register({
                    name,
                    full_name: name,
                    email,
                    password,
                    role
                });


            let user =
                response?.user;


            let token =
                response?.access_token ||
                response?.token;


            if (token || user) {

                saveSession(
                    token,
                    user,
                    true
                );
            }


            if (!token) {

                const loginResponse =
                    await window.ModernFarmsAPI.login(
                        email,
                        password,
                        true
                    );


                token =
                    loginResponse?.access_token ||
                    loginResponse?.token;


                user =
                    loginResponse?.user ||
                    user;


                saveSession(
                    token,
                    user,
                    true
                );
            }


            showMessage(
                "Account created successfully.",
                "success"
            );


            setTimeout(
                () => {

                    redirectUserByRole(
                        user || { role },
                        true
                    );

                },
                400
            );

        } catch (error) {

            console.error(
                "Registration error:",
                error
            );


            showMessage(
                error.message ||
                "Unable to complete registration.",
                "error"
            );

        } finally {

            setLoading(
                false,
                "register"
            );
        }
    }


    /* =====================================================
       ROLE ROUTER
    ===================================================== */

    function redirectUserByRole(
        user,
        showNotification = true
    ) {

        const rawRole =
            String(
                user?.role || ""
            )
                .toLowerCase()
                .trim();


        const isProducer =
            [
                "producer",
                "farmer",
                "seller",
                "vendor"
            ].includes(rawRole);


        const isCustomer =
            [
                "customer",
                "buyer",
                "client"
            ].includes(rawRole);


        if (isProducer) {

            if (showNotification) {

                showMessage(
                    "Opening producer dashboard...",
                    "success"
                );
            }


            setTimeout(
                () => {

                    window.location.replace(
                        "/frontend/pages/producer-dashboard.html"
                    );

                },
                showNotification ? 300 : 0
            );


            return true;
        }


        if (isCustomer) {

            if (showNotification) {

                showMessage(
                    "Opening customer dashboard...",
                    "success"
                );
            }


            setTimeout(
                () => {

                    window.location.replace(
                        "/frontend/pages/customer-dashboard.html"
                    );

                },
                showNotification ? 300 : 0
            );


            return true;
        }


        console.error(
            "Unknown account role:",
            user?.role
        );


        showMessage(
            `Unknown account role: ${
                user?.role || "Not specified"
            }`,
            "error"
        );


        return false;
    }


    /* =====================================================
       UI HELPERS
    ===================================================== */

    function showMessage(
        message,
        type = "error"
    ) {

        const element =
            document.getElementById(
                "loginMessage"
            ) ||
            document.getElementById(
                "authMessage"
            );


        if (!element) {

            return;
        }


        element.hidden = false;

        element.textContent =
            message;

        element.className =
            `auth-message ${type}`;
    }


    function showFieldError(
        id,
        message
    ) {

        const element =
            document.getElementById(id);


        if (!element) {

            return;
        }


        element.textContent =
            message;
    }


    function clearErrors() {

        [
            "loginEmailError",
            "loginPasswordError",
            "registerNameError",
            "registerEmailError",
            "registerPasswordError"
        ].forEach(
            id => {

                const element =
                    document.getElementById(id);


                if (element) {

                    element.textContent =
                        "";
                }
            }
        );


        const message =
            document.getElementById(
                "loginMessage"
            ) ||
            document.getElementById(
                "authMessage"
            );


        if (message) {

            message.hidden = true;

            message.textContent =
                "";
        }
    }


    function setLoading(
        loading,
        type = "login"
    ) {

        const prefix =
            type === "register"
                ? "register"
                : "login";


        const button =
            document.getElementById(
                `${prefix}Button`
            );


        const buttonText =
            document.getElementById(
                `${prefix}ButtonText`
            );


        const loader =
            document.getElementById(
                `${prefix}Loader`
            );


        if (button) {

            button.disabled =
                loading;
        }


        if (buttonText) {

            buttonText.hidden =
                loading;
        }


        if (loader) {

            loader.hidden =
                !loading;
        }
    }


    /* =====================================================
       PASSWORD TOGGLE
    ===================================================== */

    function setupPasswordToggle() {

        const toggles =
            document.querySelectorAll(
                ".password-toggle"
            );


        toggles.forEach(
            toggle => {

                toggle.addEventListener(
                    "click",
                    () => {

                        const targetId =
                            toggle.dataset.target;


                        const input =
                            document.getElementById(
                                targetId
                            );


                        if (!input) {

                            return;
                        }


                        const isPassword =
                            input.type ===
                            "password";


                        input.type =
                            isPassword
                                ? "text"
                                : "password";


                        toggle.textContent =
                            isPassword
                                ? "Hide"
                                : "Show";


                        toggle.setAttribute(
                            "aria-label",
                            isPassword
                                ? "Hide password"
                                : "Show password"
                        );
                    }
                );
            }
        );
    }


    /* =====================================================
       GLOBAL AUTH API
    ===================================================== */

    window.ModernFarmsAuth = {

        handleLogin,

        handleRegister,

        redirectUserByRole,

        checkExistingSession,

        getToken,

        getStoredUser,

        saveSession,

        clearSession

    };


    console.log(
        "%c Modern Farms AUTH LOADED ",
        "background:#0b5d3b;color:white;font-size:14px;padding:4px;font-weight:bold;"
    );

})();

/* =========================================================
   MODERN FARMS - ADMIN: ADD PRODUCER
   frontend/js/admin-add-producer.js
   ========================================================= */

(function () {
    "use strict";

    const TOKEN_KEYS = ["modern_farms_token", "access_token", "token"];

    const form = document.getElementById("addProducerForm");
    const resultBox = document.getElementById("createdBox");

    if (!form) {
        return;
    }

    function getToken() {
        for (const key of TOKEN_KEYS) {
            const value = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (value) return value;
        }
        return null;
    }

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function generatePassword() {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        const values = new Uint32Array(12);
        crypto.getRandomValues(values);

        return Array.from(values, n => chars[n % chars.length]).join("") + "!";
    }

    function notify(message, isError) {
        if (window.AdminDashboard) {
            window.AdminDashboard.toast(message, isError);
        } else {
            alert(message);
        }
    }

    function showResult(payload, data) {
        const loginUrl = `${window.location.origin}/frontend/pages/login.html`;

        let farmLine = "";

        if (payload.farm_name) {
            farmLine = data.farm_created
                ? `<p>Farm "<strong>${esc(payload.farm_name)}</strong>" was created.</p>`
                : `<p class="warn">The account was created, but the farm could not be: ${esc(data.farm_error || "unknown error")}</p>`;
        }

        resultBox.innerHTML = `
            <h3>Producer account created</h3>
            <p>Share these details with the producer:</p>
            <dl>
                <dt>Email</dt><dd>${esc(payload.email)}</dd>
                <dt>Password</dt><dd>${esc(payload.password)}</dd>
                <dt>Sign in at</dt><dd>${esc(loginUrl)}</dd>
            </dl>
            ${farmLine}
            <p class="hint">This password is shown only now. It is not stored in readable form.</p>
        `;

        resultBox.hidden = false;
    }

    document.getElementById("genPassword").addEventListener("click", () => {
        form.elements.password.value = generatePassword();
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const submit = form.querySelector("button[type='submit']");
        const payload = Object.fromEntries(new FormData(form).entries());

        submit.disabled = true;
        submit.textContent = "Creating...";
        resultBox.hidden = true;

        try {
            const response = await fetch("/api/admin/producers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(payload)
            });

            let data = null;

            try {
                data = await response.json();
            } catch (e) {
                data = null;
            }

            if (!response.ok || data?.success === false) {
                throw new Error(data?.message || `Request failed (${response.status})`);
            }

            showResult(payload, data);
            form.reset();

            notify("Producer account created.");

            if (window.AdminDashboard) {
                window.AdminDashboard.reload();
            }

        } catch (error) {
            console.error(error);
            notify(error.message, true);

        } finally {
            submit.disabled = false;
            submit.textContent = "Create producer account";
        }
    });

})();
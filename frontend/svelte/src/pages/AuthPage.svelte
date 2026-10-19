<script>
  import { onMount } from "svelte";
  import { request, saveSession, getUser, getAuthToken, destinationForRole } from "../lib/api.js";

  export let mode = "login";

  let name = "";
  let email = "";
  let password = "";
  let role = "customer";
  let remember = true;
  let busy = false;
  let message = "";
  let messageIsError = true;

  $: registering = mode === "register";

  function showMessage(text, isError = true) {
    message = text;
    messageIsError = isError;
  }

  function finishSignIn(response, rememberSession) {
    const user = response.user || response.account || response.data?.user;
    const token = response.access_token || response.token || response.accessToken;
    const destination = destinationForRole(user?.role);
    if (!token) throw new Error("Login succeeded but no access token was returned.");
    if (!user || !destination) throw new Error("Unable to identify a supported account role.");
    saveSession(token, user, rememberSession);
    window.location.replace(destination);
  }

  async function submit(event) {
    event.preventDefault();
    showMessage("");
    if (!email.trim() || !email.includes("@")) {
      showMessage("Please enter a valid email address.");
      return;
    }
    if (!password || (registering && password.length < 6)) {
      showMessage(registering ? "Password must be at least 6 characters." : "Please enter your password.");
      return;
    }
    if (registering && !name.trim()) {
      showMessage("Please enter your full name.");
      return;
    }

    busy = true;
    try {
      if (registering) {
        const registration = await request("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            full_name: name.trim(),
            email: email.trim(),
            password,
            role
          })
        });
        const token = registration.access_token || registration.token;
        let user = registration.user || registration.account || registration.data?.user;
        if (!token || !user) {
          const login = await request("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email: email.trim(), password })
          });
          user = login.user || login.account || login.data?.user || user;
          finishSignIn({ ...login, user }, true);
        } else {
          finishSignIn({ ...registration, user }, true);
        }
      } else {
        const response = await request("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim(), password })
        });
        const token = response.access_token || response.token || response.accessToken;
        if (!token) throw new Error("Login succeeded but no access token was returned.");
        saveSession(token, response.user || response.account || response.data?.user, remember);
        let user = response.user || response.account || response.data?.user;
        if (!user) {
          const me = await request("/auth/me");
          user = me.user || me.data?.user || me.data || me;
        }
        if (!user) throw new Error("Unable to identify account details.");
        const destination = destinationForRole(user.role);
        if (!destination) throw new Error("This account role is not supported by the marketplace.");
        saveSession(token, user, remember);
        window.location.replace(destination);
      }
    } catch (error) {
      showMessage(error.message || "We couldn't complete that request.");
    } finally {
      busy = false;
    }
  }

  onMount(async () => {
    const user = getUser();
    if (user?.role && getAuthToken()) {
      const destination = destinationForRole(user.role);
      if (destination) {
        window.location.replace(destination);
        return;
      }
    }
    if (!registering && getAuthToken()) {
      try {
        const response = await request("/auth/me");
        const current = response.user || response.data?.user || response.data || response;
        if (current?.role) {
          const destination = destinationForRole(current.role);
          if (destination) {
            const remember = Boolean(localStorage.getItem("modern_farms_token"));
            saveSession(getAuthToken(), current, remember);
            window.location.replace(destination);
          }
        }
      } catch (error) {
        console.info("Saved session is no longer active.", error);
      }
    }
  });
</script>

<svelte:head>
  <title>{registering ? "Create account" : "Log in"} | Modern Farms</title>
</svelte:head>

<main class="grid min-h-screen bg-white lg:grid-cols-2">
  <section class="relative hidden overflow-hidden bg-[#103522] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
    <img class="absolute inset-0 h-full w-full object-cover opacity-25" src="/frontend/assets/{registering ? 'our_farm.jpg' : 'farm-worker.jpg'}" alt="" />
    <div class="absolute inset-0 bg-gradient-to-br from-[#103522]/95 via-[#103522]/75 to-[#103522]/50"></div>
    <a class="relative z-10 text-xl font-bold" href="/">🌱 Modern Farms</a>
    <div class="relative z-10 max-w-xl pb-8">
      <p class="text-sm font-bold uppercase tracking-[.16em] text-[#c1e39b]">{registering ? "Join the marketplace" : "Welcome back"}</p>
      <h1 class="mt-5 text-5xl font-bold leading-tight">{registering ? "Grow your agricultural journey." : "Good food brings us together."}</h1>
      <p class="mt-5 text-lg leading-8 text-green-50/85">Connect with local farmers and discover the best of what Kenya grows.</p>
    </div>
    <p class="relative z-10 text-sm text-green-100/70">© 2026 Modern Farms · Farm fresh. Direct to you.</p>
  </section>

  <section class="flex items-center justify-center px-5 py-12">
    <div class="w-full max-w-md">
      <a href="/" class="font-bold text-[#173f2a] lg:hidden">🌱 Modern Farms</a>
      <div class="mt-8 lg:mt-0">
        <p class="text-sm font-bold uppercase tracking-[.14em] text-[#438150]">{registering ? "Create your account" : "Your farm-fresh marketplace"}</p>
        <h2 class="mt-3 text-3xl font-bold tracking-tight">{registering ? "Join Modern Farms" : "Welcome back"}</h2>
        <p class="mt-2 text-slate-600">{registering ? "Choose how you want to use the marketplace." : "Sign in to continue to your account."}</p>
      </div>

      {#if message}
        <p role="alert" class={messageIsError ? "mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" : "mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"}>{message}</p>
      {/if}

      <form class="mt-7 space-y-4" onsubmit={submit}>
        {#if registering}
          <label class="block text-sm font-semibold">Full name
            <input class="field mt-2" name="name" autocomplete="name" bind:value={name} required />
          </label>
        {/if}
        <label class="block text-sm font-semibold">Email address
          <input class="field mt-2" type="email" name="email" autocomplete="email" bind:value={email} required />
        </label>
        <label class="block text-sm font-semibold">Password
          <input class="field mt-2" type="password" name="password" autocomplete={registering ? "new-password" : "current-password"} bind:value={password} required minlength={registering ? 6 : undefined} />
        </label>
        {#if registering}
          <label class="block text-sm font-semibold">I want to
            <select class="field mt-2" bind:value={role}>
              <option value="customer">Shop for farm products</option>
              <option value="producer">Sell my farm products</option>
            </select>
          </label>
        {:else}
          <label class="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" bind:checked={remember} class="h-4 w-4 accent-[#1f6338]" /> Keep me signed in
          </label>
        {/if}
        <button class="button-primary w-full" type="submit" disabled={busy}>{busy ? "Please wait…" : registering ? "Create account" : "Log in"}</button>
      </form>
      <p class="mt-6 text-center text-sm text-slate-600">
        {registering ? "Already have an account?" : "New to Modern Farms?"}
        <a class="font-bold text-[#24633a] hover:underline" href={registering ? "/frontend/pages/login.html" : "/frontend/pages/register.html"}>{registering ? " Log in" : " Create an account"}</a>
      </p>
    </div>
  </section>
</main>

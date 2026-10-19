<script>
  import LandingPage from "./pages/LandingPage.svelte";
  import AuthPage from "./pages/AuthPage.svelte";

  const path = window.location.pathname.toLowerCase();
  const isDashboard = path.includes("dashboard") ||
    path.includes("/customer/") ||
    path.includes("/producer/") ||
    path.includes("admin") ||
    path.includes("api-test");
  const page = path.includes("login")
    ? "login"
    : path.includes("register")
      ? "register"
      : "home";

  if (isDashboard) {
    window.location.replace(`http://127.0.0.1:5000${window.location.pathname}`);
  }
</script>

{#if page === "login" || page === "register"}
  <AuthPage mode={page} />
{:else}
  <LandingPage />
{/if}

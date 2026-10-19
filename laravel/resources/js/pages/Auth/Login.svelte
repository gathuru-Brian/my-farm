<script>
  import { Link, router } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { errors = {}, flash = {} } = $props();
  let form = $state({ email: "", password: "", remember: true });
  let processing = $state(false);

  function submit(event) {
    event.preventDefault();
    processing = true;
    router.post("/login", form, {
      onFinish: () => processing = false
    });
  }
</script>

<PortalLayout title="Sign in">
  <section class="mx-auto max-w-xl px-5 py-16">
    <div class="rounded-3xl border border-[#e3ebe5] bg-white p-7 shadow-sm sm:p-10">
      <p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Welcome back</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">Sign in to Modern Farms</h1>
      <p class="mt-2 text-slate-600">Access your marketplace account and continue where you left off.</p>

      {#if flash.status}
        <p class="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{flash.status}</p>
      {/if}
      <p class="mt-3 text-sm text-slate-600">
        If you used the previous version of Modern Farms, reset your password to sign in here.
      </p>

      <form class="mt-8 space-y-5" onsubmit={submit}>
        <div>
          <label for="email" class="mb-2 block text-sm font-semibold">Email address</label>
          <input id="email" bind:value={form.email} type="email" autocomplete="email" required
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.email}<p class="mt-2 text-sm text-red-700">{errors.email}</p>{/if}
        </div>

        <div>
          <label for="password" class="mb-2 block text-sm font-semibold">Password</label>
          <input id="password" bind:value={form.password} type="password" autocomplete="current-password" required
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.password}<p class="mt-2 text-sm text-red-700">{errors.password}</p>{/if}
        </div>

        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" bind:checked={form.remember} class="size-4 accent-[#176b3b]" />
          Keep me signed in
        </label>

        <p class="-mt-2 text-right text-sm">
          <Link href="/forgot-password" class="font-bold text-[#176b3b] hover:underline">Forgot password?</Link>
        </p>

        <button type="submit" disabled={processing}
          class="w-full rounded-xl bg-[#176b3b] px-5 py-3.5 font-bold text-white hover:bg-[#0b482b] disabled:opacity-60">
          {processing ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Don't have an account? <Link href="/register" class="font-bold text-[#176b3b] hover:underline">Create one</Link>
      </p>
    </div>
  </section>
</PortalLayout>

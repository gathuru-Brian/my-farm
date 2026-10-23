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
  <section class="auth-shell flex min-h-[calc(100vh-8.5rem)] items-center justify-center px-5 py-12 sm:py-16">
    <div class="auth-card w-full max-w-xl rounded-[1.75rem] border p-7 sm:p-10">
      <p class="inline-flex items-center gap-2 rounded-full bg-[#edf5e7] px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#438150]"><span aria-hidden="true">✦</span> Welcome back</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">Sign in to Modern Farms</h1>
      <p class="mt-2 leading-6 text-slate-600">Access your marketplace account and continue where you left off.</p>

      {#if flash.status}
        <p class="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800" role="status">{flash.status}</p>
      {/if}
      <p class="mt-5 rounded-xl border border-[#e6eadb] bg-[#f8f8ef] px-4 py-3 text-sm leading-6 text-slate-600">
        Returning from an earlier version? <Link href="/forgot-password" class="font-bold text-[#176b3b] underline decoration-[#b9d1ad] underline-offset-2 hover:text-[#0b482b]">Reset your password</Link> to sign in here.
      </p>

      <form class="mt-7 space-y-5" onsubmit={submit}>
        <div>
          <label for="email" class="mb-2 block text-sm font-semibold text-[#263c2e]">Email address</label>
          <input id="email" bind:value={form.email} type="email" autocomplete="email" required
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          {#if errors.email}<p class="mt-2 text-sm text-red-700" role="alert">{errors.email}</p>{/if}
        </div>

        <div>
          <label for="password" class="mb-2 block text-sm font-semibold text-[#263c2e]">Password</label>
          <input id="password" bind:value={form.password} type="password" autocomplete="current-password" required
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          {#if errors.password}<p class="mt-2 text-sm text-red-700" role="alert">{errors.password}</p>{/if}
        </div>

        <label class="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" bind:checked={form.remember} class="size-4 accent-[#176b3b]" />
          Keep me signed in
        </label>

        <p class="-mt-2 text-right text-sm">
          <Link href="/forgot-password" class="font-bold text-[#176b3b] hover:underline">Forgot password?</Link>
        </p>

        <button type="submit" disabled={processing}
          class="w-full rounded-xl bg-[#1b5d3a] px-5 py-3.5 font-bold text-white shadow-sm shadow-[#1b5d3a]/15 hover:-translate-y-0.5 hover:bg-[#12472d] disabled:cursor-wait disabled:opacity-60">
          {processing ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p class="mt-7 border-t border-[#edf0e9] pt-6 text-center text-sm text-slate-600">
        Don't have an account? <Link href="/register" class="font-bold text-[#176b3b] hover:underline">Create one</Link>
      </p>
    </div>
  </section>
</PortalLayout>

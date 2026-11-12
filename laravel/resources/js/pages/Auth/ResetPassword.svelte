<script>
  import { Link, useForm } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { email = "", token = "", flash = {} } = $props();
  let form = useForm({
    email: "",
    token: "",
    password: "",
    password_confirmation: ""
  });

  $effect(() => {
    form.email = email;
    form.token = token;
  });

  function submit(event) {
    event.preventDefault();
    form.post("/reset-password");
  }
</script>

<PortalLayout title="Choose a new password">
  <section class="auth-shell flex min-h-[calc(100vh-8.5rem)] items-center justify-center px-5 py-12 sm:py-16">
    <div class="auth-card w-full max-w-xl rounded-[1.75rem] border p-7 sm:p-10">
      <p class="inline-flex items-center gap-2 rounded-full bg-[#edf5e7] px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#438150]"><span aria-hidden="true">✦</span> Account recovery</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">Choose a new password</h1>
      <p class="mt-2 leading-6 text-slate-600">Set a new password to access your account.</p>

      {#if flash.status}
        <p class="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-800" role="status">{flash.status}</p>
      {/if}

      <form class="mt-7 space-y-5" onsubmit={submit}>
        <div>
          <label for="email" class="mb-2 block text-sm font-semibold text-[#263c2e]">Email address</label>
          <input id="email" bind:value={form.email} type="email" autocomplete="email" required
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          {#if form.errors.email}<p class="mt-2 text-sm text-red-700" role="alert">{form.errors.email}</p>{/if}
        </div>

        <div>
          <label for="password" class="mb-2 block text-sm font-semibold text-[#263c2e]">New password</label>
          <input id="password" bind:value={form.password} type="password" autocomplete="new-password" required minlength="8"
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          {#if form.errors.password}<p class="mt-2 text-sm text-red-700" role="alert">{form.errors.password}</p>{/if}
        </div>

        <div>
          <label for="password_confirmation" class="mb-2 block text-sm font-semibold text-[#263c2e]">Confirm new password</label>
          <input id="password_confirmation" bind:value={form.password_confirmation} type="password" autocomplete="new-password" required minlength="8"
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
        </div>

        <button type="submit" disabled={form.processing}
          class="w-full rounded-xl bg-[#1b5d3a] px-5 py-3.5 font-bold text-white shadow-sm shadow-[#1b5d3a]/15 hover:-translate-y-0.5 hover:bg-[#12472d] disabled:cursor-wait disabled:opacity-60">
          {form.processing ? "Updating…" : "Reset password"}
        </button>
      </form>

      <p class="mt-7 border-t border-[#edf0e9] pt-6 text-center text-sm text-slate-600">
        <Link href="/login" class="font-bold text-[#176b3b] hover:underline">Back to sign in</Link>
      </p>
    </div>
  </section>
</PortalLayout>

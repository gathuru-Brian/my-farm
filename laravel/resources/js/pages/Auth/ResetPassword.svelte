<script>
  import { Link, router } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { email = "", token = "", errors = {}, flash = {} } = $props();
  let form = $state({
    email: "",
    token: "",
    password: "",
    password_confirmation: ""
  });
  let processing = $state(false);

  $effect(() => {
    form.email = email;
    form.token = token;
  });

  function submit(event) {
    event.preventDefault();
    processing = true;
    router.post("/reset-password", form, {
      onFinish: () => processing = false
    });
  }
</script>

<PortalLayout title="Choose a new password">
  <section class="mx-auto max-w-xl px-5 py-16">
    <div class="rounded-3xl border border-[#e3ebe5] bg-white p-7 shadow-sm sm:p-10">
      <p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Account recovery</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">Choose a new password</h1>
      <p class="mt-2 text-slate-600">Set a new password to access your account.</p>

      {#if flash.status}
        <p class="mt-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{flash.status}</p>
      {/if}

      <form class="mt-8 space-y-5" onsubmit={submit}>
        <div>
          <label for="email" class="mb-2 block text-sm font-semibold">Email address</label>
          <input id="email" bind:value={form.email} type="email" autocomplete="email" required
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.email}<p class="mt-2 text-sm text-red-700">{errors.email}</p>{/if}
        </div>

        <div>
          <label for="password" class="mb-2 block text-sm font-semibold">New password</label>
          <input id="password" bind:value={form.password} type="password" autocomplete="new-password" required minlength="8"
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.password}<p class="mt-2 text-sm text-red-700">{errors.password}</p>{/if}
        </div>

        <div>
          <label for="password_confirmation" class="mb-2 block text-sm font-semibold">Confirm new password</label>
          <input id="password_confirmation" bind:value={form.password_confirmation} type="password" autocomplete="new-password" required minlength="8"
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
        </div>

        <button type="submit" disabled={processing}
          class="w-full rounded-xl bg-[#176b3b] px-5 py-3.5 font-bold text-white hover:bg-[#0b482b] disabled:opacity-60">
          {processing ? "Updating…" : "Reset password"}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        <Link href="/login" class="font-bold text-[#176b3b] hover:underline">Back to sign in</Link>
      </p>
    </div>
  </section>
</PortalLayout>

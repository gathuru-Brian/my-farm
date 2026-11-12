<script>
  import { Link, useForm } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { flash = {} } = $props();
  let form = useForm({ email: "" });

  function submit(event) {
    event.preventDefault();
    form.post("/forgot-password");
  }
</script>

<PortalLayout title="Reset your password">
  <section class="auth-shell flex min-h-[calc(100vh-8.5rem)] items-center justify-center px-5 py-12 sm:py-16">
    <div class="auth-card w-full max-w-xl rounded-[1.75rem] border p-7 sm:p-10">
      <p class="inline-flex items-center gap-2 rounded-full bg-[#edf5e7] px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#438150]"><span aria-hidden="true">✦</span> Account recovery</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">Reset your password</h1>
      <p class="mt-2 leading-6 text-slate-600">Enter your account email and we’ll send a secure reset link if it’s registered.</p>

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

        <button type="submit" disabled={form.processing}
          class="w-full rounded-xl bg-[#1b5d3a] px-5 py-3.5 font-bold text-white shadow-sm shadow-[#1b5d3a]/15 hover:-translate-y-0.5 hover:bg-[#12472d] disabled:cursor-wait disabled:opacity-60">
          {form.processing ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p class="mt-7 border-t border-[#edf0e9] pt-6 text-center text-sm text-slate-600">
        Remembered your password? <Link href="/login" class="font-bold text-[#176b3b] hover:underline">Sign in</Link>
      </p>
    </div>
  </section>
</PortalLayout>

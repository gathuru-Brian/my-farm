<script>
  import { Link, router } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { errors = {} } = $props();
  let form = $state({
    full_name: "",
    email: "",
    phone: "",
    role: "customer",
    password: "",
    password_confirmation: ""
  });
  let processing = $state(false);

  function submit(event) {
    event.preventDefault();
    processing = true;
    router.post("/register", form, {
      onFinish: () => processing = false
    });
  }
</script>

<PortalLayout title="Create account">
  <section class="auth-shell flex min-h-[calc(100vh-8.5rem)] items-center justify-center px-5 py-12 sm:py-16">
    <div class="auth-card w-full max-w-xl rounded-[1.75rem] border p-7 sm:p-10">
      <p class="inline-flex items-center gap-2 rounded-full bg-[#edf5e7] px-3 py-1.5 text-xs font-bold uppercase tracking-[.16em] text-[#438150]"><span aria-hidden="true">✦</span> Join the marketplace</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">Create your account</h1>
      <p class="mt-2 leading-6 text-slate-600">Choose how you want to use Modern Farms.</p>

      <form class="mt-7 space-y-5" onsubmit={submit}>
        <div>
          <label for="full_name" class="mb-2 block text-sm font-semibold text-[#263c2e]">Full name</label>
          <input id="full_name" bind:value={form.full_name} autocomplete="name" required
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          {#if errors.full_name}<p class="mt-2 text-sm text-red-700" role="alert">{errors.full_name}</p>{/if}
        </div>

        <div>
          <label for="email" class="mb-2 block text-sm font-semibold text-[#263c2e]">Email address</label>
          <input id="email" bind:value={form.email} type="email" autocomplete="email" required
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          {#if errors.email}<p class="mt-2 text-sm text-red-700" role="alert">{errors.email}</p>{/if}
        </div>

        <div>
          <label for="phone" class="mb-2 block text-sm font-semibold text-[#263c2e]">Phone number <span class="font-normal text-slate-500">(optional)</span></label>
          <input id="phone" bind:value={form.phone} type="tel" autocomplete="tel"
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          {#if errors.phone}<p class="mt-2 text-sm text-red-700" role="alert">{errors.phone}</p>{/if}
        </div>

        <fieldset>
          <legend class="mb-2 text-sm font-semibold text-[#263c2e]">I want to join as a</legend>
          <div class="grid grid-cols-2 gap-3">
            {#each [{ value: "customer", label: "Customer" }, { value: "producer", label: "Producer" }] as option}
              <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 text-sm font-semibold transition-colors hover:border-[#a9c9a9] hover:bg-[#f8faf6]">
                <input type="radio" bind:group={form.role} value={option.value} class="accent-[#176b3b]" />
                {option.label}
              </label>
            {/each}
          </div>
          {#if errors.role}<p class="mt-2 text-sm text-red-700">{errors.role}</p>{/if}
        </fieldset>

        <div>
          <label for="password" class="mb-2 block text-sm font-semibold text-[#263c2e]">Password</label>
          <input id="password" bind:value={form.password} type="password" autocomplete="new-password" required minlength="8"
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
          <p class="mt-2 text-xs text-slate-500">Use at least 8 characters.</p>
          {#if errors.password}<p class="mt-2 text-sm text-red-700" role="alert">{errors.password}</p>{/if}
        </div>

        <div>
          <label for="password_confirmation" class="mb-2 block text-sm font-semibold text-[#263c2e]">Confirm password</label>
          <input id="password_confirmation" bind:value={form.password_confirmation} type="password" autocomplete="new-password" required
            class="w-full rounded-xl border border-[#dce7df] bg-white px-4 py-3.5 outline-none placeholder:text-slate-400" />
        </div>

        <button type="submit" disabled={processing}
          class="w-full rounded-xl bg-[#1b5d3a] px-5 py-3.5 font-bold text-white shadow-sm shadow-[#1b5d3a]/15 hover:-translate-y-0.5 hover:bg-[#12472d] disabled:cursor-wait disabled:opacity-60">
          {processing ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p class="mt-7 border-t border-[#edf0e9] pt-6 text-center text-sm text-slate-600">
        Already registered? <Link href="/login" class="font-bold text-[#176b3b] hover:underline">Sign in</Link>
      </p>
    </div>
  </section>
</PortalLayout>

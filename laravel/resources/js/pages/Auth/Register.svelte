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
  <section class="mx-auto max-w-xl px-5 py-16">
    <div class="rounded-3xl border border-[#e3ebe5] bg-white p-7 shadow-sm sm:p-10">
      <p class="text-sm font-bold uppercase tracking-[.16em] text-[#438150]">Join the marketplace</p>
      <h1 class="mt-3 text-3xl font-bold tracking-tight">Create your account</h1>
      <p class="mt-2 text-slate-600">Choose how you want to use Modern Farms.</p>

      <form class="mt-8 space-y-5" onsubmit={submit}>
        <div>
          <label for="full_name" class="mb-2 block text-sm font-semibold">Full name</label>
          <input id="full_name" bind:value={form.full_name} autocomplete="name" required
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.full_name}<p class="mt-2 text-sm text-red-700">{errors.full_name}</p>{/if}
        </div>

        <div>
          <label for="email" class="mb-2 block text-sm font-semibold">Email address</label>
          <input id="email" bind:value={form.email} type="email" autocomplete="email" required
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.email}<p class="mt-2 text-sm text-red-700">{errors.email}</p>{/if}
        </div>

        <div>
          <label for="phone" class="mb-2 block text-sm font-semibold">Phone number <span class="font-normal text-slate-500">(optional)</span></label>
          <input id="phone" bind:value={form.phone} type="tel" autocomplete="tel"
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.phone}<p class="mt-2 text-sm text-red-700">{errors.phone}</p>{/if}
        </div>

        <fieldset>
          <legend class="mb-2 text-sm font-semibold">I want to join as a</legend>
          <div class="grid grid-cols-2 gap-3">
            {#each [{ value: "customer", label: "Customer" }, { value: "producer", label: "Producer" }] as option}
              <label class="flex cursor-pointer items-center gap-2 rounded-xl border border-[#dce7df] px-4 py-3 text-sm font-semibold">
                <input type="radio" bind:group={form.role} value={option.value} class="accent-[#176b3b]" />
                {option.label}
              </label>
            {/each}
          </div>
          {#if errors.role}<p class="mt-2 text-sm text-red-700">{errors.role}</p>{/if}
        </fieldset>

        <div>
          <label for="password" class="mb-2 block text-sm font-semibold">Password</label>
          <input id="password" bind:value={form.password} type="password" autocomplete="new-password" required minlength="8"
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
          {#if errors.password}<p class="mt-2 text-sm text-red-700">{errors.password}</p>{/if}
        </div>

        <div>
          <label for="password_confirmation" class="mb-2 block text-sm font-semibold">Confirm password</label>
          <input id="password_confirmation" bind:value={form.password_confirmation} type="password" autocomplete="new-password" required
            class="w-full rounded-xl border border-[#dce7df] px-4 py-3 outline-none focus:border-[#5ba876] focus:ring-2 focus:ring-green-100" />
        </div>

        <button type="submit" disabled={processing}
          class="w-full rounded-xl bg-[#176b3b] px-5 py-3.5 font-bold text-white hover:bg-[#0b482b] disabled:opacity-60">
          {processing ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-slate-600">
        Already registered? <Link href="/login" class="font-bold text-[#176b3b] hover:underline">Sign in</Link>
      </p>
    </div>
  </section>
</PortalLayout>

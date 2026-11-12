<script>
  import { Link, useForm } from "@inertiajs/svelte";
  import PortalLayout from "../../components/PortalLayout.svelte";

  let { flash = {} } = $props();
  let form = useForm({ email: "", password: "", remember: true });

  function submit(event) {
    event.preventDefault();
    form.post("/login");
  }
</script>

<PortalLayout title="Sign in">
  <section
    class="auth-shell relative flex min-h-[calc(100vh-8.5rem)] items-center justify-center px-5 py-12 sm:py-16
           bg-[radial-gradient(ellipse_at_top,_#f4f7f0_0%,_#eef2ea_45%,_#e8ece4_100%)]"
  >
    <!-- subtle top accent line -->
    <div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c5d6c0] to-transparent"></div>

    <div
      class="auth-card relative w-full max-w-[420px] overflow-hidden rounded-3xl border border-[#dfe8d9]
             bg-white/95 shadow-[0_20px_50px_-12px_rgba(27,93,58,0.12)] backdrop-blur-sm"
    >
      <!-- soft top brand accent -->
      <div class="h-1.5 w-full bg-gradient-to-r from-[#1b5d3a] via-[#2d7a4f] to-[#438150]"></div>

      <div class="p-8 sm:p-10">
        <!-- Header -->
        <div class="space-y-3">
          <p
            class="inline-flex items-center gap-2 rounded-full bg-[#edf5e7] px-3.5 py-1.5
                   text-[11px] font-bold uppercase tracking-[0.18em] text-[#3d6b45]"
          >
            <span aria-hidden="true" class="text-[#438150]">✦</span>
            Welcome back
          </p>

          <h1 class="text-[1.75rem] font-bold tracking-tight text-[#14261b] sm:text-[1.875rem]">
            Sign in to Modern Farms
          </h1>

          <p class="text-[15px] leading-relaxed text-slate-600">
            Access your marketplace account and continue where you left off.
          </p>
        </div>

        <!-- Flash / Status -->
        {#if flash.status}
          <p
            class="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3.5
                   text-sm leading-relaxed text-emerald-900"
            role="status"
          >
            {flash.status}
          </p>
        {/if}

        <!-- Migration notice -->
        <p
          class="mt-6 rounded-2xl border border-[#e2e9d9] bg-[#f7f9f3] px-4 py-3.5
                 text-sm leading-relaxed text-slate-600"
        >
          Returning from an earlier version?
          <Link
            href="/forgot-password"
            class="font-semibold text-[#176b3b] underline decoration-[#b9d1ad] underline-offset-2
                   transition hover:text-[#0b482b]"
          >
            Reset your password
          </Link>
          to sign in here.
        </p>

        <!-- Form -->
        <form class="mt-8 space-y-5" onsubmit={submit}>
          <!-- Email -->
          <div class="space-y-2">
            <label for="email" class="block text-sm font-semibold text-[#1e3226]">
              Email address
            </label>
            <input
              id="email"
              bind:value={form.email}
              type="email"
              autocomplete="email"
              required
              aria-invalid={form.errors.email ? "true" : undefined}
              aria-describedby={form.errors.email ? "email-error" : undefined}
              class="w-full rounded-2xl border border-[#d5e0d4] bg-[#fbfcf9] px-4 py-3.5 text-[15px]
                     text-[#14261b] outline-none transition
                     placeholder:text-slate-400
                     hover:border-[#c5d4c2]
                     focus:border-[#1b5d3a] focus:bg-white focus:ring-[3px] focus:ring-[#1b5d3a]/15"
            />
            {#if form.errors.email}
              <p id="email-error" class="text-sm text-red-700" role="alert">
                {form.errors.email}
              </p>
            {/if}
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-semibold text-[#1e3226]">
              Password
            </label>
            <input
              id="password"
              bind:value={form.password}
              type="password"
              autocomplete="current-password"
              required
              aria-invalid={form.errors.password ? "true" : undefined}
              aria-describedby={form.errors.password ? "password-error" : undefined}
              class="w-full rounded-2xl border border-[#d5e0d4] bg-[#fbfcf9] px-4 py-3.5 text-[15px]
                     text-[#14261b] outline-none transition
                     placeholder:text-slate-400
                     hover:border-[#c5d4c2]
                     focus:border-[#1b5d3a] focus:bg-white focus:ring-[3px] focus:ring-[#1b5d3a]/15"
            />
            {#if form.errors.password}
              <p id="password-error" class="text-sm text-red-700" role="alert">
                {form.errors.password}
              </p>
            {/if}
          </div>

          <!-- Remember + Forgot -->
          <div class="flex items-center justify-between gap-4 pt-0.5">
            <label class="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
              <input
                type="checkbox"
                bind:checked={form.remember}
                class="size-4 rounded border-[#c5d4c2] text-[#1b5d3a] accent-[#1b5d3a]
                       focus:ring-2 focus:ring-[#1b5d3a]/30"
              />
              Keep me signed in
            </label>

            <Link
              href="/forgot-password"
              class="text-sm font-semibold text-[#176b3b] transition hover:text-[#0b482b] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <!-- Submit -->
          <button
            type="submit"
            disabled={form.processing}
            class="group relative mt-1 w-full overflow-hidden rounded-2xl bg-[#1b5d3a] px-5 py-3.5
                   text-[15px] font-bold text-white
                   shadow-[0_8px_20px_-4px_rgba(27,93,58,0.35)]
                   transition duration-200
                   hover:-translate-y-0.5 hover:bg-[#154d30] hover:shadow-[0_12px_28px_-4px_rgba(27,93,58,0.4)]
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1b5d3a]
                   active:translate-y-0
                   disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-[0_8px_20px_-4px_rgba(27,93,58,0.35)]"
          >
            <span class="relative z-10">
              {form.processing ? "Signing in…" : "Sign in"}
            </span>
            <!-- subtle shine on hover -->
            <span
              class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent
                     transition-transform duration-500 group-hover:translate-x-full"
              aria-hidden="true"
            ></span>
          </button>
        </form>

        <!-- Footer -->
        <p class="mt-8 border-t border-[#e8eee3] pt-6 text-center text-sm text-slate-600">
          Don’t have an account?
          <Link
            href="/register"
            class="font-semibold text-[#176b3b] transition hover:text-[#0b482b] hover:underline"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  </section>
</PortalLayout>
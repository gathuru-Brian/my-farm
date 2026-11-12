<script>
  import { useForm } from "@inertiajs/svelte";
  import SiteHeader from "../components/SiteHeader.svelte";
  import SiteFooter from "../components/SiteFooter.svelte";

  let { auth } = $props();

  let form = useForm({ name: "", email: "", phone: "", topic: "General question", message: "" });
  let sent = $state(false);

  const topics = ["General question", "Buying produce", "Selling as a producer", "Order help", "Partnerships"];

  function submit(e) {
    e.preventDefault();
    form.post("/contact", {
      preserveScroll: true,
      onSuccess: () => {
        sent = true;
        form.resetAndClearErrors();
      },
    });
  }

  const field = "mt-2 w-full rounded-xl border border-[#d8e0d4] bg-white px-4 py-3 text-base placeholder:text-slate-400 focus:border-[#438150] focus:outline-none focus:ring-2 focus:ring-[#438150]/30";
</script>

<svelte:head>
  <title>Contact us | Modern Farms</title>
  <meta name="description" content="Get in touch with the Modern Farms team." />
</svelte:head>

<div class="marketing-page min-h-screen antialiased">
  <SiteHeader user={auth?.user} />

  <main>
    <section class="bg-[#102d20] text-white">
      <div class="mx-auto max-w-7xl px-5 py-16 sm:py-20 lg:px-8">
        <h1 class="max-w-2xl text-4xl font-extrabold tracking-[-.04em] sm:text-5xl">We'd love to hear from you</h1>
        <p class="mt-4 max-w-xl text-lg leading-8 text-green-50/80">Questions about buying, selling, or an order? Send us a message and we'll reply within one working day.</p>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[1.4fr_1fr] lg:px-8 lg:py-20">
      <div class="rounded-3xl border border-[#e1e9de] bg-white p-6 sm:p-10">
        {#if sent}
          <div class="py-10 text-center" role="status">
            <span class="mx-auto grid size-14 place-items-center rounded-full bg-[#edf5e7] text-2xl" aria-hidden="true">✓</span>
            <h2 class="mt-5 text-2xl font-bold">Message sent</h2>
            <p class="mt-2 text-slate-600">Thanks for reaching out. We'll reply by email within one working day.</p>
            <button class="mt-6 font-bold text-[#28623a] hover:underline" onclick={() => (sent = false)}>Send another message</button>
          </div>
        {:else}
          <form onsubmit={submit} class="grid gap-5" novalidate>
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label for="name" class="font-semibold">Full name</label>
                <input id="name" class={field} bind:value={form.name} autocomplete="name" required />
                {#if form.errors.name}<p class="mt-1 text-sm text-red-600" role="alert">{form.errors.name}</p>{/if}
              </div>
              <div>
                <label for="email" class="font-semibold">Email</label>
                <input id="email" type="email" class={field} bind:value={form.email} autocomplete="email" required />
                {#if form.errors.email}<p class="mt-1 text-sm text-red-600" role="alert">{form.errors.email}</p>{/if}
              </div>
            </div>
            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label for="phone" class="font-semibold">Phone <span class="font-normal text-slate-500">(optional)</span></label>
                <input id="phone" type="tel" class={field} bind:value={form.phone} autocomplete="tel" placeholder="+254" />
                {#if form.errors.phone}<p class="mt-1 text-sm text-red-600" role="alert">{form.errors.phone}</p>{/if}
              </div>
              <div>
                <label for="topic" class="font-semibold">What's it about?</label>
                <select id="topic" class={field} bind:value={form.topic}>
                  {#each topics as t}<option>{t}</option>{/each}
                </select>
              </div>
            </div>
            <div>
              <label for="message" class="font-semibold">Message</label>
              <textarea id="message" rows="6" class={field} bind:value={form.message} required></textarea>
              {#if form.errors.message}<p class="mt-1 text-sm text-red-600" role="alert">{form.errors.message}</p>{/if}
            </div>
            <button disabled={form.processing} class="rounded-xl bg-[#173f2a] px-7 py-4 font-bold text-white transition hover:bg-[#1f5236] disabled:cursor-wait disabled:opacity-60 sm:w-fit">
              {form.processing ? "Sending…" : "Send message"}
            </button>
          </form>
        {/if}
      </div>

      <aside class="space-y-5">
        <!-- Replace with your real details -->
        <div class="rounded-3xl bg-[#eaf1e3] p-7">
          <h2 class="text-xl font-bold">Contact details</h2>
          <dl class="mt-5 space-y-4 text-slate-700">
            <div><dt class="text-sm font-semibold text-[#28623a]">Email</dt><dd>gathurubryan@gmail.com</dd></div>
            <div><dt class="text-sm font-semibold text-[#28623a]">Phone</dt><dd>+254 769 408 606</dd></div>
            <div><dt class="text-sm font-semibold text-[#28623a]">Location</dt><dd>Nairobi, Kenya</dd></div>
            <div><dt class="text-sm font-semibold text-[#28623a]">Hours</dt><dd>Mon–sun, 7.30AM – 10:00 PM</dd></div>
          </dl>
        </div>
        <div class="rounded-3xl bg-[#102d20] p-7 text-white">
          <h2 class="text-xl font-bold">Are you a farmer?</h2>
          <p class="mt-2 text-green-50/80">Create a producer account and start listing your harvest today.</p>
          <a href="/register" class="mt-5 inline-block rounded-xl bg-[#d8e9b8] px-6 py-3 font-bold text-[#173b29] transition hover:bg-[#e5f0ce]">Start selling →</a>
        </div>
      </aside>
    </section>
  </main>

  <SiteFooter />
</div>
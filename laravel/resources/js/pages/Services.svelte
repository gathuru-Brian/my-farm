<script>
  import { Link } from "@inertiajs/svelte";
  import PublicPageLayout from "../components/PublicPageLayout.svelte";

  let { auth } = $props();

  const services = [
    { icon: "🌾", title: "Agricultural consultancy", text: "Get in touch to discuss practical questions about crop and livestock production." },
    { icon: "🧑🏽‍🌾", title: "Farm training", text: "Ask about practical learning opportunities for farmers and agribusiness owners." },
    { icon: "🐄", title: "Livestock management", text: "Explore guidance related to dairy and poultry production and day-to-day farm management." },
    { icon: "🗺️", title: "Farm planning", text: "Discuss farm setup and planning considerations for your agricultural project." }
  ];
</script>

<PublicPageLayout
  {auth}
  title="Services"
  description="Explore agricultural support areas and get in touch with Modern Farms to discuss your needs."
  eyebrow="How we can help"
  heading="Practical support for growing farms."
  intro="Explore the agricultural support areas the Kuria Farms team has highlighted. Contact us to confirm current availability and discuss what you need."
  image="/images/soil.jpg"
  imageAlt="Healthy soil prepared for growing"
>
  {#snippet children()}
    <section class="mx-auto max-w-7xl px-5 py-14 sm:py-20 lg:px-8">
      <div class="grid gap-5 sm:grid-cols-2">
        {#each services as service}
          <article class="rounded-3xl border border-[#e1e9de] bg-white p-7 shadow-[0_8px_30px_-22px_rgba(24,69,42,.35)]">
            <span class="grid size-12 place-items-center rounded-2xl bg-[#eaf1e3] text-2xl" aria-hidden="true">{service.icon}</span>
            <h2 class="mt-5 text-xl font-bold text-[#173f2a]">{service.title}</h2>
            <p class="mt-3 leading-7 text-slate-600">{service.text}</p>
          </article>
        {/each}
      </div>
      <div class="mt-8 flex flex-col gap-5 rounded-3xl bg-[#102d20] p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div>
          <h2 class="text-2xl font-bold">Tell us what you are working on</h2>
          <p class="mt-2 max-w-2xl leading-7 text-green-50/80">Send a message so we can talk through your requirements and the support currently available.</p>
        </div>
        <Link href="/contact" class="inline-flex shrink-0 justify-center rounded-xl bg-[#d8e9b8] px-6 py-3 font-bold text-[#173b29] transition hover:bg-[#e5f0ce]">Contact us</Link>
      </div>
    </section>
  {/snippet}
</PublicPageLayout>

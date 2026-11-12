<script>
  import { Link } from "@inertiajs/svelte";
  import PublicPageLayout from "../components/PublicPageLayout.svelte";

  let { auth } = $props();

  const steps = [
    { number: "01", title: "Growing", text: "Every harvest begins with care for the land, healthy soil, and choices suited to the crop and season.", image: "/images/soil.jpg", alt: "Soil prepared for planting" },
    { number: "02", title: "Raising", text: "Local farms grow a range of crops and raise livestock to supply fresh produce to their communities.", image: "/images/vegetables.jpg", alt: "Fresh vegetables from a farm" },
    { number: "03", title: "Harvesting", text: "Producers list the products they have available so customers can discover what is ready to buy.", image: "/images/maize.jpg", alt: "A maize crop growing in a field" },
    { number: "04", title: "Connecting", text: "Customers can place an order and communicate with producers through the Modern Farms marketplace.", image: "/images/farm-hero.jpg", alt: "A farm landscape" }
  ];
</script>

<PublicPageLayout
  {auth}
  title="Farm tour"
  description="Take a virtual look at the journey from growing local produce to finding it in the Modern Farms marketplace."
  eyebrow="A virtual farm tour"
  heading="Follow the journey from farm to table."
  intro="Take a look at the work behind local food and see how the Modern Farms marketplace connects producers with customers."
  image="/images/farm-hero.jpg"
  imageAlt="A farm landscape in Kenya"
>
  {#snippet children()}
    <section class="mx-auto max-w-7xl px-5 py-14 sm:py-20 lg:px-8">
      <div class="grid gap-6 md:grid-cols-2">
        {#each steps as step}
          <article class="overflow-hidden rounded-3xl border border-[#e1e9de] bg-white sm:grid sm:grid-cols-[0.8fr_1.2fr]">
            <img src={step.image} alt={step.alt} loading="lazy" class="h-52 w-full object-cover sm:h-full" />
            <div class="p-6 sm:p-7">
              <span class="text-sm font-extrabold tracking-[0.18em] text-[#438150]">{step.number}</span>
              <h2 class="mt-2 text-xl font-bold text-[#173f2a]">{step.title}</h2>
              <p class="mt-3 leading-7 text-slate-600">{step.text}</p>
            </div>
          </article>
        {/each}
      </div>
      <div class="mt-8 rounded-3xl bg-[#eaf1e3] p-7 sm:p-9">
        <h2 class="text-2xl font-extrabold text-[#173f2a]">Ready to explore local produce?</h2>
        <p class="mt-2 max-w-2xl leading-7 text-slate-700">Browse the marketplace or learn more about the producers and products available through Modern Farms.</p>
        <Link href="/register" class="mt-5 inline-flex rounded-xl bg-[#173f2a] px-6 py-3 font-bold text-white transition hover:bg-[#1f5236]">Explore the marketplace</Link>
      </div>
    </section>
  {/snippet}
</PublicPageLayout>

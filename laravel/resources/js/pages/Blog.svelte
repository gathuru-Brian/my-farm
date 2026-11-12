<script>
  import { Link } from "@inertiajs/svelte";
  import PublicPageLayout from "../components/PublicPageLayout.svelte";

  let { auth } = $props();

  const articles = [
    {
      category: "Livestock",
      title: "Modern dairy farming: small practices that matter",
      excerpt: "Consistent routines, clean housing, reliable water, and attentive animal care all contribute to a healthy dairy operation.",
      image: "/images/dairy.png",
      alt: "Dairy farming and fresh dairy products",
      points: [
        "Keep housing clean, dry, and comfortable, and make fresh water easy to reach.",
        "Use consistent feeding and milking routines, and keep a simple record of changes in production or health.",
        "Work with a qualified veterinary professional when animals show signs of illness."
      ]
    },
    {
      category: "Crop farming",
      title: "Sustainable crop farming starts with the soil",
      excerpt: "Healthy soil supports resilient crops. Careful observation and thoughtful soil management can help farms protect this essential resource.",
      image: "/images/soil.jpg",
      alt: "Healthy soil prepared for growing crops",
      points: [
        "Observe the soil and growing conditions regularly before deciding what amendments are needed.",
        "Where appropriate, use crop rotation and ground cover to help protect soil structure.",
        "Choose practices suited to the local crop, climate, and farm conditions."
      ]
    }
  ];
</script>

<PublicPageLayout
  {auth}
  title="Farm journal"
  description="Practical notes on crop growing, livestock care, and local food from Modern Farms."
  eyebrow="The farm journal"
  heading="Ideas for healthier farms and fresher food."
  intro="A growing collection of practical notes about crop production, livestock care, and the people behind local food."
  image="/images/vegetables.jpg"
  imageAlt="Fresh vegetables grown on a local farm"
>
  {#snippet children()}
    <section class="mx-auto max-w-7xl px-5 py-14 sm:py-20 lg:px-8">
      <div class="grid gap-7 lg:grid-cols-2">
        {#each articles as article}
          <article class="overflow-hidden rounded-3xl border border-[#e1e9de] bg-white shadow-[0_8px_30px_-22px_rgba(24,69,42,.35)]">
            <img src={article.image} alt={article.alt} loading="lazy" class="h-56 w-full object-cover" />
            <div class="p-6 sm:p-8">
              <p class="text-sm font-bold uppercase tracking-[0.16em] text-[#438150]">{article.category}</p>
              <h2 class="mt-3 text-2xl font-extrabold tracking-tight text-[#173f2a]">{article.title}</h2>
              <p class="mt-3 leading-7 text-slate-600">{article.excerpt}</p>
              <h3 class="mt-6 font-bold text-[#173f2a]">A few things to consider</h3>
              <ul class="mt-3 list-disc space-y-2 pl-5 leading-6 text-slate-600">
                {#each article.points as point}
                  <li>{point}</li>
                {/each}
              </ul>
            </div>
          </article>
        {/each}
      </div>
      <p class="mt-8 rounded-2xl bg-[#f0f6ed] p-5 text-sm leading-6 text-slate-600">These articles are general information, not a substitute for advice tailored to your farm. Consult a qualified local agricultural or veterinary professional for specific guidance.</p>
      <div class="mt-8 text-center">
        <p class="text-lg font-semibold text-[#173f2a]">Have a question or a topic suggestion?</p>
        <Link href="/contact" class="mt-3 inline-flex font-bold text-[#28623a] hover:underline">Get in touch →</Link>
      </div>
    </section>
  {/snippet}
</PublicPageLayout>

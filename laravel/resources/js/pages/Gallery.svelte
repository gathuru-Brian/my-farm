<script>
  import PublicPageLayout from "../components/PublicPageLayout.svelte";

  let { auth } = $props();

  const photos = [
    { src: "/images/farm-hero.jpg", alt: "A broad view across a farm", label: "Across the farm", className: "sm:row-span-2" },
    { src: "/images/vegetables.jpg", alt: "Fresh vegetables ready to be enjoyed", label: "Fresh vegetables", className: "" },
    { src: "/images/maize.jpg", alt: "Maize growing in a field", label: "Field crops", className: "" },
    { src: "/images/poultry.jpg", alt: "Poultry raised on a farm", label: "Poultry", className: "" },
    { src: "/images/dairy.png", alt: "Dairy farming and fresh dairy products", label: "Dairy", className: "" },
    { src: "/images/soil.jpg", alt: "Rich soil prepared for planting", label: "Healthy soil", className: "" },
    { src: "/images/potatoes.jpg", alt: "Potatoes harvested for the market", label: "Harvest", className: "" },
    { src: "/images/kale.jpg", alt: "Fresh kale leaves", label: "Local produce", className: "" }
  ];
</script>

<PublicPageLayout
  {auth}
  title="Gallery"
  description="A look at the farms, crops, and produce featured by Modern Farms."
  eyebrow="From farm to table"
  heading="A closer look at what grows here."
  intro="Explore a selection of farm and produce photography from the Modern Farms collection."
  image="/images/hero.jpg"
  imageAlt="Farmers working together in a field"
>
  {#snippet children()}
    <section class="mx-auto max-w-7xl px-5 py-14 sm:py-20 lg:px-8">
      <div class="grid auto-rows-[13rem] gap-4 sm:grid-cols-2 sm:auto-rows-[16rem] lg:grid-cols-4">
        {#each photos as photo}
          <figure class={`group relative overflow-hidden rounded-3xl bg-[#eaf1e3] ${photo.className}`}>
            <img src={photo.src} alt={photo.alt} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <figcaption class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-5 pb-5 pt-12 text-lg font-bold text-white">{photo.label}</figcaption>
          </figure>
        {/each}
      </div>
    </section>
  {/snippet}
</PublicPageLayout>

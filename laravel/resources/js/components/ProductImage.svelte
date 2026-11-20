<script>
  let {
    src = null,
    name,
    category = "",
    className = "",
    imageClassName = "",
    showLabel = true
  } = $props();

  let failedImages = $state([]);

  const uploadedSource = $derived(normalizeImageSource(src));
  const fallbackSource = $derived(categoryImage(name, category));
  const imageSource = $derived.by(() => {
    if (uploadedSource && !failedImages.includes(uploadedSource)) {
      return uploadedSource;
    }

    return fallbackSource && !failedImages.includes(fallbackSource)
      ? fallbackSource
      : null;
  });
  const isSellerPhoto = $derived(Boolean(uploadedSource && imageSource === uploadedSource));

  function normalizeImageSource(value) {
    if (typeof value !== "string" || !value.trim()) return null;

    const path = value.trim();
    if (/^(https?:)?\/\//i.test(path) || /^(data|blob):/i.test(path)) return path;
    if (path.startsWith("/")) return path;
    if (path.startsWith("images/")) return `/${path}`;
    if (path.startsWith("storage/")) return `/${path}`;

    return `/storage/${path}`;
  }

  function categoryImage(productName, productCategory) {
    const nameText = String(productName ?? "").toLowerCase();
    const categoryText = String(productCategory ?? "").toLowerCase();
    const text = `${nameText} ${categoryText}`;

    if (/\bavocados?\b/.test(nameText)) return "/images/marketplace-avocado.jpg";
    if (/\bmango(?:es)?\b/.test(nameText)) return "/images/marketplace-mango.jpg";
    if (/\bbananas?\b/.test(nameText)) return "/images/marketplace-bananas.jpg";
    if (/\bpotatoes?\b/.test(nameText)) return "/images/marketplace-potatoes.jpg";
    if (/\btomatoes?\b/.test(nameText)) return "/images/vegetables.jpg";
    if (/\b(?:milk|yoghurt|yogurt|cheese|dairy)\b/.test(text)) return "/images/marketplace-milk.jpg";
    if (/\b(?:maize|corn)\b/.test(text)) return "/images/marketplace-maize.jpg";
    if (/\b(?:egg|eggs|poultry|chicken)\b/.test(text)) return "/images/poultry.jpg";
    if (/\b(?:cattle|cow|livestock|beef)\b/.test(text)) return "/images/dairy.png";
    if (/\b(?:vegetables?|greens|kale|spinach|lettuce|produce)\b/.test(text)) return "/images/marketplace-greens.jpg";
    if (/\b(?:fruit|fruits|apple|orange|citrus|pineapple|berry|berries)\b/.test(text)) return "/images/marketplace-mango.jpg";
    if (/\b(?:grain|grains|cereal|cereals|tuber|tubers|beans|legumes)\b/.test(text)) return "/images/marketplace-maize.jpg";

    return null;
  }

  function markImageFailed(source) {
    if (source && !failedImages.includes(source)) {
      failedImages = [...failedImages, source];
    }
  }
</script>

<div class={`relative overflow-hidden ${className}`}>
  {#if imageSource}
    <img
      src={imageSource}
      alt={isSellerPhoto ? name : `${name} category photo`}
      class={`h-full w-full object-cover ${imageClassName}`}
      loading="lazy"
      onerror={() => markImageFailed(imageSource)}
    />
    {#if !isSellerPhoto && showLabel}
      <span class="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-1 text-[10px] font-semibold text-white">
        Illustrative photo
      </span>
    {/if}
  {:else}
    <div class="grid h-full w-full place-items-center bg-gradient-to-br from-[#d8e9b8] to-[#9cc27a] text-5xl" role="img" aria-label={`${name} image unavailable`}>
      <span aria-hidden="true">🌿</span>
    </div>
  {/if}
</div>

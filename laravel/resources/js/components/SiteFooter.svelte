<script>
  import { Link } from "@inertiajs/svelte";

  const explore = [
    { label: "About us", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Farm tour", href: "/farm-tour" },
    { label: "Gallery", href: "/gallery" },
    { label: "Blog", href: "/blog" },
    { label: "How we work", href: "/#how-we-work" },
    { label: "Marketplace", href: "/#marketplace" }
  ];
</script>

<footer class="marketing-footer text-green-50" aria-label="Site footer">
  <div class="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.2fr] lg:px-8">
    <div>
      <Link href="/" class="flex items-center gap-2.5 text-xl font-extrabold" aria-label="Modern Farms home">
        <img src="/images/modern-farms-mark.svg" alt="" class="size-10" aria-hidden="true" />
        <span>Modern Farms</span>
      </Link>
      <p class="mt-4 max-w-xs text-sm leading-6 text-green-100/70">Farm fresh. Direct to you. Connecting Kenyan farmers with the people who value good food.</p>
    </div>

    <div>
      <h3 class="font-bold">Explore</h3>
      <ul class="mt-4 grid gap-3 text-sm text-green-100/70">
        {#each explore as l}
          <li><a href={l.href} class="transition hover:text-white">{l.label}</a></li>
        {/each}
        <li><Link href="/contact" class="transition hover:text-white">Contact</Link></li>
      </ul>
    </div>

    <div>
      <h3 class="font-bold">Account</h3>
      <ul class="mt-4 space-y-3 text-sm text-green-100/70">
        <li><Link href="/login" class="transition hover:text-white">Log in</Link></li>
        <li><Link href="/register" class="transition hover:text-white">Create account</Link></li>
        <li><Link href="/register" class="transition hover:text-white">Sell your produce</Link></li>
      </ul>
    </div>

    <div>
      <h3 class="font-bold">Get in touch</h3>
      <ul class="mt-4 space-y-3 text-sm text-green-100/70">
        <li><Link href="/contact" class="font-semibold text-[#c6df9e] transition hover:text-white">Contact us →</Link></li>
        <!-- Replace with your real details -->
        <li>gathurubryan@gmail.com</li>
        <li>+254 769 408 606</li>
        <li>Nairobi, Kenya</li>
      </ul>
    </div>
  </div>
  <div class="border-t border-white/10 px-5 py-6 text-center text-sm text-green-100/60">© 2026 Modern Farms. All rights reserved.</div>
</footer>

<script>
  // Shared chrome for every options section: rounded white card with
  // an emoji-prefixed title and an optional one-line description.
  // Keeping this in one place means hundreds of duplicated tailwind
  // strings collapse to a single declaration.
  let { emoji, title, description = '', children } = $props();
</script>

<section
  class="mb-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
>
  <h2
    class="flex items-center gap-2 text-base font-semibold text-slate-900 {description
      ? 'mb-1'
      : 'mb-4'}"
  >
    <span aria-hidden="true">{emoji}</span>
    {title}
  </h2>
  {#if description}
    <p class="mb-4 text-xs text-slate-500">{description}</p>
  {/if}
  {@render children()}
</section>

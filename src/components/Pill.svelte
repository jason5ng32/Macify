<script>
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import IconClose from '~icons/mingcute/close-line';

  // Pure presentation. Eligibility, cooldown, and side-effects live in
  // each pill's lib/ module; PillStack wires them together. This file
  // owns nothing except the floating bubble's look and the close button.
  let {
    icon: Icon,
    iconClass = 'text-white/80',
    message,
    cta = null,
    dismissLabel,
    onDismiss,
  } = $props();
</script>

<div
  class="fixed top-6 left-1/2 z-50 -translate-x-1/2"
  transition:fly={{ y: -40, duration: 450, easing: quintOut }}
>
  <div
    class="flex items-center gap-3 rounded-full bg-white/15 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-md ring-1 ring-white/10"
  >
    <Icon class="h-4 w-4 {iconClass}" />
    <span class="leading-tight">{message}</span>
    {#if cta}
      <button
        type="button"
        onclick={cta.onClick}
        class="cursor-pointer rounded-full bg-white/25 px-3 py-1 text-xs font-medium text-white transition hover:bg-white/35"
      >
        {cta.label}
      </button>
    {/if}
    <button
      type="button"
      onclick={onDismiss}
      class="cursor-pointer rounded-full p-1 text-white/70 transition hover:bg-white/15 hover:text-white"
      title={dismissLabel}
      aria-label={dismissLabel}
    >
      <IconClose class="h-3.5 w-3.5" />
    </button>
  </div>
</div>

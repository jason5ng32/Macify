<script>
  import { settings } from '../lib/settings.svelte.js';

  let now = $state(new Date());

  $effect(() => {
    const id = setInterval(() => {
      now = new Date();
    }, 1000);
    return () => clearInterval(id);
  });

  const display = $derived.by(() => {
    let h = now.getHours();
    const m = now.getMinutes().toString().padStart(2, '0');
    if (settings.hourSystem === '12') {
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return { time: `${h}:${m}`, suffix: ampm };
    }
    return { time: `${h.toString().padStart(2, '0')}:${m}`, suffix: '' };
  });
</script>

{#if settings.showTime}
  <div class="clock">
    <span class="time">{display.time}</span>
    {#if display.suffix}
      <span class="suffix">{display.suffix}</span>
    {/if}
  </div>
{/if}

<style>
  .clock {
    font-size: 5rem;
    font-weight: 200;
    letter-spacing: 0.02em;
    line-height: 1;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
    color: #fff;
    user-select: none;
  }
  .suffix {
    font-size: 0.4em;
    margin-left: 0.4em;
    opacity: 0.8;
    vertical-align: 0.6em;
  }
</style>

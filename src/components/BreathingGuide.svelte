<script>
  import { fade, fly } from 'svelte/transition';
  import { cubicIn, cubicOut } from 'svelte/easing';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';

  // Three breathing patterns. Scale envelope reaches 1.2 at peak so
  // the flower expands ~120% past the stage box for a more generous
  // bloom; 0.45 at trough collapses petals toward the center while
  // leaving a soft residual glow.
  const PATTERNS = {
    coherent: [
      { phase: 'inhale', durationMs: 5000, scale: 1.2 },
      { phase: 'exhale', durationMs: 5000, scale: 0.45 },
    ],
    box: [
      { phase: 'inhale', durationMs: 4000, scale: 1.2 },
      { phase: 'hold', durationMs: 4000, scale: 1.2 },
      { phase: 'exhale', durationMs: 4000, scale: 0.45 },
      { phase: 'hold', durationMs: 4000, scale: 0.45 },
    ],
    '478': [
      { phase: 'inhale', durationMs: 4000, scale: 1.2 },
      { phase: 'hold', durationMs: 7000, scale: 1.2 },
      { phase: 'exhale', durationMs: 8000, scale: 0.45 },
    ],
  };

  // 6 petals in a hex ring — the same arrangement as Apple's Breathe app
  // on watchOS. Each petal is positioned by `rotate(N) translateY(-Y)`,
  // putting the center of the petal at distance Y from the ring center
  // along angle N.
  const PETAL_COUNT = 6;
  const petalAngles = Array.from(
    { length: PETAL_COUNT },
    (_, i) => i * (360 / PETAL_COUNT),
  );

  let scale = $state(0.45);
  let durationMs = $state(5000);
  let phase = $state('exhale');

  // Tick through pattern phases for as long as the component is mounted.
  // Mount is gated by {#if zen.active && zenBreathingPattern !== 'off'}
  // in the parent — unmount auto-cleans the timer.
  $effect(() => {
    const pattern = PATTERNS[settings.zenBreathingPattern] ?? PATTERNS.coherent;
    let i = 0;
    let timer = null;

    function step() {
      const s = pattern[i];
      phase = s.phase;
      durationMs = s.durationMs;
      scale = s.scale;
      i = (i + 1) % pattern.length;
      timer = setTimeout(step, s.durationMs);
    }
    step();
    return () => {
      if (timer) clearTimeout(timer);
    };
  });

  const phaseLabel = $derived.by(() => {
    if (phase === 'inhale') return t('zen_breath_inhale');
    if (phase === 'exhale') return t('zen_breath_exhale');
    return t('zen_breath_hold');
  });
</script>

<div class="overlay" transition:fade={{ duration: 800 }}>
  <!-- Layered transforms:
       .rotor — continuous slow CSS rotation, never resets.
       .breath — scale tied to phase via inline style + Svelte $state.
       .petal — fixed angular offset, sets up the hex layout.
       Keeping these in separate elements lets each transform own its
       own axis without fighting the others. -->
  <div class="stage">
    <div class="rotor">
      <div
        class="breath"
        style:transform={`scale(${scale})`}
        style:transition={`transform ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`}
      >
        {#each petalAngles as angle (angle)}
          <div
            class="petal"
            style:transform={`translate(-50%, -50%) rotate(${angle}deg) translateY(-26%)`}
          ></div>
        {/each}
      </div>
    </div>
  </div>
  <!-- Label slot has a fixed height so old/new labels can crossfade in
       the same physical row without layout reflow. {#key} re-mounts on
       text change, triggering the fly in/out transitions. -->
  <div class="label-slot">
    {#key phaseLabel}
      <span
        class="label"
        in:fly={{ y: 10, duration: 700, easing: cubicOut, delay: 80 }}
        out:fly={{ y: -10, duration: 360, easing: cubicIn }}
      >
        {phaseLabel}
      </span>
    {/key}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1.75rem;
    pointer-events: none;
    z-index: 10;
  }
  .stage {
    position: relative;
    width: 320px;
    height: 320px;
  }
  .rotor {
    position: absolute;
    inset: 0;
    transform-origin: center;
    animation: spin 36s linear infinite;
    will-change: transform;
  }
  .breath {
    position: absolute;
    inset: 0;
    transform-origin: center;
    will-change: transform;
  }
  .petal {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 56%;
    height: 56%;
    border-radius: 50%;
    background: radial-gradient(
      circle at 35% 35%,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(220, 240, 255, 0.45) 45%,
      rgba(180, 220, 255, 0.18) 80%,
      rgba(180, 220, 255, 0) 100%
    );
    /* Screen blend on top of the video produces the signature Apple
       "bright bloom where petals overlap" effect, brighter where two
       petals stack and brightest at the center where all six meet. */
    mix-blend-mode: screen;
    filter: blur(0.5px);
    will-change: transform;
  }
  .label-slot {
    position: relative;
    width: 100%;
    height: 2.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .label {
    position: absolute;
    color: rgba(255, 255, 255, 0.85);
    font-size: 1.4rem;
    font-weight: 300;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
    user-select: none;
    will-change: transform, opacity;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>

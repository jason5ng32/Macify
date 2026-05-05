<script>
  import Pill from './Pill.svelte';
  import { zen } from '../lib/zen.svelte.js';
  import { checkProxyAdvisoryPill } from '../lib/proxy-advisory.js';
  import { checkZenReminderPill } from '../lib/zen-reminder.js';
  import { checkDonatePill } from '../lib/donate.js';

  // Pill orchestration. The new tab page can have at most one floating
  // pill at a time — they all use the same fixed top-center anchor and
  // stacking would overlap. Candidates are evaluated in priority order
  // and the first one to return a non-null result wins.
  //
  // Priority rationale:
  //   1. proxyAdvisory — at most weekly; if a more frequent pill (zen)
  //      consumed the slot every time, the advisory could be masked
  //      indefinitely. It also has the most actionable consequence
  //      (the proxy may stop working).
  //   2. zenReminder — wellness, fires on its own schedule.
  //   3. donate — informational, lowest urgency.
  const candidates = [
    checkProxyAdvisoryPill,
    checkZenReminderPill,
    checkDonatePill,
  ];

  let active = $state(null);

  $effect(() => {
    let cancelled = false;
    (async () => {
      for (const check of candidates) {
        let result;
        try {
          result = await check();
        } catch {
          continue;
        }
        if (cancelled) return;
        if (!result) continue;
        // onShow is for stamp-on-render side effects (zen reminder,
        // donate). Must commit BEFORE the user can see the pill so a
        // concurrent new-tab page can't double-fire the same pill.
        try {
          await result.onShow?.();
        } catch {}
        if (cancelled) return;
        active = result;
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  });

  // If the user enters Zen by any other entry point (the bottom-left
  // launcher), the floating pill is moot — hide it so it doesn't sit
  // on top of the fullscreen video.
  $effect(() => {
    if (zen.active) active = null;
  });

  async function handleDismiss() {
    const current = active;
    active = null;
    try {
      await current?.onDismiss?.();
    } catch {}
  }

  async function handleCta() {
    const current = active;
    active = null;
    try {
      await current?.cta?.onClick();
    } catch {}
  }
</script>

{#if active}
  <Pill
    icon={active.icon}
    iconClass={active.iconClass}
    message={active.message}
    cta={active.cta
      ? { label: active.cta.label, onClick: handleCta }
      : null}
    dismissLabel={active.dismissLabel}
    onDismiss={handleDismiss}
  />
{/if}

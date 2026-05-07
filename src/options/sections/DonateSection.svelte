<script>
  import { t } from '../../lib/i18n.svelte.js';
  import { DONATE_URL } from '../../lib/donate.js';
  import IconHeart from '~icons/mingcute/heart-fill';
</script>

<!-- Intentionally a touch fancier than the regular SettingsCard — the
     gradient background and centered layout deliberately stand apart
     from the utilitarian sections above it. -->
<section
  class="mb-5 overflow-hidden rounded-xl bg-linear-to-br from-pink-50 via-rose-50 to-amber-50 p-7 shadow-sm ring-1 ring-rose-100"
>
  <div class="flex flex-col items-center text-center">
    <div
      class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-rose-100"
    >
      <IconHeart class="h-6 w-6 text-rose-500" />
    </div>
    <h2 class="mb-2 text-lg font-semibold text-slate-900">
      {t('donate_section')}
    </h2>
    <p class="mb-5 max-w-md text-sm leading-relaxed text-slate-600">
      {t('donate_explainer')}
    </p>
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600 focus:ring-2 focus:ring-rose-500/40 focus:outline-none"
    >
      <IconHeart class="h-4 w-4" />
      <span>{t('donate_button')}</span>
    </a>
  </div>
</section>

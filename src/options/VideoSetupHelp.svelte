<script>
  import { t } from '../lib/i18n.svelte.js';

  // Both help sections render unconditionally. The warning under the
  // reverse-proxy toggle explicitly points users to either option (trust
  // the cert OR run a local server), so both need to be reachable from
  // any source selection.

  const SETUP_SCRIPT =
    'bash <(curl -fsSL https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/local-server/setup.sh)';

  const DOWNLOADER_SCRIPT =
    'bash <(curl -fsSL https://raw.githubusercontent.com/jason5ng32/Macify/main/scripts/aerial_downloader/install.sh)';
</script>

<details
  class="mt-3 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200 open:bg-white"
>
  <summary class="cursor-pointer font-medium text-slate-700 select-none">
    {t('video_apple_help_title')}
  </summary>
  <div class="mt-3 space-y-3 text-slate-600">
    <p>{t('video_apple_help_intro')}</p>
    <div>
      <p class="font-medium text-slate-700">
        {t('video_apple_help_option1_title')}
      </p>
      <p class="mt-1">{t('video_apple_help_option1_body')}</p>
    </div>
    <div>
      <p class="font-medium text-slate-700">
        {t('video_apple_help_option2_title')}
      </p>
      <p class="mt-1">
        {t('video_apple_help_option2_body_pre')}
        <a
          href="https://sylvan.apple.com"
          target="_blank"
          rel="noopener noreferrer"
          class="font-mono text-blue-600 hover:underline">https://sylvan.apple.com</a
        >
        {t('video_apple_help_option2_body_post')}
      </p>
    </div>
  </div>
</details>

<details
  class="mt-3 rounded-lg bg-slate-50 p-3 text-sm ring-1 ring-slate-200 open:bg-white"
>
  <summary class="cursor-pointer font-medium text-slate-700 select-none">
    {t('video_local_help_title')}
  </summary>
  <div class="mt-3 space-y-3 text-slate-600">
    <p
      class="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200"
    >
      {t('video_local_macos_only')}
    </p>
    <ol class="list-decimal space-y-4 pl-5">
      <li>
        {t('video_local_step1')}
        <pre
          class="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">{SETUP_SCRIPT}</pre>
      </li>
      <li>
        {t('video_local_step2')}
        <div class="mt-2 space-y-3">
          <div>
            <p class="font-medium text-slate-700">
              {t('video_local_step2_manual_title')}
            </p>
            <p class="mt-1">{t('video_local_step2_manual_body')}</p>
          </div>
          <div>
            <p class="font-medium text-slate-700">
              {t('video_local_step2_script_title')}
            </p>
            <p class="mt-1">{t('video_local_step2_script_body')}</p>
            <pre
              class="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">{DOWNLOADER_SCRIPT}</pre>
          </div>
        </div>
      </li>
      <li>
        {t('video_local_step3_pre')}
        <code class="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs"
          >http://localhost:18000/videos/</code
        >
        {t('video_local_step3_post')}
      </li>
    </ol>
  </div>
</details>

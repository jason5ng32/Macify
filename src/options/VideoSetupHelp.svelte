<script>
  import { t } from '../lib/i18n.svelte.js';

  // Both help sections render unconditionally. The warning under the
  // reverse-proxy toggle explicitly points users to either option (trust
  // the cert OR run a local server), so both need to be reachable from
  // any source selection.

  const APACHE_CONF = `# Load necessary modules
LoadModule headers_module libexec/apache2/mod_headers.so

# Run Apache as your user so it can read your home directory
User YOUR_MAC_USER_NAME
Group staff

# Listen on port 18000
Listen 18000

<VirtualHost *:18000>
    Header always set Access-Control-Allow-Origin "*"
    Alias /videos "/Users/YOUR_MAC_USER_NAME/Library/Application Support/com.apple.wallpaper/aerials/videos"

    <Directory "/Users/YOUR_MAC_USER_NAME/Library/Application Support/com.apple.wallpaper/aerials/videos">
        Options +Indexes
        Require all granted
    </Directory>
</VirtualHost>`;
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
    <ol class="list-decimal space-y-3 pl-5">
      <li>{t('video_local_step1')}</li>
      <li>
        {t('video_local_step2')}
        <pre
          class="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 font-mono text-xs leading-relaxed text-slate-100">{APACHE_CONF}</pre>
      </li>
      <li>
        {t('video_local_step3')}
        <pre
          class="mt-2 overflow-x-auto rounded-md bg-slate-900 p-2 font-mono text-xs text-slate-100">sudo ln -s /path/to/videoserver.conf /private/etc/apache2/other</pre>
      </li>
      <li>
        {t('video_local_step4')}
        <pre
          class="mt-2 overflow-x-auto rounded-md bg-slate-900 p-2 font-mono text-xs text-slate-100">sudo apachectl restart</pre>
      </li>
      <li>
        {t('video_local_step5_pre')}
        <code class="rounded bg-slate-200 px-1 py-0.5 font-mono text-xs"
          >http://localhost:18000/videos/</code
        >
        {t('video_local_step5_post')}
      </li>
    </ol>
  </div>
</details>

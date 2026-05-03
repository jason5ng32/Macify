<script>
  import { settings } from '../lib/settings.svelte.js';
  import { t, resolveLanguage } from '../lib/i18n.svelte.js';
  import { nextQuote } from '../lib/quotes.js';
  import { translate, appLangToBcp47 } from '../lib/translate.js';

  let quote = $state(null);
  let displayContent = $state('');
  let visible = $state(true);

  async function refresh() {
    visible = false;
    await new Promise((r) => setTimeout(r, 300));
    quote = nextQuote(quote?.content);
    visible = true;
  }

  $effect(() => {
    if (settings.showMotto && !quote) {
      quote = nextQuote();
    }
  });

  // Translate quote content to the user's UI language when the user
  // has explicitly opted in (translateMotto setting) AND Chrome's
  // built-in Translator API is available. Author stays original
  // (proper noun). Falls back silently to the English text.
  $effect(() => {
    if (!quote) {
      displayContent = '';
      return;
    }
    // Show original immediately so we never block on translation.
    displayContent = quote.content;
    if (!settings.translateMotto) return;
    const bcp47 = appLangToBcp47(resolveLanguage(settings.userLanguage));
    if (bcp47 === 'en') return;
    const localQuote = quote;
    translate(quote.content, bcp47).then((translated) => {
      // Guard against the user clicking refresh mid-flight.
      if (quote === localQuote) displayContent = translated;
    });
  });
</script>

{#if settings.showMotto && quote}
  <div
    role="button"
    tabindex="0"
    title={t('motto_refresh_hint')}
    aria-label={t('motto_refresh_hint')}
    onclick={refresh}
    onkeydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        refresh();
      }
    }}
    class="mx-auto max-w-2xl px-6 text-center text-white
           cursor-pointer select-none
           [text-shadow:0_2px_8px_rgba(0,0,0,0.55)]
           transition-opacity duration-300 ease-in-out"
    style:opacity={visible ? 1 : 0}
  >
    <p class="text-lg font-light italic leading-relaxed">{displayContent}</p>
    <p class="mt-2 text-sm font-light opacity-70">— {quote.author}</p>
  </div>
{/if}

<script>
  import screenshotUrl from '../../docs/screenshot.png';

  const chromeStoreUrl =
    'https://chromewebstore.google.com/detail/macify-macos-screensaver/lgdipcalomggcjkohjhkhkbcpgladnoe';
  const githubUrl = 'https://github.com/jason5ng32/Macify';

  const features = [
    {
      title: 'macOS Aerial videos',
      text: 'A curated 4K SDR Aerial catalog for a new tab that feels open, quiet, and alive.',
    },
    {
      title: 'Live weather',
      text: 'Current conditions, forecast, sunrise, sunset, wind, UV, and air quality through Open-Meteo.',
    },
    {
      title: 'Top sites',
      text: "Fast access to Chrome's built-in most-visited list without asking for browsing history.",
    },
    {
      title: 'Random quotes',
      text: 'A calm center point for each new tab, drawn from a public-domain quote set.',
    },
    {
      title: 'Zen mode',
      text: 'Fullscreen Aerial video with optional ambient music when you want a short visual reset.',
    },
    {
      title: 'Four languages',
      text: 'English, Simplified Chinese, Traditional Chinese, and Japanese are built in.',
    },
  ];

  const trustItems = [
    {
      label: 'No history permission',
      detail: 'Macify uses Chrome top sites instead of reading your browsing history.',
    },
    {
      label: 'No weather API key',
      detail: 'Weather runs on Open-Meteo, so there is no account setup or secret key.',
    },
    {
      label: 'Small permission set',
      detail: 'Storage, top sites, favicon, and idle are the only requested permissions.',
    },
  ];

  const sources = [
    {
      name: 'Apple Server',
      summary: 'The default path streams Aerial videos from Apple, with an optional Cloudflare proxy for certificate handling.',
    },
    {
      name: 'Cloudflare proxy',
      summary: 'A Worker can proxy Apple Aerial requests and share the same host as other Macify media assets.',
    },
    {
      name: 'Local server',
      summary: 'macOS users can host downloaded Aerial videos locally for the fastest and most private playback.',
    },
  ];
</script>

<svelte:head>
  <link rel="canonical" href="https://macify.candobear.com/" />
</svelte:head>

<header class="site-nav" aria-label="Primary navigation">
  <a class="brand" href="#top" aria-label="Macify home">
    <span class="brand-mark">M</span>
    <span>Macify</span>
  </a>
  <nav>
    <a href="#features">Features</a>
    <a href="#privacy">Privacy</a>
    <a href="#sources">Video sources</a>
  </nav>
</header>

<main id="top">
  <section class="hero" aria-labelledby="hero-title">
    <img class="hero-image" src={screenshotUrl} alt="Macify new tab showing an aerial tea garden background with time, quote, and weather widgets." />
    <div class="hero-shade"></div>
    <div class="hero-content">
      <p class="availability">Chrome Extension</p>
      <h1 id="hero-title">Macify</h1>
      <p class="hero-copy">
        Turn Chrome's new tab into a calm macOS Aerial screen with weather, top sites,
        quotes, and Zen mode.
      </p>
      <div class="hero-actions" aria-label="Primary actions">
        <a class="button primary" href={chromeStoreUrl}>Install from Chrome Web Store</a>
        <a class="button secondary" href={githubUrl}>View on GitHub</a>
      </div>
    </div>
  </section>

  <section class="intro-band" aria-label="Macify summary">
    <p>Macify keeps the new tab useful, quiet, and visually spacious.</p>
    <p>macOS is not required. Any Chrome user can install it.</p>
  </section>

  <section id="features" class="section features-section" aria-labelledby="features-title">
    <div class="section-heading">
      <h2 id="features-title">A new tab that feels less like a dashboard.</h2>
      <p>Everything on screen has a reason to be there. Nothing asks for attention unless you ask for it.</p>
    </div>
    <div class="feature-grid">
      {#each features as feature}
        <article class="feature-card">
          <h3>{feature.title}</h3>
          <p>{feature.text}</p>
        </article>
      {/each}
    </div>
  </section>

  <section id="privacy" class="section trust-section" aria-labelledby="privacy-title">
    <div class="section-heading">
      <h2 id="privacy-title">Useful without being nosy.</h2>
      <p>Macify stays intentionally light on permissions and external dependencies.</p>
    </div>
    <div class="trust-list">
      {#each trustItems as item}
        <article>
          <span>{item.label}</span>
          <p>{item.detail}</p>
        </article>
      {/each}
    </div>
  </section>

  <section id="sources" class="section sources-section" aria-labelledby="sources-title">
    <div class="section-heading">
      <h2 id="sources-title">Choose the video path that fits you.</h2>
      <p>Start with the default Apple source, then move to Cloudflare or local hosting when you want more control.</p>
    </div>
    <div class="source-steps">
      {#each sources as source, index}
        <article>
          <span class="step-number">{String(index + 1).padStart(2, '0')}</span>
          <div>
            <h3>{source.name}</h3>
            <p>{source.summary}</p>
          </div>
        </article>
      {/each}
    </div>
  </section>

  <section class="final-cta" aria-labelledby="final-title">
    <h2 id="final-title">Make every new tab feel like a short visual reset.</h2>
    <a class="button primary" href={chromeStoreUrl}>Install Macify</a>
  </section>
</main>

<footer class="site-footer">
  <p>MIT licensed. Created by Jason Ng, Dofy, and Setilis. Aerial videos are © Apple Inc.</p>
  <div>
    <a href={githubUrl}>GitHub</a>
    <a href={chromeStoreUrl}>Chrome Web Store</a>
    <a href="#privacy">Privacy and permissions</a>
  </div>
</footer>

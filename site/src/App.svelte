<script>
  const chromeStoreUrl =
    'https://chromewebstore.google.com/detail/macify-macos-screensaver/lgdipcalomggcjkohjhkhkbcpgladnoe';
  const githubUrl = 'https://github.com/jason5ng32/Macify';
  const heroVideoUrl = 'https://media.macify.candobear.com/hero/palau-jellies-4k.mov';
  const heroPosterUrl = 'https://media.macify.candobear.com/hero/palau-jellies-poster.jpg';

  let heroVideoFailed = false;

  const features = [
    {
      title: 'Aerial films',
      text: '4K scenes from the macOS Aerial collection, made for a quieter tab.',
    },
    {
      title: 'Weather at a glance',
      text: 'Temperature, forecast, sunrise, wind, UV, and air quality. No API key.',
    },
    {
      title: 'Your top sites',
      text: "Chrome's most-visited sites, without asking for your browsing history.",
    },
    {
      title: 'A quiet thought',
      text: 'A simple quote in the middle of the screen. Nothing more.',
    },
    {
      title: 'Zen mode',
      text: 'Let the video fill the screen, with optional ambient sound.',
    },
    {
      title: 'Four languages',
      text: 'English, Simplified Chinese, Traditional Chinese, and Japanese.',
    },
  ];

  const trustItems = [
    {
      label: 'No browsing history',
      detail: 'Macify uses Chrome top sites. It does not ask to read your history.',
    },
    {
      label: 'No weather API key',
      detail: 'Weather runs on Open-Meteo, with no account setup or secret key.',
    },
    {
      label: 'Only what it needs',
      detail: 'Storage, top sites, favicon, and idle are the only permissions.',
    },
  ];

  const sources = [
    {
      name: 'Apple Server',
      summary: 'Stream Aerial videos from Apple by default.',
    },
    {
      name: 'Cloudflare proxy',
      summary: 'Use a Worker proxy when you want a shared media host.',
    },
    {
      name: 'Local server',
      summary: 'Play downloaded Aerial videos from your own Mac.',
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
  <section class:video-failed={heroVideoFailed} class="hero" aria-labelledby="hero-title">
    <video
      class="hero-video"
      src={heroVideoUrl}
      poster={heroPosterUrl}
      autoplay
      muted
      loop
      playsinline
      preload="metadata"
      aria-hidden="true"
      onerror={() => (heroVideoFailed = true)}
    ></video>
    <img class="hero-poster-fallback" src={heroPosterUrl} alt="" aria-hidden="true" />
    <div class="hero-shade"></div>
    <div class="macify-scene" aria-label="Macify new tab preview with Palau Jellies video, weather, quote, and quick controls.">
      <div class="scene-location">
        <span>Palau Jellies</span>
        <small>Underwater</small>
      </div>

      <div class="scene-weather" aria-label="Sunny, 25 degrees, feels like 22 degrees.">
        <span class="weather-sun" aria-hidden="true"></span>
        <span class="weather-temp">25°</span>
        <small>Feels like 22°</small>
      </div>

      <div class="scene-center">
        <svg class="sky-arc" viewBox="0 0 420 128" role="img" aria-label="Sun path chart">
          <path class="arc-fill" d="M20 86 C118 86 133 24 210 24 C287 24 302 86 400 86" />
          <path class="arc-line active" d="M20 86 C118 86 133 24 210 24 C287 24 302 86 400 86" />
          <path class="arc-line soft" d="M20 86 C108 86 138 72 210 86 C282 100 312 86 400 86" />
          <path class="arc-line soft" d="M72 86 L210 24 L348 86" />
          <line class="arc-axis" x1="20" y1="86" x2="400" y2="86" />
          <line class="arc-axis vertical" x1="210" y1="24" x2="210" y2="110" />
          <circle class="arc-node" cx="210" cy="86" r="8" />
          <circle class="arc-node active" cx="210" cy="24" r="5" />
          <text x="210" y="14" text-anchor="middle">12:23</text>
        </svg>
        <blockquote>
          <p>To enjoy life, we must touch much of it lightly.</p>
          <cite>Voltaire</cite>
        </blockquote>
      </div>

    </div>

    <div class="hero-content">
      <h1 id="hero-title">Macify</h1>
      <p class="hero-copy">
        Bring the Mac screensaver to every new tab.
      </p>
      <div class="hero-actions" aria-label="Primary actions">
        <a class="button primary" href={chromeStoreUrl}>Install from Chrome Web Store</a>
        <a class="button secondary" href={githubUrl}>View on GitHub</a>
      </div>
    </div>
  </section>

  <section class="intro-band" aria-label="Macify summary">
    <p>Open a tab. See the world.</p>
    <p>Weather, sites, and quotes stay close. Never in the way.</p>
  </section>

  <section id="features" class="section features-section" aria-labelledby="features-title">
    <div class="section-heading">
      <h2 id="features-title" class="split-title">
        <span>Everything you need.</span>
        <span>Nothing in the way.</span>
      </h2>
      <p>Aerial video leads. The small tools stay quiet until you need them.</p>
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
      <h2 id="privacy-title">Your browsing stays yours.</h2>
      <p>Macify keeps permissions light and avoids unnecessary accounts, keys, and tracking.</p>
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
      <h2 id="sources-title">Play it your way.</h2>
      <p>Stream from Apple, proxy through Cloudflare, or use local files on your Mac.</p>
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
    <h2 id="final-title" class="split-title">
      <span>Open a new tab.</span>
      <span>Take a breath.</span>
    </h2>
    <a class="button primary" href={chromeStoreUrl}>Macify your Chrome, now!</a>
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

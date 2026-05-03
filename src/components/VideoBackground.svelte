<script>
  import IconRefresh from '~icons/mingcute/refresh-1-line';
  import { settings } from '../lib/settings.svelte.js';
  import { t } from '../lib/i18n.svelte.js';
  import {
    getPlaylist,
    refreshLocalPlaylist,
    reportAppleProxyFailure,
    isAppleProxyFailed,
  } from '../lib/video-source.js';

  let urls = $state([]);
  let currentIndex = $state(-1);
  let opacity = $state(0);
  let errorMessage = $state('');
  let consecutiveErrors = 0;
  let proxyFallbackUsedThisLoad = false;

  const currentUrl = $derived(currentIndex >= 0 ? urls[currentIndex] : '');

  async function loadPlaylist({ forceRefresh = false } = {}) {
    errorMessage = '';
    proxyFallbackUsedThisLoad = false;
    try {
      const result =
        forceRefresh && settings.videoSrc === 'local'
          ? await refreshLocalPlaylist(settings.videoSourceUrl)
          : await getPlaylist({
              videoSrc: settings.videoSrc,
              videoSourceUrl: settings.videoSourceUrl,
              reverseProxy: settings.reverseProxy,
            });
      urls = result.urls;
      if (urls.length === 0) {
        errorMessage =
          settings.videoSrc === 'local'
            ? t('error_video_local_empty')
            : t('error_video_apple');
        return;
      }
      currentIndex = Math.floor(Math.random() * urls.length);
      opacity = 0;
    } catch (e) {
      console.error('Playlist load failed:', e);
      errorMessage =
        settings.videoSrc === 'local'
          ? t('error_video_local')
          : t('error_video_apple');
    }
  }

  $effect(() => {
    settings.videoSrc;
    settings.videoSourceUrl;
    settings.reverseProxy;
    loadPlaylist();
  });

  function nextVideo() {
    if (urls.length === 0) return;
    opacity = 0;
    setTimeout(() => {
      currentIndex = (currentIndex + 1) % urls.length;
    }, 650);
  }

  // Bumped on every refresh-button click; used as a {#key} so the
  // icon re-mounts and its CSS animation restarts each press.
  let refreshSpinTick = $state(0);

  function onRefreshClick() {
    refreshSpinTick++;
    nextVideo();
  }

  function onCanPlay() {
    opacity = 1;
    consecutiveErrors = 0;
  }

  function onError() {
    console.warn('Video error on:', currentUrl);
    consecutiveErrors++;

    if (
      settings.videoSrc === 'apple' &&
      settings.reverseProxy &&
      !isAppleProxyFailed() &&
      !proxyFallbackUsedThisLoad
    ) {
      proxyFallbackUsedThisLoad = true;
      reportAppleProxyFailure();
      console.info('Apple proxy worker failing, falling back to direct sylvan.apple.com');
      loadPlaylist();
      return;
    }

    if (consecutiveErrors <= 3 && urls.length > 1) {
      nextVideo();
      return;
    }

    errorMessage =
      settings.videoSrc === 'local'
        ? t('error_video_local')
        : t('error_video_apple');
  }
</script>

{#if errorMessage}
  <div class="error-box">{errorMessage}</div>
{/if}

{#if currentUrl}
  {#key currentUrl}
    <video
      src={currentUrl}
      autoplay
      muted
      style:opacity={opacity}
      oncanplay={onCanPlay}
      onended={nextVideo}
      onerror={onError}
    ></video>
  {/key}
{/if}

{#if settings.refreshButton}
  <button
    type="button"
    class="cursor-pointer fixed bottom-6 right-6 z-40 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-white/15 text-white shadow-md backdrop-blur-md transition hover:bg-white/25"
    onclick={onRefreshClick}
    title={t('refresh_video')}
    aria-label={t('refresh_video')}
  >
    {#key refreshSpinTick}
      <IconRefresh
        class={refreshSpinTick > 0
          ? 'h-4.5 w-4.5 animate-[spin_0.5s_ease-in-out]'
          : 'h-4.5 w-4.5'}
      />
    {/key}
  </button>
{/if}

<style>
  video {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    object-fit: cover;
    transition: opacity 0.6s ease-in-out;
    z-index: -1;
    background: #000;
  }
  .error-box {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.75rem 1.25rem;
    max-width: 80vw;
    background: rgba(180, 0, 0, 0.7);
    color: #fff;
    border-radius: 6px;
    font-size: 0.9rem;
    z-index: 100;
    backdrop-filter: blur(8px);
    text-align: center;
  }
</style>

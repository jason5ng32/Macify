<script>
  const version = chrome.runtime.getManifest().version;
</script>

<main>
  <h1>Macify Settings</h1>
  <p class="version">Version {version}</p>
  <p class="placeholder">
    Settings UI will be implemented in Phase 02 Section H.
  </p>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #f8f8f8;
    color: #222;
    font-family: system-ui, sans-serif;
  }
  main {
    max-width: 720px;
    margin: 4rem auto;
    padding: 0 2rem;
  }
  h1 {
    margin-top: 0;
  }
  .version {
    opacity: 0.5;
    font-size: 0.9rem;
  }
  .placeholder {
    margin-top: 2rem;
    padding: 1rem;
    background: #fff;
    border: 1px dashed #ccc;
    border-radius: 6px;
  }
</style>

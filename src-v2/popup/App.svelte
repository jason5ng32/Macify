<script>
  const buildTime = new Date().toLocaleString();
</script>

<main>
  <h1>Hello Macify v2</h1>
  <p>New tab page bootstrap. Built at {buildTime}.</p>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #111;
    color: #eee;
    font-family: system-ui, sans-serif;
  }
  main {
    min-height: 100vh;
    display: grid;
    place-items: center;
    text-align: center;
  }
  h1 {
    font-size: 2.5rem;
    margin: 0 0 0.5rem;
  }
  p {
    opacity: 0.6;
  }
</style>

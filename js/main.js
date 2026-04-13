/* ============================================
   MAIN - Bootstraps the app.
   Runs before Alpine starts (this file is loaded
   before alpinejs in index.html), so we attach
   our own listener on `alpine:init` to kick off
   config loading, then show the home screen.
   ============================================ */

document.addEventListener('alpine:init', () => {
  const app = Alpine.store('app');

  // Service worker (PWA)
  //
  // Localhost: unregister any stale SW and skip registration. The SW
  //   caches aggressively; during dev we always want fresh files.
  // Production: register with updateViaCache:'none' so the browser
  //   never serves sw.js from HTTP cache — every visit re-validates it
  //   against the server, which is how a deploy gets detected. Also
  //   poke update() when the tab becomes visible again so returning
  //   users pick up new deploys without a hard reload.
  if ('serviceWorker' in navigator) {
    const isLocal =
      location.hostname === 'localhost' ||
      location.hostname === '127.0.0.1';

    if (isLocal) {
      navigator.serviceWorker.getRegistrations()
        .then(regs => regs.forEach(r => r.unregister()))
        .catch(() => {});
    } else {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .catch(() => { /* ignore */ });
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          navigator.serviceWorker.getRegistration()
            .then(r => r && r.update())
            .catch(() => {});
        }
      });
    }
  }

  // Try to lock orientation to portrait. Support varies:
  //   • Installed PWA on Android → works
  //   • Installed PWA on iOS 16+ → the manifest handles it
  //     (the API itself often throws NotSupportedError)
  //   • Plain browser tab → throws (lock requires fullscreen);
  //     the CSS `.orientation-lock` overlay covers this case
  // The silent catch keeps us from spamming the console on failure.
  try {
    if (screen.orientation && typeof screen.orientation.lock === 'function') {
      screen.orientation.lock('portrait').catch(() => {});
    }
  } catch {}

  // Boot after Alpine fires its 'init' event so stores exist.
  queueMicrotask(async () => {
    try {
      await ConfigLoader.loadAll();
      app.ready = true;
      app.showScreen('home');
    } catch (err) {
      console.error('App init failed:', err);
      const el = document.querySelector('.loading-text');
      if (el) el.textContent = 'Erro ao carregar. Recarregue a página.';
    }
  });
});

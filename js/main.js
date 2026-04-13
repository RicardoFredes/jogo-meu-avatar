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
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
  }

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

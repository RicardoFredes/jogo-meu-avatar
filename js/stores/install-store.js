/* ============================================
   INSTALL STORE - PWA install prompt state
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.store('install', {
    available: false,
    _deferredPrompt: null,

    register() {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this._deferredPrompt = e;
        this.available = true;
      });
      window.addEventListener('appinstalled', () => {
        this.available = false;
        this._deferredPrompt = null;
      });
    },

    async prompt() {
      if (!this._deferredPrompt) return;
      this._deferredPrompt.prompt();
      const result = await this._deferredPrompt.userChoice;
      if (result.outcome === 'accepted') this.available = false;
      this._deferredPrompt = null;
    },
  });

  // Hook the browser listener as soon as Alpine is up
  Alpine.store('install').register();
});

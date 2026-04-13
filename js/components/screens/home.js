/* ============================================
   HOME SCREEN - Gallery of saved characters.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('homeScreen', () => ({
    characters: [],
    thumbnails: {},

    init() {
      this.load();
      // Reload whenever the screen becomes active again.
      this.$watch('$store.app.screen', (screen) => {
        if (screen === 'home') this.load();
      });
    },

    load() {
      this.characters = Storage.getCharacters();
      this.characters.forEach(char => {
        if (!this.thumbnails[char.id]) {
          Renderer.renderToDataURL(char, 130).then(url => {
            if (url) this.thumbnails = { ...this.thumbnails, [char.id]: url };
          });
        }
      });
    },

    get isEmpty() { return this.characters.length === 0; },

    startNewCharacter() {
      Alpine.store('app').closeMenu();
      Alpine.store('app').showScreen('creator');
      Alpine.store('character').initForCreator(null);
    },

    openCharacter(id) {
      Alpine.store('app').openFullscreen(id);
    },

    async resetData() {
      const ok = await Alpine.store('app').confirm('Apagar todos os personagens salvos?', {
        confirmLabel: 'Apagar',
        cancelLabel: 'Cancelar',
      });
      if (ok) {
        localStorage.clear();
        location.reload();
      }
    },
  }));
});

/* ============================================
   HOME SCREEN - Gallery of saved characters.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('homeScreen', () => ({
    characters: [],
    thumbnails: {},
    _fingerprints: {},

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
        // Fingerprint the visual state so thumbnails refresh after edits
        // (body shape, skin color, parts, outfit).
        const fp = JSON.stringify({ b: char.body, p: char.parts, o: char.outfit });
        if (!this.thumbnails[char.id] || this._fingerprints[char.id] !== fp) {
          this._fingerprints[char.id] = fp;
          const charId = char.id;
          Renderer.renderToDataURL(char, 130).then(url => {
            if (url) this.thumbnails = { ...this.thumbnails, [charId]: url };
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

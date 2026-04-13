/* ============================================
   FULLSCREEN VIEW - Big character preview from
   the home gallery with dress/edit/delete actions.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('fullscreenView', () => ({
    get charId() { return Alpine.store('app').fullscreenCharId; },
    get char() { return this.charId ? Storage.getCharacter(this.charId) : null; },
    get open() { return !!this.charId; },
    get name() { return this.char?.name || 'Sem nome'; },

    // Preview uses bgData (static, not reactive to the store)
    previewData() { return this.char; },

    close() { Alpine.store('app').closeFullscreen(); },

    dress() {
      const id = this.charId;
      this.close();
      Alpine.store('app').showScreen('wardrobe');
      Alpine.store('character').initForWardrobe(id);
      DragDrop.initDropZone();
    },

    edit() {
      const id = this.charId;
      this.close();
      Alpine.store('app').showScreen('creator');
      Alpine.store('character').initForCreator(id);
    },

    async del() {
      const id = this.charId;
      const c = this.char;
      const ok = await Alpine.store('app').confirm(
        'Apagar ' + (c?.name || 'personagem') + '?'
      );
      if (ok) {
        Storage.deleteCharacter(id);
        this.close();
        // The home screen's $watch will refresh the gallery automatically
        Alpine.store('app').showScreen('home');
      }
    },
  }));
});

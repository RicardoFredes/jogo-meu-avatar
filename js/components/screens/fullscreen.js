/* ============================================
   FULLSCREEN VIEW - Look gallery for a single
   character. Opened by tapping a character on
   the home screen.

   The kid picks:
     - an existing saved look → jumps into the
       studio with that outfit pre-loaded
     - "+ Novo Look" → jumps into the studio
       with an empty outfit, same body
     - 🗑️ → deletes the character entirely
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('fullscreenView', () => ({
    lookThumbnails: {},
    baseThumbnail: null,

    get charId() { return Alpine.store('app').fullscreenCharId; },
    get char() { return this.charId ? Storage.getCharacter(this.charId) : null; },
    get open() { return !!this.charId; },
    get name() { return this.char?.name || 'Sem nome'; },
    get savedOutfits() { return this.char?.savedOutfits || []; },

    close() {
      Alpine.store('app').closeFullscreen();
      // Drop per-character caches so the next fullscreen session
      // doesn't show stale thumbs if the user edits a look.
      this.lookThumbnails = {};
      this.baseThumbnail = null;
    },

    // ---- Thumbnails (async, reactive cache) ----

    // Thumbnail of the character with NO outfit — shown on the
    // "Novo Look" card so the kid recognizes whose looks these are.
    async ensureBaseThumb() {
      if (this.baseThumbnail) return this.baseThumbnail;
      const char = this.char;
      if (!char) return null;
      const copy = JSON.parse(JSON.stringify(char));
      copy.outfit = {};
      const url = await Renderer.renderToDataURL(copy, 160);
      if (url) this.baseThumbnail = url;
      return url;
    },

    async thumbForLook(lookId) {
      if (this.lookThumbnails[lookId]) return this.lookThumbnails[lookId];
      const char = this.char;
      if (!char) return null;
      const look = (char.savedOutfits || []).find(o => o.id === lookId);
      if (!look) return null;
      const copy = JSON.parse(JSON.stringify(char));
      copy.outfit = look.outfit;
      const url = await Renderer.renderToDataURL(copy, 160);
      if (url) this.lookThumbnails = { ...this.lookThumbnails, [lookId]: url };
      return url;
    },

    // ---- Navigation ----

    // Edit a saved look: open the studio with that outfit loaded.
    editLook(lookId) {
      const id = this.charId;
      this.close();
      Alpine.store('app').showScreen('studio');
      Alpine.store('character').initForStudio(id);
      Alpine.store('character').loadLook(lookId);
    },

    // Create a new look: open the studio on the character with an
    // empty outfit. The kid dresses it up from scratch and can save
    // when done via the studio's "Salvar Look" action.
    createNew() {
      const id = this.charId;
      this.close();
      Alpine.store('app').showScreen('studio');
      Alpine.store('character').initForStudio(id);
      Alpine.store('character').clearOutfit();
    },

    // Edit the character itself (body/face/hair). Kept as a subtle
    // action, since looks are the primary interaction on this screen.
    editCharacter() {
      const id = this.charId;
      this.close();
      Alpine.store('app').showScreen('creator');
      Alpine.store('character').initForCreator(id);
    },

    async del() {
      const c = this.char;
      const ok = await Alpine.store('app').confirm(
        'Apagar ' + (c?.name || 'personagem') + '?'
      );
      if (!ok) return;
      Storage.deleteCharacter(this.charId);
      this.close();
      Alpine.store('app').showScreen('home');
    },

    async deleteLook(lookId, event) {
      if (event) event.stopPropagation();
      const ok = await Alpine.store('app').confirm('Apagar este look?');
      if (!ok) return;
      Storage.deleteOutfit(this.charId, lookId);
      // Drop the cached thumb
      const cp = { ...this.lookThumbnails };
      delete cp[lookId];
      this.lookThumbnails = cp;
    },
  }));
});

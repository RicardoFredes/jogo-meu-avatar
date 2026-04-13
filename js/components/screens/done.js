/* ============================================
   DONE SCREEN - Post-creation confirmation.
   (Currently the flow jumps directly into the
   studio after creation, but this is kept as a
   first-class screen for future use.)
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('doneScreen', () => ({
    get name() { return Alpine.store('character').data?.name || 'Sua personagem'; },
    get message() { return `${this.name} está pronta para novas aventuras!`; },

    goHome() { Alpine.store('app').showScreen('home'); },
    goStudio() {
      const char = Alpine.store('character').data;
      if (!char || !char.id) return;
      Alpine.store('app').showScreen('studio');
      Alpine.store('character').initForStudio(char.id);
    },
  }));
});

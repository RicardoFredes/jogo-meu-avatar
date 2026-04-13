/* ============================================
   STEP DOTS - Creator step indicator.
   Derives everything from the character store.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('stepDots', () => ({
    get steps() { return Alpine.store('character').steps; },
    get current() { return Alpine.store('character').currentStep; },

    stateFor(index) {
      if (index === this.current) return 'active';
      if (index < this.current) return 'done';
      return '';
    },
  }));
});

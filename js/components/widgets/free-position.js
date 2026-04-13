/* ============================================
   FREE POSITION - Arrow/scale controls for items
   that support user repositioning (e.g. some
   accessories). Driven entirely by the character
   store.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('freePosition', ({ getCategoryIds = () => [] } = {}) => ({
    get categoryIds() { return getCategoryIds(); },

    // Find the slot (if any) in the current tab that supports free positioning
    // AND has an equipped item.
    get freeSlot() {
      // Subscribe to Catalog readiness (not reactive on its own).
      Alpine.store('app').ready;

      const data = Alpine.store('character').data;
      if (!data) return null;
      for (const catId of this.categoryIds) {
        const cat = Catalog.getCategory(catId);
        if (!cat || !cat.freePosition) continue;
        const equipped = data.outfit?.[cat.slotId];
        if (equipped?.itemId) return cat.slotId;
      }
      return null;
    },

    get visible() { return !!this.freeSlot; },

    get scalePercent() {
      const slot = this.freeSlot;
      if (!slot) return '100%';
      const data = Alpine.store('character').data;
      const scale = data?.outfit?.[slot]?.userScale || 1;
      return Math.round(scale * 100) + '%';
    },

    apply(action) {
      const slot = this.freeSlot;
      if (slot) Alpine.store('character').applyFreePos(slot, action);
    },
  }));
});

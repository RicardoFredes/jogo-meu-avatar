/* ============================================
   ITEM GRID - Unified picker for body parts and
   clothing. Used by both the creator (wizard) and
   the studio (tabbed edit/dress-up).

   Props (via x-data):
   - categoryIds: string[]     (which categories to show together)
   - variant: 'option' | 'thumbnail'
       'option'    — used in creator (square tiles, select only)
       'thumbnail' — used in studio (same tiles but draggable). Clearing
                     is done via the optional "Nenhum" tile, not re-click.
   - optional: boolean          (show a "Nenhum" tile that clears the part)
   - showSectionLabels: boolean (label each category when multiple are shown)
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('itemGrid', ({
    // Pass functions for reactive props so the widget re-reads the
    // parent's current value on every render. (x-data is evaluated
    // only once, so plain values would freeze on the first step/tab.)
    getCategoryIds = () => [],
    getOptional = () => false,
    variant = 'thumbnail',
    showSectionLabels = false,
  } = {}) => ({
    variant,
    showSectionLabels,

    get categoryIds() { return getCategoryIds(); },
    get optional() { return getOptional(); },

    get categories() {
      // Subscribe to readiness so the grid re-evaluates once Catalog
      // is loaded (Catalog itself is not reactive).
      Alpine.store('app').ready;

      return this.categoryIds
        .map(id => Catalog.getCategory(id))
        .filter(c => c && c.items.size > 0);
    },

    // Categories that need an inline color bar above their items.
    // (Skip if a shared group already rendered one.)
    isColorBarVisible(cat, catsBefore) {
      if (!cat.colorable || !cat.colorPalette) return false;
      if (cat.slotId === 'pattern' && !Alpine.store('character').hasFullBody) return false;
      if (cat.sharedColorGroup) {
        // Skip if an earlier category in this grid already owns the group
        return !catsBefore.some(c => c.sharedColorGroup === cat.sharedColorGroup);
      }
      // In creator, hair-back renders color, hair-front skips it
      if (cat.category === 'hair-front') return false;
      return true;
    },

    paletteFor(cat) {
      return Catalog.getColorPalette(cat.colorPalette || 'clothing-colors');
    },

    // Items that have a renderable thumbnail. Items without an asset
    // would otherwise show as empty tiles — the "Nenhum" option already
    // covers the no-selection case, so we just hide them.
    itemsOf(cat) {
      return Array.from(cat.items.values())
        .filter(item => !!this.thumbUrl(item))
        .map(item => ({ id: item.id, ...item }));
    },

    thumbUrl(item) {
      return item.thumbnail || item.asset || (item.assets && (item.assets.front || item.assets.main));
    },

    isEquipped(cat, itemId) {
      const store = Alpine.store('character');
      const equipped = store.equipmentFor(cat);
      return equipped?.itemId === itemId;
    },

    isDisabled(cat) {
      return cat.slotId === 'pattern' && !Alpine.store('character').hasFullBody;
    },

    currentColor(cat) {
      return Alpine.store('character').equipmentFor(cat)?.colorId || null;
    },

    isNoneSelected(cat) {
      // The slot object might still exist (keeping a colorId as memory),
      // but if there's no itemId the "Nenhum" tile is the active state.
      const eq = Alpine.store('character').equipmentFor(cat);
      return !eq || !eq.itemId;
    },

    // Whether the "Nenhum" tile should be rendered for this category.
    // Even in an "optional" grid, categories flagged required (face
    // shape, eyes, nose, mouth) must always have something equipped.
    showNone(cat) {
      return this.optional && !cat.required;
    },

    // ---- Actions ----

    selectItem(cat, itemId) {
      const store = Alpine.store('character');
      // Both variants now share the same semantics: click always equips.
      // Clearing is done via the "Nenhum" tile.
      if (cat.type === 'body-part') {
        store.setPartItem(cat.category, itemId);
      } else {
        store.equipItem(itemId, cat);
      }
    },

    clearPart(cat) {
      if (cat.type === 'body-part') {
        Alpine.store('character').clearPart(cat.category);
      } else {
        Alpine.store('character').unequipSlot(cat.slotId, cat);
      }
    },

    pickColor(cat, colorId) {
      Alpine.store('character').setSlotColor(cat, colorId);
    },
  }));
});

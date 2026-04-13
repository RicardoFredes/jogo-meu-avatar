/* ============================================
   CATALOG - Central registry of all loaded items
   ============================================ */

const Catalog = (() => {
  const bodyShapes = new Map();
  const colorPalettes = new Map();
  const categories = new Map(); // categoryId -> { meta, items: Map<itemId, itemData> }
  let uiConfig = null;

  return {
    // Registration
    registerBodyShapes(shapes) {
      shapes.forEach(s => bodyShapes.set(s.id, s));
    },

    registerColorPalettes(palettes) {
      Object.entries(palettes).forEach(([id, colors]) => {
        colorPalettes.set(id, colors);
      });
    },

    registerCategory(data) {
      const items = new Map();
      (data.items || []).forEach(item => items.set(item.id, item));
      categories.set(data.category, {
        category: data.category,
        type: data.type,
        slotId: data.slotId || data.category,
        label: data.label,
        icon: data.icon,
        anchor: data.anchor,
        zIndex: data.zIndex,
        colorable: data.colorable || false,
        colorPalette: data.colorPalette || null,
        skinTint: data.skinTint || false,
        conflicts: data.conflicts || null,
        sharedColorGroup: data.sharedColorGroup || null,
        // Required categories (face shape, eyes, nose, mouth) suppress
        // the "Nenhum" tile — the kid can't unequip them.
        required: data.required || false,
        items,
      });
    },

    setUiConfig(config) {
      uiConfig = config;
    },

    // Queries
    getBodyShape(id) {
      return bodyShapes.get(id) || null;
    },

    getAllBodyShapes() {
      return [...bodyShapes.values()];
    },

    getBodyShapesFiltered(sex, size) {
      return [...bodyShapes.values()].filter(s =>
        (!sex || s.sex === sex) && (!size || s.size === size)
      );
    },

    getColorPalette(id) {
      return colorPalettes.get(id) || [];
    },

    getCategory(categoryId) {
      return categories.get(categoryId) || null;
    },

    getItem(categoryId, itemId) {
      const cat = categories.get(categoryId);
      return cat ? cat.items.get(itemId) : null;
    },

    findItemGlobal(itemId) {
      for (const [catId, cat] of categories) {
        if (cat.items.has(itemId)) {
          return { category: cat, item: cat.items.get(itemId) };
        }
      }
      return null;
    },

    getAllCategories() {
      return [...categories.values()];
    },

    getCategoriesByType(type) {
      return [...categories.values()].filter(c => c.type === type);
    },

    getCategoriesByColorGroup(groupId) {
      if (!groupId) return [];
      return [...categories.values()].filter(c => c.sharedColorGroup === groupId);
    },

    getUiConfig() {
      return uiConfig;
    },
  };
})();

/* ============================================
   CATEGORY TABS - Wardrobe navigation.
   One component, two layouts (sidebar | bottom-bar).

   Props:
   - activeKey:  the current tab key (stringified JSON of category ids)
   - onSelect:   callback(catIds[], label)
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('categoryTabs', ({
    getActiveKey = () => null,
    // Optional override: parent decides the "active" condition per tab.
    // Useful when active state depends on more than just the key
    // (e.g. mobile bar also requires the panel to be open).
    getIsActive = null,
    onSelect,
  } = {}) => ({
    get activeKey() { return getActiveKey(); },

    isActive(tab) {
      if (typeof getIsActive === 'function') return !!getIsActive(tab);
      return tab.key === this.activeKey;
    },

    get tabs() {
      // Subscribe to readiness so this getter re-runs once ConfigLoader
      // finishes (Catalog itself is not reactive — it's a plain Map).
      Alpine.store('app').ready;

      const cfg = Catalog.getUiConfig();
      if (!cfg) return [];
      return (cfg.wardrobeCategories || [])
        .filter(wc => {
          const first = Catalog.getCategory((wc.categories || [wc.category])[0]);
          return !!first;
        })
        .map(wc => {
          const catIds = wc.categories || [wc.category];
          return {
            key: JSON.stringify(catIds),
            catIds,
            label: wc.label,
            icon: wc.icon,
          };
        });
    },

    isActive(tab) { return this.activeKey === tab.key; },

    select(tab) {
      if (typeof onSelect === 'function') onSelect(tab.catIds, tab.label);
    },
  }));
});

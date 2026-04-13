/* ============================================
   CATEGORY TABS - Generic tab navigation.
   One component, multiple sources: the parent
   decides what tabs to render by passing a
   `getTabs` function that returns tab objects.

   Each tab object should include:
     - key    : unique string
     - label  : display text
     - icon   : emoji/glyph
     - plus whatever the caller's onSelect needs
       (e.g. catIds for leaf tabs, groupId for
       group-level tabs)

   Props:
   - getTabs       () => tab[]     (required)
   - getActiveKey  () => string    (optional)
   - getIsActive   (tab) => bool   (optional; overrides default key match)
   - onSelect      (tab) => void   (receives the whole tab object)
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('categoryTabs', ({
    getTabs = () => [],
    getActiveKey = () => null,
    getIsActive = null,
    onSelect,
  } = {}) => ({
    // Touch readiness so getters re-run once ConfigLoader finishes —
    // callers typically read from Catalog, which isn't reactive.
    get tabs() {
      Alpine.store('app').ready;
      return getTabs() || [];
    },

    get activeKey() { return getActiveKey(); },

    isActive(tab) {
      if (typeof getIsActive === 'function') return !!getIsActive(tab);
      return tab.key === this.activeKey;
    },

    select(tab) {
      if (typeof onSelect === 'function') onSelect(tab);
    },
  }));
});

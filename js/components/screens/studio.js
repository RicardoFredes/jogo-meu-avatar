/* ============================================
   STUDIO SCREEN - Unified edit + dress-up view.

   Navigation is two-level:
     Level 0 (groups) — user sees 4 big group
                        buttons (Rosto / Cabelo /
                        Roupa / Acessórios).
     Level 1 (leaves) — after picking a group,
                        the bar shows that group's
                        subcategories plus a Back
                        button. Picking a leaf is
                        what opens the mobile sheet
                        (or populates the desktop
                        items area).

   State is driven by activeGroupId:
     null            → groups level
     'face' etc.     → leaves level for that group

   Focus mode (mobile): when the items panel is open
   we publish a `studio:focus-change` CustomEvent so
   the <focus-zoom> overlay can zoom the preview into
   the region being edited. The mapping from a leaf
   tab to a zoom region + factor lives in ui-config
   (focusRegions + tab.focusRegion + group.defaultFocusRegion).
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('studioScreen', () => ({
    // Navigation
    activeGroupId: null,
    activeTabIds: [],
    activeTabLabel: '',

    // UI state
    mobilePanelOpen: false,

    // Last leaf tab selected. Kept so we can re-resolve the focus
    // region whenever mobilePanelOpen flips (open → active zoom,
    // close → reset), without asking the caller to pass it in again.
    _currentFocusTab: null,

    init() {
      this.$watch('$store.app.screen', (screen) => {
        if (screen === 'studio') this.onEnter();
        else this.onLeave();
      });
    },

    onEnter() {
      // Always start at the groups level so the kid sees the 4 big
      // options first. Nothing auto-selected.
      this.activeGroupId = null;
      this.activeTabIds = [];
      this.activeTabLabel = '';
      this._currentFocusTab = null;
      this._publishFocus();
    },

    onLeave() {
      this.mobilePanelOpen = false;
      const area = document.querySelector('.studio-preview-area');
      if (area) area.classList.remove('panel-open');
      this._currentFocusTab = null;
      this._publishFocus();
    },

    // ---- Level / group model ----

    get currentLevel() {
      return this.activeGroupId ? 'leaves' : 'groups';
    },

    get studioGroups() {
      Alpine.store('app').ready;
      const cfg = Catalog.getUiConfig();
      return (cfg && cfg.studioGroups) || [];
    },

    get activeGroup() {
      return this.studioGroups.find(g => g.id === this.activeGroupId) || null;
    },

    // Tab objects for the groups bar (level 0)
    get groupTabs() {
      return this.studioGroups.map(g => ({
        key: 'group:' + g.id,
        groupId: g.id,
        label: g.label,
        icon: g.icon,
      }));
    },

    // Tab objects for the leaves bar (level 1) — filters out any
    // subcategory whose referenced Catalog category doesn't exist.
    // `focusRegion` is carried through so selectLeaf can publish
    // the right zoom target without re-reading ui-config.
    get leafTabs() {
      const g = this.activeGroup;
      if (!g || !Array.isArray(g.tabs)) return [];
      return g.tabs
        .map(t => {
          const catIds = t.categories || (t.category ? [t.category] : []);
          return { t, catIds };
        })
        .filter(({ catIds }) => {
          const first = catIds[0] && Catalog.getCategory(catIds[0]);
          return !!first;
        })
        .map(({ t, catIds }) => ({
          key: JSON.stringify(catIds),
          catIds,
          label: t.label,
          icon: t.icon,
          focusRegion: t.focusRegion,
        }));
    },

    // ---- Navigation methods ----

    selectGroup(groupId) {
      this.activeGroupId = groupId;
      // Clear any prior leaf selection when switching groups
      this.activeTabIds = [];
      this.activeTabLabel = '';
      this._currentFocusTab = null;
      this.closeMobilePanel();

      // On desktop, pre-select the first leaf so the items area
      // isn't empty — saves the kid one extra click.
      if (window.innerWidth >= 640) {
        const firstLeaf = this.leafTabs[0];
        if (firstLeaf) {
          this.activeTabIds = firstLeaf.catIds;
          this.activeTabLabel = firstLeaf.label;
          this._currentFocusTab = firstLeaf;
        }
      }
    },

    backToGroups() {
      this.activeGroupId = null;
      this.activeTabIds = [];
      this.activeTabLabel = '';
      this._currentFocusTab = null;
      this.closeMobilePanel();
    },

    selectLeaf(tab) {
      this.activeTabIds = tab.catIds;
      this.activeTabLabel = tab.label;
      this._currentFocusTab = tab;
      // On mobile, a leaf click opens the items sheet.
      if (window.innerWidth < 640) this.openMobilePanel();
      else this._publishFocus();
    },

    // Key used by categoryTabs to highlight the active leaf
    get activeKey() { return JSON.stringify(this.activeTabIds); },

    // ---- Mobile panel ----
    openMobilePanel() {
      this.mobilePanelOpen = true;
      const area = document.querySelector('.studio-preview-area');
      if (area) area.classList.add('panel-open');
      this._publishFocus();
    },
    closeMobilePanel() {
      this.mobilePanelOpen = false;
      const area = document.querySelector('.studio-preview-area');
      if (area) area.classList.remove('panel-open');
      this._publishFocus();
    },

    // ---- Focus resolution (region → anchor + zoom) ----

    // Resolve a leaf tab into { region, anchor, zoom } using the
    // focusRegions table in ui-config. Fallback chain:
    //   tab.focusRegion → group.defaultFocusRegion → null.
    _resolveFocus(tab) {
      if (!tab) return { region: null, anchor: null, zoom: 1 };
      const cfg = Catalog.getUiConfig() || {};
      const regions = cfg.focusRegions || {};
      const region = tab.focusRegion
                  || this.activeGroup?.defaultFocusRegion
                  || null;
      const r = region ? regions[region] : null;
      return {
        region: region || null,
        anchor: r?.anchor || null,
        zoom: r?.zoom ?? 1,
      };
    },

    // Dispatch the current focus state. Listeners (focusZoom) decide
    // what to do with it — typically: apply a CSS transform when
    // `active` is true, clear it when false.
    _publishFocus() {
      const { region, anchor, zoom } = this._resolveFocus(this._currentFocusTab);
      window.dispatchEvent(new CustomEvent('studio:focus-change', {
        detail: {
          active: this.mobilePanelOpen,
          region,
          anchor,
          zoom,
        },
      }));
    },

    // ---- Actions ----
    // Every outfit change is auto-persisted into the active saved
    // look by the character store, so the studio no longer needs
    // clear / save / looks-list buttons — those lived on the old
    // chrome and are handled by the fullscreen gallery now.
    // Leaving the studio takes the user to the character's looks
    // gallery (the fullscreen overlay), not all the way back to home.
    // Feels natural because the kid was just editing a look inside
    // that character, so seeing the other looks next is the logical
    // next step. Home sits underneath as the backdrop.
    exit() {
      const charId = Alpine.store('character').id;
      Alpine.store('app').showScreen('home');
      if (charId) Alpine.store('app').openFullscreen(charId);
    },
  }));
});

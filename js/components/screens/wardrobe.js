/* ============================================
   WARDROBE SCREEN - Dress-up view.
   Delegates mutations to the character store and
   category listing to category-tabs/item-grid.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('wardrobeScreen', () => ({
    // Which tab (set of category ids) is currently active
    activeTabIds: [],
    activeTabLabel: '',
    mobilePanelOpen: false,
    looksOpen: false,

    init() {
      this.$watch('$store.app.screen', (screen) => {
        if (screen === 'wardrobe') this.onEnter();
        else this.onLeave();
      });
    },

    onEnter() {
      // Init drag & drop after the screen is shown
      this.$nextTick(() => DragDrop.initDraggables());

      // Select first tab on desktop, leave mobile closed
      const cfg = Catalog.getUiConfig();
      if (cfg && cfg.wardrobeCategories.length > 0 && window.innerWidth >= 640) {
        const first = cfg.wardrobeCategories[0];
        this.activeTabIds = first.categories || [first.category];
        this.activeTabLabel = first.label;
      } else {
        this.activeTabIds = [];
        this.activeTabLabel = '';
      }
    },

    onLeave() {
      this.mobilePanelOpen = false;
      this.looksOpen = false;
      const area = document.querySelector('.wardrobe-preview-area');
      if (area) area.classList.remove('panel-open');
    },

    // ---- Tab selection (wired to <categoryTabs>) ----
    get activeKey() { return JSON.stringify(this.activeTabIds); },

    selectTab(catIds, label) {
      this.activeTabIds = catIds;
      this.activeTabLabel = label;
      this.$nextTick(() => DragDrop.initDraggables());
    },

    selectTabMobile(catIds, label) {
      this.selectTab(catIds, label);
      this.openMobilePanel();
    },

    // ---- Mobile panel ----
    openMobilePanel() {
      this.mobilePanelOpen = true;
      const area = document.querySelector('.wardrobe-preview-area');
      if (area) area.classList.add('panel-open');
      this.$nextTick(() => DragDrop.initDraggables());
    },
    closeMobilePanel() {
      this.mobilePanelOpen = false;
      const area = document.querySelector('.wardrobe-preview-area');
      if (area) area.classList.remove('panel-open');
    },

    // ---- Actions ----
    async exit() {
      Alpine.store('app').showScreen('home');
    },

    async clearOutfit() {
      Alpine.store('character').clearOutfit();
    },

    async promptSaveLook() {
      const name = await Alpine.store('app').prompt('Dê um nome para este look:', {
        placeholder: 'Ex: Princesa',
        confirmLabel: 'Salvar',
      });
      if (name !== null) {
        Alpine.store('character').saveLook(name.trim() || 'Meu Look');
      }
    },

    openLooks() { this.looksOpen = true; },
    closeLooks() { this.looksOpen = false; },

    // ---- Looks sidebar ----
    get savedOutfits() {
      return Alpine.store('character').data?.savedOutfits || [];
    },

    lookThumbnails: {},
    async thumbForLook(lookId) {
      if (this.lookThumbnails[lookId]) return this.lookThumbnails[lookId];
      const data = Alpine.store('character').data;
      if (!data) return null;
      const look = (data.savedOutfits || []).find(o => o.id === lookId);
      if (!look) return null;
      const copy = JSON.parse(JSON.stringify(data));
      copy.outfit = look.outfit;
      const url = await Renderer.renderToDataURL(copy, 75);
      if (url) this.lookThumbnails = { ...this.lookThumbnails, [lookId]: url };
      return url;
    },

    loadLook(id) { Alpine.store('character').loadLook(id); },
    deleteLook(id) {
      Alpine.store('character').deleteLook(id);
      const cp = { ...this.lookThumbnails };
      delete cp[id];
      this.lookThumbnails = cp;
    },
  }));
});

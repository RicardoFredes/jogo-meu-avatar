/* ============================================
   CREATOR SCREEN - Step-by-step character wizard.
   All data lives in the character store; this
   component is mostly UI glue.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('creatorScreen', () => ({
    // Static body-type choices for the basics step
    bodyChoices: [
      { id: 'child', label: 'Criança', icon: '🧒' },
      { id: 'adult', label: 'Adulto',  icon: '🧑' },
    ],

    init() {
      // Open the mobile panel by default (was creator.init's old behavior).
      this.$watch('$store.app.screen', (screen) => {
        if (screen === 'creator') {
          this.$nextTick(() => {
            const panelArea = document.querySelector('.creator-preview-area');
            if (panelArea && window.innerWidth < 640) {
              panelArea.classList.add('panel-open');
            }
          });
        } else if (screen !== 'creator') {
          const panelArea = document.querySelector('.creator-preview-area');
          if (panelArea) panelArea.classList.remove('panel-open');
        }
      });
    },

    // ---- Store shortcuts ----
    get store() { return Alpine.store('character'); },
    get step() { return this.store.currentStepDef; },
    get data() { return this.store.data; },
    get isLast() { return this.store.isLastStep; },
    get isFirst() { return this.store.isFirstStep; },

    // ---- Step-type predicates ----
    get isBasics() { return this.step?.id === 'basics'; },
    get isSkin()   { return this.step?.id === 'skin'; },
    get isReview() { return this.step?.id === 'review'; },
    get isCategoryStep() {
      return !!(this.step && (this.step.dataSource || this.step.dataSources));
    },

    get categoryIdsForStep() {
      if (!this.step) return [];
      return this.step.dataSources || (this.step.dataSource ? [this.step.dataSource] : []);
    },

    // ---- Skin palette ----
    get skinColors() { return Catalog.getColorPalette('skin-tones'); },
    isSkinSelected(id) { return this.data?.body.skinColorId === id; },
    pickSkin(id) { this.store.setSkinColor(id); },

    // ---- Basics ----
    onNameInput(e) { this.store.setName(e.target.value); },
    pickBodyShape(id) { this.store.setBodyShape(id); },
    isShapeSelected(id) { return this.data?.body.shapeId === id; },

    // ---- Navigation ----
    next() { this.store.nextStep(); },
    prev() { this.store.prevStep(); },

    async exit() {
      Alpine.store('app').showScreen('home');
    },
  }));
});

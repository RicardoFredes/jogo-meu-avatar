/* ============================================
   CHARACTER STORE - The reactive source of truth
   for the character being created / dressed up.

   Holds charData and exposes mutations. Creator
   and Wardrobe screens both bind to this store.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.store('character', {
    // Core state (reactive)
    data: null,
    id: null,
    editing: false,

    // Creator-specific state
    steps: [],
    currentStep: 0,

    // ---- Factories ----

    _defaultData() {
      return {
        name: '',
        body: { shapeId: 'child', skinColorId: 'skin-1' },
        parts: {
          'face-shapes': { itemId: 'face-round' },
          eyes: { itemId: 'eyes-round', colorId: 'brown' },
          eyebrows: { itemId: 'brows-thin', colorId: 'dark-brown' },
          noses: { itemId: 'nose-round' },
          mouths: { itemId: 'mouth-smile', colorId: 'natural' },
          // Hair starts empty — the user picks it in the "Cabelo" step.
          'hair-back': null,
          'hair-front': null,
          'facial-hair': null,
          mustache: null,
          extras: null,
        },
        outfit: {},
        savedOutfits: [],
      };
    },

    // ---- Lifecycle ----

    initForCreator(existingCharId = null) {
      const config = Catalog.getUiConfig();
      // Drop category steps with zero items so the wizard stays clean.
      this.steps = config.creationSteps.filter(step => {
        if (step.type === 'review' || step.fields) return true;
        if (step.id === 'skin') return true;
        const sources = step.dataSources || (step.dataSource ? [step.dataSource] : []);
        return sources.some(s => {
          const cat = Catalog.getCategory(s);
          return cat && cat.items.size > 0;
        });
      });
      this.currentStep = 0;

      if (existingCharId) {
        this.editing = true;
        this.id = existingCharId;
        const existing = Storage.getCharacter(existingCharId);
        this.data = existing ? JSON.parse(JSON.stringify(existing)) : this._defaultData();
        // Backfill parts added after the character was first created
        const defaults = this._defaultData();
        for (const [key, val] of Object.entries(defaults.parts)) {
          if (!this.data.parts[key] && val) this.data.parts[key] = val;
        }
        if (!this.data.body.shapeId ||
            this.data.body.shapeId.includes('-female-') ||
            this.data.body.shapeId.includes('-male-')) {
          this.data.body.shapeId = 'child';
        }
      } else {
        this.editing = false;
        this.id = null;
        this.data = this._defaultData();
      }
    },

    initForWardrobe(charId) {
      this.editing = false;
      this.id = charId;
      const existing = Storage.getCharacter(charId);
      this.data = existing ? JSON.parse(JSON.stringify(existing)) : null;
      if (this.data && !this.data.outfit) this.data.outfit = {};
    },

    // ---- Creator step navigation ----

    get isFirstStep() { return this.currentStep === 0; },
    get isLastStep() { return this.currentStep === this.steps.length - 1; },
    get currentStepDef() { return this.steps[this.currentStep]; },

    nextStep() {
      // Auto-assign a name if the user skipped it.
      if (this.currentStep === 0 && !this.data.name.trim()) {
        this.data.name = this._randomName();
      }
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
      } else {
        this._finishCreation();
      }
    },

    prevStep() {
      if (this.currentStep > 0) this.currentStep--;
    },

    _finishCreation() {
      const saved = Storage.saveCharacter(this.data);
      this.id = saved.id;
      this.data = JSON.parse(JSON.stringify(saved));
      if (typeof confetti === 'function') {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
      // Transition straight into the wardrobe for the freshly-made char.
      Alpine.store('app').showScreen('wardrobe');
      this.initForWardrobe(saved.id);
      DragDrop.initDropZone();
    },

    _randomName() {
      const names = [
        'Luna', 'Estrela', 'Flora', 'Aurora', 'Sereia', 'Fada', 'Nuvem',
        'Arco-Íris', 'Borboleta', 'Florzinha', 'Princesa', 'Gatinha',
        'Lila', 'Mel', 'Sol', 'Brilho', 'Pérola', 'Cristal', 'Violeta',
        'Rosa', 'Moranguinho', 'Cerejinha', 'Docinho', 'Pipoca', 'Algodão',
        'Safira', 'Rubi', 'Jade', 'Amora', 'Bela', 'Duda', 'Mia', 'Nina',
      ];
      return names[Math.floor(Math.random() * names.length)];
    },

    // ---- Mutations (all persist automatically) ----

    setName(name) {
      this.data.name = name;
      this._persistCharacter();
    },

    setBodyShape(shapeId) {
      this.data.body.shapeId = shapeId;
      this._persistCharacter();
    },

    setSkinColor(colorId) {
      this.data.body.skinColorId = colorId;
      this._persistCharacter();
    },

    // Pick/replace a body part item
    setPartItem(catId, itemId) {
      if (!this.data.parts[catId]) this.data.parts[catId] = {};
      this.data.parts[catId].itemId = itemId;
      this._persistCharacter();
    },

    // Color a body part, syncing shared groups (e.g. hair front/back)
    setPartColor(catId, colorId) {
      const cat = Catalog.getCategory(catId);
      if (!this.data.parts[catId]) this.data.parts[catId] = {};
      this.data.parts[catId].colorId = colorId;

      const syncIds = cat && cat.sharedColorGroup
        ? Catalog.getCategoriesByColorGroup(cat.sharedColorGroup).map(c => c.category)
        : (catId === 'hair-back' || catId === 'hair-front')
          ? ['hair-back', 'hair-front']
          : [];

      for (const syncId of syncIds) {
        if (this.data.parts[syncId]) this.data.parts[syncId].colorId = colorId;
      }
      this._persistCharacter();
    },

    clearPart(catId) {
      this.data.parts[catId] = null;
      this._persistCharacter();
    },

    // ---- Outfit / wardrobe mutations ----

    equipItem(itemId, cat) {
      if (!cat) {
        const found = Catalog.findItemGlobal(itemId);
        if (!found) return;
        cat = found.category;
      }

      const slotId = cat.slotId;

      // Forward conflicts: remove things this slot can't coexist with.
      for (const conflictSlot of (cat.conflicts || [])) {
        if (this.data.outfit[conflictSlot]) this.data.outfit[conflictSlot] = null;
      }
      // Reverse conflicts: if some equipped item conflicts with THIS slot, unequip it.
      for (const c of Catalog.getAllCategories()) {
        if (c.conflicts && c.conflicts.includes(slotId) && this.data.outfit[c.slotId]) {
          this.data.outfit[c.slotId] = null;
        }
      }

      // Preserve color from previous item in the same slot, or inherit from a shared-group sibling.
      const item = cat.items.get(itemId);
      const isColorable = cat.colorable || (item && item.colorable);
      const paletteId = cat.colorPalette || (item && item.colorPalette) || 'clothing-colors';
      const currentSlotData = cat.type === 'body-part'
        ? this.data.parts?.[cat.category]
        : this.data.outfit[slotId];
      let colorId = currentSlotData?.colorId || null;

      if (!colorId && cat.sharedColorGroup) {
        const siblings = Catalog.getCategoriesByColorGroup(cat.sharedColorGroup);
        for (const sib of siblings) {
          const sibData = this.data.parts?.[sib.category];
          if (sibData?.colorId) { colorId = sibData.colorId; break; }
        }
      }
      if (isColorable && !colorId) {
        const palette = Catalog.getColorPalette(paletteId);
        colorId = palette.length > 0 ? palette[0].id : null;
      }

      // Hair is a body part (lives in .parts), everything else is outfit.
      if (cat.type === 'body-part') {
        this.data.parts[cat.category] = { itemId, colorId };
      } else {
        this.data.outfit[slotId] = { itemId, colorId };
      }
      this._persistCharacter();
    },

    unequipSlot(slotId, cat) {
      if (cat && cat.type === 'body-part') {
        this.data.parts[cat.category] = null;
      } else {
        this.data.outfit[slotId] = null;
        // Patterns are tied to a dress — clear them if we remove the dress.
        if (slotId === 'full-body' && this.data.outfit['pattern']) {
          this.data.outfit['pattern'] = null;
        }
      }
      this._persistCharacter();
    },

    // Set a color on an equipped outfit/body-part. Cat is needed to know
    // where the slot lives and whether it participates in a shared group.
    setSlotColor(cat, colorId) {
      const slotId = cat.slotId;
      if (cat.type === 'body-part') {
        if (!this.data.parts[cat.category]) this.data.parts[cat.category] = {};
        this.data.parts[cat.category].colorId = colorId;
      } else {
        if (!this.data.outfit[slotId]) this.data.outfit[slotId] = {};
        this.data.outfit[slotId].colorId = colorId;
      }
      // Sync color group (e.g. hair-front + hair-back)
      if (cat.sharedColorGroup) {
        const siblings = Catalog.getCategoriesByColorGroup(cat.sharedColorGroup);
        for (const sib of siblings) {
          if (this.data.parts?.[sib.category]) this.data.parts[sib.category].colorId = colorId;
        }
      }
      this._persistCharacter();
    },

    applyFreePos(slotId, action) {
      const slot = this.data.outfit[slotId];
      if (!slot) return;
      if (!slot.userOffset) slot.userOffset = { x: 0, y: 0 };
      if (!slot.userScale) slot.userScale = 1;

      const step = 10;
      const scaleStep = 0.05;
      switch (action) {
        case 'left':    slot.userOffset.x -= step; break;
        case 'right':   slot.userOffset.x += step; break;
        case 'up':      slot.userOffset.y -= step; break;
        case 'down':    slot.userOffset.y += step; break;
        case 'bigger':  slot.userScale = Math.min(2, slot.userScale + scaleStep); break;
        case 'smaller': slot.userScale = Math.max(0.3, slot.userScale - scaleStep); break;
        case 'reset':
          slot.userOffset = { x: 0, y: 0 };
          slot.userScale = 1;
          break;
      }
      this._persistCharacter();
    },

    clearOutfit() {
      this.data.outfit = {};
      this._persistCharacter();
    },

    // ---- Looks ----

    saveLook(name) {
      const outfitCopy = JSON.parse(JSON.stringify(this.data.outfit));
      Storage.saveOutfit(this.id, { name, outfit: outfitCopy });
      // Refresh local data to include the new saved outfit
      this.data = JSON.parse(JSON.stringify(Storage.getCharacter(this.id)));
      if (typeof confetti === 'function') {
        confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
      }
    },

    loadLook(outfitId) {
      const look = (this.data.savedOutfits || []).find(o => o.id === outfitId);
      if (!look) return;
      this.data.outfit = JSON.parse(JSON.stringify(look.outfit));
      this._persistCharacter();
    },

    deleteLook(outfitId) {
      Storage.deleteOutfit(this.id, outfitId);
      this.data = JSON.parse(JSON.stringify(Storage.getCharacter(this.id)));
    },

    // ---- Helpers ----

    // Whether the "pattern" slot should be interactive (only if a dress is equipped)
    get hasFullBody() { return !!this.data?.outfit?.['full-body']?.itemId; },

    // Get what's currently equipped for a category, whether body-part or outfit
    equipmentFor(cat) {
      if (cat.type === 'body-part') return this.data.parts?.[cat.category] || null;
      return this.data.outfit?.[cat.slotId] || null;
    },

    // ---- Persistence ----

    _persistCharacter() {
      if (!this.data) return;
      if (this.id) {
        // Existing character — full save
        Storage.saveCharacter(this.data);
      }
      // For the creator with no ID yet, we just keep state in memory
      // until the user finishes the wizard (then _finishCreation saves).
    },
  });
});

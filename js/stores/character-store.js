/* ============================================
   CHARACTER STORE - The reactive source of truth
   for the character being created / dressed up.

   Holds charData and exposes mutations. Creator
   (wizard) and Studio screens both bind to this store.
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

    // Studio-specific: the look being edited live. Null means "new
    // look mode" — the first outfit mutation lazily creates an entry
    // in savedOutfits and promotes this to its id. Every subsequent
    // mutation mirrors data.outfit into that entry automatically.
    activeLookId: null,

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

    initForStudio(charId) {
      this.editing = false;
      this.id = charId;
      // Reset per-session state: studio is either editing an
      // existing look (set by a follow-up loadLook call) or starting
      // a brand-new look (stays null until the first mutation creates
      // it lazily in _persistCharacter).
      this.activeLookId = null;
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
      // Transition straight into the studio for the freshly-made char.
      Alpine.store('app').showScreen('studio');
      this.initForStudio(saved.id);
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
      // Keep the colorId as "memory" so re-equipping a hair/eyebrow/etc.
      // restores the user's last chosen color instead of falling back
      // to palette[0].
      const prev = this.data.parts[catId];
      this.data.parts[catId] = prev && prev.colorId
        ? { itemId: null, colorId: prev.colorId }
        : null;
      this._persistCharacter();
    },

    // ---- Outfit mutations (studio) ----

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
      // Preserve colorId on unequip so the kid's palette choice is
      // remembered when they equip another item in the same slot.
      const keepColor = (obj) =>
        obj && obj.colorId ? { itemId: null, colorId: obj.colorId } : null;

      if (cat && cat.type === 'body-part') {
        this.data.parts[cat.category] = keepColor(this.data.parts[cat.category]);
      } else {
        this.data.outfit[slotId] = keepColor(this.data.outfit[slotId]);
        // Patterns are tied to a dress — clear them if we remove the dress.
        if (slotId === 'full-body' && this.data.outfit['pattern']) {
          this.data.outfit['pattern'] = keepColor(this.data.outfit['pattern']);
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
      // Track the look we're editing so future outfit mutations sync
      // into it automatically (live auto-save).
      this.activeLookId = outfitId;
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

    // True when the live outfit has at least one equipped item.
    _hasAnyOutfit() {
      const o = this.data?.outfit || {};
      for (const slot of Object.values(o)) {
        if (slot && slot.itemId) return true;
      }
      return false;
    },

    // Lazily materialize a saved-look entry for the current outfit.
    // Called from _persistCharacter when in "new look" mode and the
    // kid has equipped at least one item. Picks an auto-incrementing
    // name so the fullscreen gallery shows something sensible.
    _ensureActiveLook() {
      if (this.activeLookId || !this.data) return;
      if (!Array.isArray(this.data.savedOutfits)) this.data.savedOutfits = [];
      const count = this.data.savedOutfits.length;
      const newLook = {
        id: 'outfit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name: 'Look ' + (count + 1),
        savedAt: new Date().toISOString(),
        outfit: JSON.parse(JSON.stringify(this.data.outfit)),
      };
      this.data.savedOutfits.push(newLook);
      this.activeLookId = newLook.id;
    },

    _persistCharacter() {
      if (!this.data) return;

      // Live auto-save for the studio: the outfit being edited is
      // mirrored into the active saved-look. If we don't have one yet
      // (kid is in "novo look" mode) create it on first real mutation.
      if (!this.activeLookId && this._hasAnyOutfit()) {
        this._ensureActiveLook();
      }
      if (this.activeLookId && Array.isArray(this.data.savedOutfits)) {
        const look = this.data.savedOutfits.find(o => o.id === this.activeLookId);
        if (look) look.outfit = JSON.parse(JSON.stringify(this.data.outfit));
      }

      if (this.id) {
        Storage.saveCharacter(this.data);
      }
      // For the creator with no ID yet, we just keep state in memory
      // until the user finishes the wizard (then _finishCreation saves).
    },
  });
});

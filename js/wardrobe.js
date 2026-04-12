/* ============================================
   WARDROBE - Dress-up screen with drag & drop
   ============================================ */

const Wardrobe = (() => {
  let characterId = null;
  let charData = null;
  let currentCategoryId = null;
  let currentTabCatIds = [];
  let stage = null;

  function init(charId) {
    characterId = charId;
    charData = Storage.getCharacter(charId);
    if (!charData) return;

    // Ensure outfit object exists
    if (!charData.outfit) charData.outfit = {};

    renderCategoryTabs();
    renderCharacter();

    // Select first category tab
    const config = Catalog.getUiConfig();
    if (config.wardrobeCategories.length > 0) {
      const first = config.wardrobeCategories[0];
      selectCategories(first.categories || [first.category]);
    }
  }

  function renderCategoryTabs() {
    const config = Catalog.getUiConfig();
    const tabsContainer = document.getElementById('category-tabs');
    tabsContainer.innerHTML = '';

    config.wardrobeCategories.forEach(wc => {
      // Support single category or array of categories per tab
      const catIds = wc.categories || [wc.category];
      const firstCat = Catalog.getCategory(catIds[0]);
      if (!firstCat) return;

      const tab = document.createElement('button');
      tab.className = 'category-tab';
      tab.dataset.categories = JSON.stringify(catIds);
      tab.innerHTML = `<span class="tab-icon">${wc.icon}</span>${wc.label}`;
      tab.addEventListener('click', () => selectCategories(catIds));
      tabsContainer.appendChild(tab);
    });
  }

  function selectCategories(categoryIds) {
    currentCategoryId = categoryIds[0];
    currentTabCatIds = categoryIds;
    const cats = categoryIds.map(id => Catalog.getCategory(id)).filter(Boolean);
    if (cats.length === 0) return;

    // Update active tab
    document.querySelectorAll('.category-tab').forEach(t => {
      const tabCats = JSON.parse(t.dataset.categories || '[]');
      t.classList.toggle('active', JSON.stringify(tabCats) === JSON.stringify(categoryIds));
    });

    // Render items from all categories in this tab
    renderItemsGridMulti(cats);

    // Color bar for the first equipped item found
    updateColorBarMulti(cats);
  }

  // Keep old API working
  function selectCategory(categoryId) {
    selectCategories([categoryId]);
  }

  function renderItemsGridMulti(cats) {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = '';

    for (const cat of cats) {
      const slotId = cat.slotId;
      const equippedItemId = cat.category === 'hair'
        ? (charData.parts?.hair?.itemId || null)
        : (charData.outfit[slotId]?.itemId || null);

      // Add section label if multiple categories
      if (cats.length > 1) {
        const label = document.createElement('div');
        label.className = 'grid-section-label';
        label.textContent = cat.label;
        label.style.cssText = 'grid-column:1/-1;font-family:var(--font-display);font-size:0.75rem;color:var(--text-secondary);padding:4px 0;margin-top:4px;';
        grid.appendChild(label);
      }

      for (const [itemId, item] of cat.items) {
        const thumb = document.createElement('div');
        thumb.className = 'item-thumbnail' + (equippedItemId === itemId ? ' equipped' : '');
        thumb.dataset.itemId = itemId;
        thumb.dataset.categoryId = cat.category;
        thumb.dataset.slotId = slotId;

        const assetUrl = item.thumbnail || item.asset || (item.assets && (item.assets.front || item.assets.main));
        if (assetUrl) {
          const img = document.createElement('img');
          img.src = assetUrl;
          img.alt = item.name;
          img.draggable = false;
          thumb.appendChild(img);
        } else {
          thumb.textContent = item.name.slice(0, 4);
        }

        thumb.title = item.name;

        thumb.addEventListener('click', () => {
          if (equippedItemId === itemId) {
            unequipSlot(slotId);
          } else {
            equipItem(itemId, cat);
          }
        });

        grid.appendChild(thumb);
      }
    }

    DragDrop.initDraggables();
  }

  function updateColorBarMulti(cats) {
    // Find the first equipped colorable item across all categories
    for (const cat of cats) {
      const slotId = cat.slotId;
      const equipped = cat.category === 'hair'
        ? charData.parts?.hair
        : charData.outfit[slotId];
      if (equipped && equipped.itemId) {
        const item = cat.items.get(equipped.itemId);
        const isColorable = cat.colorable || (item && item.colorable);
        if (isColorable) {
          updateColorBar(cat);
          return;
        }
      }
    }
    document.getElementById('color-bar').classList.add('hidden');
  }

  // Re-render grid only (all categories in current tab)
  function refreshCurrentGrid() {
    const cats = currentTabCatIds.map(id => Catalog.getCategory(id)).filter(Boolean);
    if (cats.length > 0) renderItemsGridMulti(cats);
  }

  // Re-render grid + color bar
  function refreshCurrentTab() {
    const cats = currentTabCatIds.map(id => Catalog.getCategory(id)).filter(Boolean);
    if (cats.length > 0) {
      renderItemsGridMulti(cats);
      updateColorBarMulti(cats);
    }
  }

  function equipItem(itemId, cat) {
    if (!cat) {
      const found = Catalog.findItemGlobal(itemId);
      if (!found) return;
      cat = found.category;
    }

    const slotId = cat.slotId;

    // Handle conflicts
    const conflicts = cat.conflicts || [];
    for (const conflictSlot of conflicts) {
      if (charData.outfit[conflictSlot]) {
        charData.outfit[conflictSlot] = null;
      }
    }

    // Also check reverse conflicts (if equipping top, remove full-body that conflicts with top)
    for (const c of Catalog.getAllCategories()) {
      if (c.conflicts && c.conflicts.includes(slotId) && charData.outfit[c.slotId]) {
        charData.outfit[c.slotId] = null;
      }
    }

    // Set default color (check category-level or item-level colorable)
    const item = cat.items.get(itemId);
    let colorId = null;
    const isColorable = cat.colorable || (item && item.colorable);
    const paletteId = cat.colorPalette || (item && item.colorPalette) || 'clothing-colors';
    if (isColorable) {
      const palette = Catalog.getColorPalette(paletteId);
      colorId = palette.length > 0 ? palette[0].id : null;
    }

    // Hair goes to parts (renderer reads it from there), everything else to outfit
    if (cat.category === 'hair') {
      charData.parts.hair = { itemId, colorId };
      Storage.saveCharacter(charData);
    } else {
      charData.outfit[slotId] = { itemId, colorId };
      Storage.updateCharacterOutfit(characterId, charData.outfit);
    }
    renderCharacter();
    refreshCurrentGrid();
    updateColorBar(cat);
  }

  function unequipSlot(slotId) {
    // Hair lives in parts
    const currentCat = Catalog.getCategory(currentCategoryId);
    if (currentCat && currentCat.category === 'hair') {
      charData.parts.hair = null;
      Storage.saveCharacter(charData);
    } else {
      charData.outfit[slotId] = null;
      Storage.updateCharacterOutfit(characterId, charData.outfit);
    }
    renderCharacter();
    refreshCurrentTab();
  }

  function updateColorBar(cat) {
    const colorBar = document.getElementById('color-bar');
    const colorOptions = document.getElementById('color-options');

    const slotId = cat.slotId;
    // Hair is in parts, not outfit
    const equipped = cat.category === 'hair'
      ? charData.parts?.hair
      : charData.outfit[slotId];

    if (!equipped || !equipped.itemId) {
      colorBar.classList.add('hidden');
      return;
    }

    const item = cat.items.get(equipped.itemId);
    const isColorable = cat.colorable || (item && item.colorable);

    if (!isColorable) {
      colorBar.classList.add('hidden');
      return;
    }

    colorBar.classList.remove('hidden');
    colorOptions.innerHTML = '';

    const paletteId = cat.colorPalette || (item && item.colorPalette) || 'clothing-colors';
    const palette = Catalog.getColorPalette(paletteId);

    palette.forEach(c => {
      const opt = document.createElement('div');
      opt.className = 'color-option' + (equipped.colorId === c.id ? ' selected' : '');
      opt.style.backgroundColor = c.hex;
      opt.title = c.name;
      opt.addEventListener('click', () => {
        equipped.colorId = c.id;
        if (cat.category === 'hair') {
          Storage.saveCharacter(charData);
        } else {
          Storage.updateCharacterOutfit(characterId, charData.outfit);
        }
        renderCharacter();
        colorOptions.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
      colorOptions.appendChild(opt);
    });
  }

  async function renderCharacter() {
    stage = await Renderer.renderToStage('wardrobe-character', charData, 0.85);
  }

  function clearOutfit() {
    charData.outfit = {};
    Storage.updateCharacterOutfit(characterId, charData.outfit);
    renderCharacter();
    refreshCurrentTab();
  }

  function saveLook(name) {
    const outfitCopy = JSON.parse(JSON.stringify(charData.outfit));
    Storage.saveOutfit(characterId, { name, outfit: outfitCopy });
    // Refresh data
    charData = Storage.getCharacter(characterId);
    if (typeof confetti === 'function') {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    }
  }

  function loadLook(outfitId) {
    const outfit = charData.savedOutfits.find(o => o.id === outfitId);
    if (!outfit) return;
    charData.outfit = JSON.parse(JSON.stringify(outfit.outfit));
    Storage.updateCharacterOutfit(characterId, charData.outfit);
    renderCharacter();
    refreshCurrentTab();
  }

  function deleteLook(outfitId) {
    Storage.deleteOutfit(characterId, outfitId);
    charData = Storage.getCharacter(characterId);
    renderLooksGrid();
  }

  function renderLooksGrid() {
    const grid = document.getElementById('looks-grid');
    grid.innerHTML = '';

    const outfits = charData.savedOutfits || [];
    if (outfits.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--primary-light); font-size:0.85rem; padding:20px;">Nenhum look salvo ainda</p>';
      return;
    }

    outfits.forEach(outfit => {
      const card = document.createElement('div');
      card.className = 'look-card';

      const previewDiv = document.createElement('div');
      previewDiv.className = 'look-preview';
      previewDiv.id = `look-preview-${outfit.id}`;
      card.appendChild(previewDiv);

      const nameEl = document.createElement('div');
      nameEl.className = 'look-name';
      nameEl.textContent = outfit.name || 'Sem nome';
      card.appendChild(nameEl);

      const delBtn = document.createElement('button');
      delBtn.className = 'look-delete';
      delBtn.textContent = 'X';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteLook(outfit.id);
      });
      card.appendChild(delBtn);

      card.addEventListener('click', () => loadLook(outfit.id));
      grid.appendChild(card);

      // Render mini preview
      const lookCharData = JSON.parse(JSON.stringify(charData));
      lookCharData.outfit = outfit.outfit;
      Renderer.renderToDataURL(lookCharData, 75).then(dataUrl => {
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.maxHeight = '75px';
          previewDiv.appendChild(img);
        }
      });
    });
  }

  function showLooksSidebar() {
    const sidebar = document.getElementById('looks-sidebar');
    sidebar.classList.remove('hidden');
    renderLooksGrid();
  }

  function hideLooksSidebar() {
    document.getElementById('looks-sidebar').classList.add('hidden');
  }

  return {
    init,
    equipItem,
    unequipSlot,
    clearOutfit,
    saveLook,
    loadLook,
    deleteLook,
    showLooksSidebar,
    hideLooksSidebar,
    renderCharacter,
    getCharData: () => charData,
    getCharacterId: () => characterId,
  };
})();

/* ============================================
   WARDROBE - Dress-up screen with drag & drop
   ============================================ */

const EXTRA_COLORS_WARDROBE = [
  '#FF0000','#FF4444','#FF6B6B','#FF8C00','#FFA500','#FFD700',
  '#FFFF00','#ADFF2F','#32CD32','#00C853','#00897B','#00BCD4',
  '#03A9F4','#2196F3','#1565C0','#3F51B5','#673AB7','#9C27B0',
  '#E040FB','#FF4081','#F50057','#E91E63','#AD1457','#880E4F',
  '#795548','#A1887F','#D7CCC8','#9E9E9E','#607D8B','#455A64',
  '#F5F5F5','#E0E0E0','#BDBDBD','#757575','#424242','#222222',
];

function openColorPickerModal(currentColorId, onSelect) {
  document.querySelector('.color-picker-overlay')?.remove();
  let selectedHex = (currentColorId && currentColorId.startsWith('#')) ? currentColorId : null;

  const overlay = document.createElement('div');
  overlay.className = 'color-picker-overlay';

  const modal = document.createElement('div');
  modal.className = 'color-picker-modal';

  const header = document.createElement('div');
  header.className = 'color-picker-header';
  header.innerHTML = '<h3>Escolha uma cor</h3>';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'color-picker-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => overlay.remove());
  header.appendChild(closeBtn);
  modal.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'color-picker-grid';
  EXTRA_COLORS_WARDROBE.forEach(hex => {
    const swatch = document.createElement('div');
    swatch.className = 'cp-swatch' + (selectedHex === hex ? ' selected' : '');
    swatch.style.backgroundColor = hex;
    if (['#F5F5F5','#E0E0E0','#BDBDBD','#D7CCC8'].includes(hex)) {
      swatch.style.border = '3px solid #CCC';
    }
    swatch.addEventListener('click', () => {
      selectedHex = hex;
      grid.querySelectorAll('.cp-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    grid.appendChild(swatch);
  });
  modal.appendChild(grid);

  const footer = document.createElement('div');
  footer.className = 'color-picker-footer';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'cp-btn-cancel';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', () => overlay.remove());
  const selectBtn = document.createElement('button');
  selectBtn.className = 'cp-btn-select';
  selectBtn.textContent = 'Selecionar';
  selectBtn.addEventListener('click', () => {
    if (selectedHex) onSelect(selectedHex);
    overlay.remove();
  });
  footer.appendChild(cancelBtn);
  footer.appendChild(selectBtn);
  modal.appendChild(footer);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);
}

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

    // Don't auto-select category on mobile (panel starts closed)
    renderMobileCategoryBar();

    // Desktop: select first category
    const config = Catalog.getUiConfig();
    if (config.wardrobeCategories.length > 0 && window.innerWidth >= 640) {
      const first = config.wardrobeCategories[0];
      selectCategories(first.categories || [first.category]);
    }

    // Close mobile panel button
    const closeBtn = document.getElementById('btn-close-mobile-panel');
    if (closeBtn) closeBtn.addEventListener('click', closeMobilePanel);
  }

  function renderCategoryTabs() {
    const config = Catalog.getUiConfig();
    const tabsContainer = document.getElementById('category-tabs');
    tabsContainer.innerHTML = '';

    config.wardrobeCategories.forEach(wc => {
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

  function renderMobileCategoryBar() {
    const config = Catalog.getUiConfig();
    const bar = document.getElementById('mobile-category-bar');
    if (!bar) return;
    bar.innerHTML = '';

    config.wardrobeCategories.forEach(wc => {
      const catIds = wc.categories || [wc.category];
      const firstCat = Catalog.getCategory(catIds[0]);
      if (!firstCat) return;

      const tab = document.createElement('button');
      tab.className = 'category-tab';
      tab.dataset.categories = JSON.stringify(catIds);
      tab.innerHTML = `<span class="tab-icon">${wc.icon}</span>${wc.label}`;
      tab.addEventListener('click', () => openMobilePanel(catIds, wc.label));
      bar.appendChild(tab);
    });
  }

  function reattachColorEvents(mobileContainer, desktopContainer, titleEl) {
    // Re-attach swatch clicks
    mobileContainer.querySelectorAll('.color-swatch').forEach(swatch => {
      const clone = swatch.cloneNode(true);
      swatch.parentNode.replaceChild(clone, swatch);
      clone.addEventListener('click', () => {
        desktopContainer.querySelector(`.color-swatch[title="${clone.title}"]`)?.click();
        setTimeout(() => openMobilePanel(currentTabCatIds, titleEl.textContent), 50);
      });
    });
    // Re-attach "+" button
    mobileContainer.querySelectorAll('.color-more-btn').forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', () => {
        const cat = Catalog.getCategory(currentCategoryId);
        const equipped = cat?.type === 'body-part'
          ? charData.parts?.[cat.category]
          : charData.outfit?.[cat?.slotId];
        openColorPickerModal(equipped?.colorId, (hex) => {
          if (equipped) equipped.colorId = hex;
          if (cat?.sharedColorGroup) {
            const siblings = Catalog.getCategoriesByColorGroup(cat.sharedColorGroup);
            for (const sib of siblings) {
              const partData = charData.parts?.[sib.category];
              if (partData) partData.colorId = hex;
            }
          }
          if (cat?.type === 'body-part') {
            Storage.saveCharacter(charData);
          } else {
            Storage.updateCharacterOutfit(characterId, charData.outfit);
          }
          renderCharacter();
          openMobilePanel(currentTabCatIds, titleEl.textContent);
        });
      });
    });
  }

  function openMobilePanel(catIds, label) {
    selectCategories(catIds);

    const panel = document.getElementById('mobile-items-panel');
    const titleEl = document.getElementById('mobile-panel-title');
    const mobileGrid = document.getElementById('mobile-items-grid');
    const mobileColorBar = document.getElementById('mobile-color-bar');

    if (titleEl) titleEl.textContent = label;

    // Copy items from desktop grid to mobile grid
    const desktopGrid = document.getElementById('items-grid');
    if (mobileGrid && desktopGrid) {
      mobileGrid.innerHTML = desktopGrid.innerHTML;
      // Re-attach click events
      mobileGrid.querySelectorAll('.item-thumbnail').forEach(thumb => {
        thumb.addEventListener('click', () => {
          const itemId = thumb.dataset.itemId;
          const catId = thumb.dataset.categoryId;
          const cat = Catalog.getCategory(catId);
          const equippedItemId = cat.type === 'body-part'
            ? (charData.parts?.[cat.category]?.itemId || null)
            : (charData.outfit[cat.slotId]?.itemId || null);
          if (equippedItemId === itemId) {
            unequipSlot(cat.slotId);
          } else {
            equipItem(itemId, cat);
          }
          // Refresh mobile panel
          openMobilePanel(currentTabCatIds, titleEl.textContent);
        });
      });
    }

    // Copy color bar
    const desktopColorBar = document.getElementById('color-bar');
    if (mobileColorBar && desktopColorBar && !desktopColorBar.classList.contains('hidden')) {
      mobileColorBar.classList.remove('hidden');
      const mobileColorOpts = document.getElementById('mobile-color-options');
      const desktopColorOpts = document.getElementById('color-options');
      if (mobileColorOpts && desktopColorOpts) {
        mobileColorOpts.innerHTML = desktopColorOpts.innerHTML;
        reattachColorEvents(mobileColorOpts, desktopColorOpts, titleEl);
      }
    } else if (mobileColorBar) {
      mobileColorBar.classList.add('hidden');
    }

    // Re-attach color events in inline color bars (multi-cat tabs in mobile grid)
    if (mobileGrid) {
      const desktopGrid = document.getElementById('items-grid');
      mobileGrid.querySelectorAll('.option-group').forEach((group, i) => {
        const desktopGroup = desktopGrid?.querySelectorAll('.option-group')[i];
        if (group.querySelector('.color-row') && desktopGroup) {
          reattachColorEvents(group, desktopGroup, titleEl);
        }
      });
    }

    // Highlight active tab
    const bar = document.getElementById('mobile-category-bar');
    if (bar) {
      bar.querySelectorAll('.category-tab').forEach(t => {
        const tabCats = JSON.parse(t.dataset.categories || '[]');
        t.classList.toggle('active', JSON.stringify(tabCats) === JSON.stringify(currentTabCatIds));
      });
    }

    panel.classList.remove('hidden');

    // Scale down preview so panel doesn't cover character
    const previewArea = document.querySelector('.wardrobe-preview-area');
    if (previewArea) previewArea.classList.add('panel-open');
  }

  function closeMobilePanel() {
    const panel = document.getElementById('mobile-items-panel');
    if (panel) panel.classList.add('hidden');

    // Restore preview scale
    const previewArea = document.querySelector('.wardrobe-preview-area');
    if (previewArea) previewArea.classList.remove('panel-open');

    // Deselect mobile tabs
    const bar = document.getElementById('mobile-category-bar');
    if (bar) bar.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
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

    // Free position controls
    updateFreePositionPanel();
  }

  // Keep old API working
  function selectCategory(categoryId) {
    selectCategories([categoryId]);
  }

  function renderItemsGridMulti(cats) {
    const grid = document.getElementById('items-grid');
    grid.innerHTML = '';
    // Hide global color bar - we use inline ones for multi-cat tabs
    if (cats.length > 1) {
      document.getElementById('color-bar').classList.add('hidden');
    }

    // Check if full-body is equipped (patterns depend on it)
    const hasFullBody = !!charData.outfit['full-body']?.itemId;
    const renderedColorGroups = new Set();

    for (const cat of cats) {
      const slotId = cat.slotId;
      const equippedItemId = cat.type === 'body-part'
        ? (charData.parts?.[cat.category]?.itemId || null)
        : (charData.outfit[slotId]?.itemId || null);

      // Patterns disabled when no dress equipped
      const isDisabled = cat.slotId === 'pattern' && !hasFullBody;

      // Section label
      if (cats.length > 1) {
        const label = document.createElement('div');
        label.className = 'grid-section-label';
        label.textContent = cat.label;
        label.style.cssText = 'grid-column:1/-1;font-family:var(--font-display);font-size:0.75rem;color:var(--text-secondary);padding:4px 0;margin-top:4px;' +
          (isDisabled ? 'opacity:0.4;' : '');
        grid.appendChild(label);
      }

      // Color bar ABOVE items (skip if shared group already rendered one)
      if (cats.length > 1 && !isDisabled) {
        const cg = cat.sharedColorGroup;
        if (!cg || !renderedColorGroups.has(cg)) {
          if (cg) renderedColorGroups.add(cg);
          renderInlineColorBar(grid, cat);
        }
      }

      for (const [itemId, item] of cat.items) {
        const thumb = document.createElement('div');
        thumb.className = 'item-thumbnail' + (equippedItemId === itemId ? ' equipped' : '');
        if (isDisabled) thumb.style.opacity = '0.35';
        if (isDisabled) thumb.style.pointerEvents = 'none';
        thumb.dataset.itemId = itemId;
        thumb.dataset.categoryId = cat.category;
        thumb.dataset.slotId = slotId;

        const assetUrl = item.thumbnail || item.asset || (item.assets && (item.assets.front || item.assets.main));
        if (assetUrl) {
          const img = document.createElement('img');
          img.src = assetUrl + '?v=' + Date.now();
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

  function renderInlineColorBar(grid, cat) {
    const slotId = cat.slotId;
    const equipped = cat.type === 'body-part'
      ? charData.parts?.[cat.category]
      : charData.outfit[slotId];

    if (!equipped || !equipped.itemId) return;

    const item = cat.items.get(equipped.itemId);
    const isColorable = cat.colorable || (item && item.colorable);
    if (!isColorable) return;

    const paletteId = cat.colorPalette || (item && item.colorPalette) || 'clothing-colors';
    const palette = Catalog.getColorPalette(paletteId);
    if (palette.length === 0) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'option-group';
    wrapper.style.cssText = 'grid-column:1/-1;margin-bottom:4px;padding:8px 10px;';

    const colorItems = document.createElement('div');
    colorItems.className = 'option-items color-row';

    function applyColorInline(colorId) {
      equipped.colorId = colorId;
      if (cat.sharedColorGroup) {
        const siblings = Catalog.getCategoriesByColorGroup(cat.sharedColorGroup);
        for (const sib of siblings) {
          const partData = charData.parts?.[sib.category];
          if (partData) partData.colorId = colorId;
        }
      }
      if (cat.type === 'body-part') {
        Storage.saveCharacter(charData);
      } else {
        Storage.updateCharacterOutfit(characterId, charData.outfit);
      }
      renderCharacter();
      wrapper.querySelectorAll('.color-swatch').forEach(o => o.classList.remove('selected'));
    }

    palette.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'option-item color-swatch' + (equipped.colorId === c.id ? ' selected' : '');
      swatch.style.backgroundColor = c.hex;
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        applyColorInline(c.id);
        swatch.classList.add('selected');
      });
      colorItems.appendChild(swatch);
    });

    const moreBtn = document.createElement('div');
    moreBtn.className = 'color-more-btn';
    moreBtn.textContent = '+';
    moreBtn.title = 'Mais cores';
    moreBtn.addEventListener('click', () => {
      openColorPickerModal(equipped.colorId, (hex) => {
        applyColorInline(hex);
      });
    });
    colorItems.appendChild(moreBtn);

    wrapper.appendChild(colorItems);
    grid.appendChild(wrapper);
  }

  function updateColorBarMulti(cats) {
    // For multi-cat tabs, inline bars handle it - hide global
    if (cats.length > 1) {
      document.getElementById('color-bar').classList.add('hidden');
      return;
    }
    // Single-cat tab: use the global color bar
    updateColorBar(cats[0]);
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

    // Preserve current color when switching items in the same slot
    const item = cat.items.get(itemId);
    const isColorable = cat.colorable || (item && item.colorable);
    const paletteId = cat.colorPalette || (item && item.colorPalette) || 'clothing-colors';
    const currentSlotData = cat.type === 'body-part' ? charData.parts?.[cat.category] : charData.outfit[slotId];
    let colorId = currentSlotData?.colorId || null;
    // Inherit color from shared group sibling
    if (!colorId && cat.sharedColorGroup) {
      const siblings = Catalog.getCategoriesByColorGroup(cat.sharedColorGroup);
      for (const sib of siblings) {
        const sibData = charData.parts?.[sib.category];
        if (sibData?.colorId) { colorId = sibData.colorId; break; }
      }
    }
    if (isColorable && !colorId) {
      const palette = Catalog.getColorPalette(paletteId);
      colorId = palette.length > 0 ? palette[0].id : null;
    }

    // Hair goes to parts (renderer reads it from there), everything else to outfit
    if (cat.type === 'body-part') {
      charData.parts[cat.category] = { itemId, colorId };
      Storage.saveCharacter(charData);
    } else {
      charData.outfit[slotId] = { itemId, colorId };
      Storage.updateCharacterOutfit(characterId, charData.outfit);
    }
    renderCharacter();
    refreshCurrentTab();
    updateFreePositionPanel();
  }

  function unequipSlot(slotId) {
    // Body parts live in parts, clothing/accessories in outfit
    const currentCat = Catalog.getCategory(currentCategoryId);
    if (currentCat && currentCat.type === 'body-part') {
      charData.parts[currentCat.category] = null;
      Storage.saveCharacter(charData);
    } else {
      charData.outfit[slotId] = null;
      // Removing dress also removes pattern (pattern depends on dress)
      if (slotId === 'full-body' && charData.outfit['pattern']) {
        charData.outfit['pattern'] = null;
      }
      Storage.updateCharacterOutfit(characterId, charData.outfit);
    }
    renderCharacter();
    refreshCurrentTab();
    updateFreePositionPanel();
  }

  function updateColorBar(cat) {
    const colorBar = document.getElementById('color-bar');
    const colorOptions = document.getElementById('color-options');

    const slotId = cat.slotId;
    // Hair is in parts, not outfit
    const equipped = cat.type === 'body-part'
      ? charData.parts?.[cat.category]
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
    colorOptions.className = 'option-items color-row';

    const paletteId = cat.colorPalette || (item && item.colorPalette) || 'clothing-colors';
    const palette = Catalog.getColorPalette(paletteId);

    function applyColorGlobal(colorId) {
      equipped.colorId = colorId;
      if (cat.type === 'body-part') {
        Storage.saveCharacter(charData);
      } else {
        Storage.updateCharacterOutfit(characterId, charData.outfit);
      }
      renderCharacter();
      colorOptions.querySelectorAll('.color-swatch').forEach(o => o.classList.remove('selected'));
    }

    palette.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'option-item color-swatch' + (equipped.colorId === c.id ? ' selected' : '');
      swatch.style.backgroundColor = c.hex;
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        applyColorGlobal(c.id);
        swatch.classList.add('selected');
      });
      colorOptions.appendChild(swatch);
    });

    const moreBtn = document.createElement('div');
    moreBtn.className = 'color-more-btn';
    moreBtn.textContent = '+';
    moreBtn.title = 'Mais cores';
    moreBtn.addEventListener('click', () => {
      openColorPickerModal(equipped.colorId, (hex) => {
        applyColorGlobal(hex);
      });
    });
    colorOptions.appendChild(moreBtn);
  }

  async function renderCharacter() {
    const area = document.querySelector('.wardrobe-preview-area');
    const areaH = area ? area.clientHeight - 8 : 300;
    const areaW = area ? area.clientWidth - 8 : 250;
    const scale = Math.min(areaH / 800, areaW / 600, 1);
    stage = await Renderer.renderToStage('wardrobe-character', charData, scale);
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

  // ========== FREE POSITION ==========

  function updateFreePositionPanel() {
    const panel = document.getElementById('free-pos-panel');
    if (!panel) return;

    // Find if any equipped item in current tab supports freePosition
    let freeSlot = null;
    for (const catId of currentTabCatIds) {
      const cat = Catalog.getCategory(catId);
      if (!cat || !cat.freePosition) continue;
      const equipped = charData.outfit[cat.slotId];
      if (equipped && equipped.itemId) {
        freeSlot = cat.slotId;
        break;
      }
    }

    if (!freeSlot) {
      panel.classList.add('hidden');
      return;
    }

    panel.classList.remove('hidden');
    const slotData = charData.outfit[freeSlot];
    const scale = slotData.userScale || 1;
    document.getElementById('free-pos-scale').textContent = Math.round(scale * 100) + '%';

    // Wire buttons (remove old listeners by replacing)
    panel.querySelectorAll('.free-pos-btn').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener('click', () => {
        applyFreePositionAction(freeSlot, newBtn.dataset.action);
      });
    });
  }

  function applyFreePositionAction(slotId, action) {
    const slotData = charData.outfit[slotId];
    if (!slotData) return;

    if (!slotData.userOffset) slotData.userOffset = { x: 0, y: 0 };
    if (!slotData.userScale) slotData.userScale = 1;

    const step = 10; // pixels per press
    const scaleStep = 0.05;

    switch (action) {
      case 'left':  slotData.userOffset.x -= step; break;
      case 'right': slotData.userOffset.x += step; break;
      case 'up':    slotData.userOffset.y -= step; break;
      case 'down':  slotData.userOffset.y += step; break;
      case 'bigger':  slotData.userScale = Math.min(2, slotData.userScale + scaleStep); break;
      case 'smaller': slotData.userScale = Math.max(0.3, slotData.userScale - scaleStep); break;
      case 'reset':
        slotData.userOffset = { x: 0, y: 0 };
        slotData.userScale = 1;
        break;
    }

    Storage.updateCharacterOutfit(characterId, charData.outfit);
    renderCharacter();
    document.getElementById('free-pos-scale').textContent = Math.round(slotData.userScale * 100) + '%';
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

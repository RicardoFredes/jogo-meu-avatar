/* ============================================
   WARDROBE - Dress-up screen with drag & drop
   ============================================ */

// Neutral thumbnail: loads SVG, neutralizes colors, crops viewBox to content
const _thumbCache = new Map();
async function loadNeutralThumb(svgUrl) {
  if (_thumbCache.has(svgUrl)) return _thumbCache.get(svgUrl);
  try {
    const resp = await fetch(svgUrl + '?v=' + Date.now());
    let svg = await resp.text();

    // Neutralize colors
    svg = svg.replace(/#FF00FF/gi, '#D0D0D0');
    svg = svg.replace(/#CC00CC/gi, '#333333');
    svg = svg.replace(/fill="#FFFFFF"/gi, 'fill="#E8E8E8"');
    svg = svg.replace(/fill="white"/gi, 'fill="#E8E8E8"');
    svg = svg.replace(/stroke="#FFFFFF"/gi, 'stroke="#555555"');
    svg = svg.replace(/stroke="white"/gi, 'stroke="#555555"');
    svg = svg.replace(/stroke="#C0C0C0"/gi, 'stroke="#444444"');
    svg = svg.replace(/stroke="#E0E0E0"/gi, 'stroke="#555555"');

    // Detect bounding box from coordinates in the SVG
    const nums = [];
    // Extract numbers from d="..." paths
    const dMatches = svg.matchAll(/d="([^"]+)"/g);
    for (const m of dMatches) {
      const pathNums = m[1].match(/-?[\d.]+/g);
      if (pathNums) for (let i = 0; i < pathNums.length - 1; i += 2) {
        const x = parseFloat(pathNums[i]), y = parseFloat(pathNums[i+1]);
        if (!isNaN(x) && !isNaN(y) && x > -50 && x < 700 && y > -50 && y < 900) nums.push({x, y});
      }
    }
    // cx/cy from circles/ellipses
    const circMatches = svg.matchAll(/cx="([\d.]+)"[^>]*cy="([\d.]+)"/g);
    for (const m of circMatches) nums.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });

    if (nums.length > 2) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of nums) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
      const pad = 15;
      const vbX = Math.floor(minX - pad);
      const vbY = Math.floor(minY - pad);
      const vbW = Math.ceil(maxX - minX + pad * 2);
      const vbH = Math.ceil(maxY - minY + pad * 2);
      // Replace viewBox
      svg = svg.replace(/viewBox="[^"]*"/, `viewBox="${vbX} ${vbY} ${vbW} ${vbH}"`);
    }

    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    _thumbCache.set(svgUrl, dataUrl);
    return dataUrl;
  } catch (e) { return null; }
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
        clone.closest('.color-row')?.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        clone.classList.add('selected');
      });
    });
    // Re-attach "+" button (scrolls to extra colors)
    mobileContainer.querySelectorAll('.color-more-btn').forEach(btn => {
      const clone = btn.cloneNode(true);
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', () => {
        const row = clone.closest('.color-row');
        const firstExtra = row?.querySelector('.color-swatch-extra');
        if (firstExtra && row) row.scrollTo({ left: firstExtra.offsetLeft - row.offsetLeft - 8, behavior: 'smooth' });
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

    // Render items directly in mobile grid with section labels + inline color bars
    if (mobileGrid) {
      mobileGrid.innerHTML = '';
      const cats = catIds.map(id => Catalog.getCategory(id)).filter(Boolean);
      const hasFullBody = !!charData.outfit['full-body']?.itemId;

      for (const cat of cats) {
        const slotId = cat.slotId;
        const equippedItemId = cat.type === 'body-part'
          ? (charData.parts?.[cat.category]?.itemId || null)
          : (charData.outfit[slotId]?.itemId || null);
        const isDisabled = cat.slotId === 'pattern' && !hasFullBody;

        // Section label (when multi-cat)
        if (cats.length > 1) {
          const sectionLabel = document.createElement('div');
          sectionLabel.style.cssText = 'grid-column:1/-1;font-family:Fredoka,sans-serif;font-size:0.8rem;color:#7D3C98;padding:6px 0 2px;margin-top:8px;border-top:1px solid #E8D5F5;' +
            (isDisabled ? 'opacity:0.4;' : '');
          sectionLabel.textContent = cat.label;
          mobileGrid.appendChild(sectionLabel);
        }

        // Inline color bar for this category
        if (cat.colorable && cat.colorPalette && !isDisabled) {
          const equipped = cat.type === 'body-part'
            ? charData.parts?.[cat.category]
            : charData.outfit[slotId];
          const palette = Catalog.getColorPalette(cat.colorPalette || 'clothing-colors');
          if (palette.length > 0) {
            const bar = buildColorBar({
              palette,
              currentColorId: equipped?.colorId || null,
              onSelect(colorId) {
                if (equipped) {
                  equipped.colorId = colorId;
                } else if (cat.type === 'body-part') {
                  if (!charData.parts[cat.category]) charData.parts[cat.category] = {};
                  charData.parts[cat.category].colorId = colorId;
                } else {
                  if (!charData.outfit[slotId]) charData.outfit[slotId] = {};
                  charData.outfit[slotId].colorId = colorId;
                }
                if (cat.type === 'body-part') Storage.saveCharacter(charData);
                else Storage.updateCharacterOutfit(characterId, charData.outfit);
                renderCharacter();
              },
            });
            bar.style.gridColumn = '1 / -1';
            mobileGrid.appendChild(bar);
          }
        }

        // Items
        for (const [itemId, item] of cat.items) {
          const thumb = document.createElement('div');
          thumb.className = 'item-thumbnail' + (equippedItemId === itemId ? ' equipped' : '');
          if (isDisabled) { thumb.style.opacity = '0.35'; thumb.style.pointerEvents = 'none'; }
          thumb.dataset.itemId = itemId;
          thumb.dataset.categoryId = cat.category;
          thumb.dataset.slotId = slotId;

          const thumbUrl = item.thumbnail || item.asset || (item.assets && (item.assets.front || item.assets.main));
          if (thumbUrl) {
            const img = document.createElement('img');
            img.src = thumbUrl + '?v=' + Date.now();
            img.alt = item.name;
            img.draggable = false;
            thumb.appendChild(img);
          } else {
            thumb.textContent = item.name.slice(0, 4);
          }

          thumb.addEventListener('click', () => {
            if (equippedItemId === itemId) {
              unequipSlot(slotId);
            } else {
              equipItem(itemId, cat);
            }
            openMobilePanel(currentTabCatIds, titleEl.textContent);
          });

          mobileGrid.appendChild(thumb);
        }
      }
    }

    // Hide global mobile color bar (we use inline ones now)
    if (mobileColorBar) {
      mobileColorBar.classList.add('hidden');
    }

    // Re-attach color events in inline color bars (multi-cat tabs in mobile grid)
    if (mobileGrid) {
      mobileGrid.querySelectorAll('.color-more-btn').forEach(btn => {
        const clone = btn.cloneNode(true);
        btn.parentNode.replaceChild(clone, btn);
        clone.addEventListener('click', () => {
          const row = clone.closest('.color-row');
          const firstExtra = row?.querySelector('.color-swatch-extra');
          if (firstExtra && row) row.scrollTo({ left: firstExtra.offsetLeft - row.offsetLeft - 8, behavior: 'smooth' });
        });
      });
      mobileGrid.querySelectorAll('.color-swatch').forEach(swatch => {
        const clone = swatch.cloneNode(true);
        swatch.parentNode.replaceChild(clone, swatch);
        clone.addEventListener('click', () => {
          const desktopGrid = document.getElementById('items-grid');
          desktopGrid?.querySelector(`.color-swatch[title="${clone.title}"]`)?.click();
          // Deselect all in this row, select this one
          clone.closest('.color-row')?.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
          clone.classList.add('selected');
        });
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

        const thumbUrl = item.thumbnail || item.asset || (item.assets && (item.assets.front || item.assets.main));
        if (thumbUrl) {
          const img = document.createElement('img');
          img.src = thumbUrl + '?v=' + Date.now();
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
    if (!cat.colorable) return;
    const palette = Catalog.getColorPalette(cat.colorPalette || 'clothing-colors');
    if (palette.length === 0) return;

    const slotId = cat.slotId;
    const equipped = cat.type === 'body-part'
      ? charData.parts?.[cat.category]
      : charData.outfit[slotId];

    const bar = buildColorBar({
      palette,
      currentColorId: equipped?.colorId || null,
      onSelect(colorId) {
        if (equipped) {
          equipped.colorId = colorId;
        } else if (cat.type === 'body-part') {
          if (!charData.parts[cat.category]) charData.parts[cat.category] = {};
          charData.parts[cat.category].colorId = colorId;
        } else {
          if (!charData.outfit[slotId]) charData.outfit[slotId] = {};
          charData.outfit[slotId].colorId = colorId;
        }
        if (cat.sharedColorGroup) {
          const siblings = Catalog.getCategoriesByColorGroup(cat.sharedColorGroup);
          for (const sib of siblings) {
            if (charData.parts?.[sib.category]) charData.parts[sib.category].colorId = colorId;
          }
        }
        if (cat.type === 'body-part') {
          Storage.saveCharacter(charData);
        } else {
          Storage.updateCharacterOutfit(characterId, charData.outfit);
        }
        renderCharacter();
      },
    });
    bar.style.cssText = 'grid-column:1/-1;margin-bottom:4px;padding:8px 10px;';
    grid.appendChild(bar);
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

    if (!cat.colorable) {
      colorBar.classList.add('hidden');
      return;
    }

    const palette = Catalog.getColorPalette(cat.colorPalette || 'clothing-colors');
    if (palette.length === 0) {
      colorBar.classList.add('hidden');
      return;
    }

    const slotId = cat.slotId;
    const equipped = cat.type === 'body-part'
      ? charData.parts?.[cat.category]
      : charData.outfit[slotId];

    colorBar.classList.remove('hidden');
    // Replace content with buildColorBar
    colorBar.innerHTML = '';
    const bar = buildColorBar({
      palette,
      currentColorId: equipped?.colorId || null,
      onSelect(colorId) {
        if (equipped) {
          equipped.colorId = colorId;
        } else if (cat.type === 'body-part') {
          if (!charData.parts[cat.category]) charData.parts[cat.category] = {};
          charData.parts[cat.category].colorId = colorId;
        } else {
          if (!charData.outfit[slotId]) charData.outfit[slotId] = {};
          charData.outfit[slotId].colorId = colorId;
        }
        if (cat.type === 'body-part') {
          Storage.saveCharacter(charData);
        } else {
          Storage.updateCharacterOutfit(characterId, charData.outfit);
        }
        renderCharacter();
      },
    });
    // Move children from bar into colorBar (bar is an .option-group, colorBar is the container)
    while (bar.firstChild) colorBar.appendChild(bar.firstChild);
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

/* ============================================
   CHARACTER CREATOR - Step-by-step creation UI
   ============================================ */

const CharacterCreator = (() => {
  let steps = [];
  let currentStep = 0;
  let charData = null;
  let editingId = null; // null = new, string = editing existing

  const randomNames = [
    'Luna', 'Estrela', 'Flora', 'Aurora', 'Sereia', 'Fada', 'Nuvem',
    'Arco-Iris', 'Borboleta', 'Florzinha', 'Princesa', 'Gatinha',
    'Lila', 'Mel', 'Sol', 'Brilho', 'Pérola', 'Cristal', 'Violeta',
    'Rosa', 'Moranguinho', 'Cerejinha', 'Docinho', 'Pipoca', 'Algodão',
    'Safira', 'Rubi', 'Jade', 'Amora', 'Bela', 'Duda', 'Mia', 'Nina',
  ];

  function getRandomName() {
    return randomNames[Math.floor(Math.random() * randomNames.length)];
  }

  function getDefaultCharData() {
    return {
      name: '',
      body: { shapeId: 'child', skinColorId: 'skin-1' },
      parts: {
        'face-shapes': { itemId: 'face-round' },
        eyes: { itemId: 'eyes-round', colorId: 'brown' },
        eyebrows: { itemId: 'brows-thin', colorId: 'dark-brown' },
        noses: { itemId: 'nose-round' },
        mouths: { itemId: 'mouth-smile', colorId: 'natural' },
        'hair-back': { itemId: 'longo-liso', colorId: 'dark-brown' },
        'hair-front': { itemId: 'franja-ondulada', colorId: 'dark-brown' },
        'facial-hair': null,
        mustache: null,
        extras: null,
      },
      outfit: {},
      savedOutfits: [],
    };
  }

  function init(existingCharId) {
    const config = Catalog.getUiConfig();
    // Filter out steps where all referenced categories have 0 items
    steps = config.creationSteps.filter(step => {
      if (step.type === 'review' || step.fields) return true; // always show basics + review
      if (step.id === 'skin') return true; // skin uses palette, not category
      const sources = step.dataSources || (step.dataSource ? [step.dataSource] : []);
      return sources.some(s => {
        const cat = Catalog.getCategory(s);
        return cat && cat.items.size > 0;
      });
    });
    currentStep = 0;

    if (existingCharId) {
      editingId = existingCharId;
      const existing = Storage.getCharacter(existingCharId);
      charData = existing ? JSON.parse(JSON.stringify(existing)) : getDefaultCharData();
      // Ensure parts have defaults for new features added after character was created
      const defaults = getDefaultCharData();
      for (const [key, val] of Object.entries(defaults.parts)) {
        if (!charData.parts[key] && val) charData.parts[key] = val;
      }
      if (!charData.body.shapeId || charData.body.shapeId.includes('-female-') || charData.body.shapeId.includes('-male-')) {
        charData.body.shapeId = 'child';
      }
    } else {
      editingId = null;
      charData = getDefaultCharData();
    }

    renderStep();
    updatePreview();

    // On mobile, scale down preview so panel doesn't cover it
    if (window.innerWidth < 640) {
      const previewArea = document.querySelector('.creator-preview-area');
      if (previewArea) previewArea.classList.add('panel-open');
    }
  }

  function cleanup() {
    const previewArea = document.querySelector('.creator-preview-area');
    if (previewArea) previewArea.classList.remove('panel-open');
  }

  function renderStep() {
    const step = steps[currentStep];
    const panel = document.getElementById('options-panel');
    const mobilePanel = document.getElementById('mobile-options-panel');
    const title = document.getElementById('step-title');
    const panelTitle = document.getElementById('creator-panel-title');
    const indicator = document.getElementById('step-indicator');

    title.textContent = step.label;
    if (panelTitle) panelTitle.textContent = step.label;
    indicator.textContent = `${currentStep + 1}/${steps.length}`;

    const isFirst = currentStep === 0;
    const isLast = currentStep === steps.length - 1;

    // Update all prev/next buttons (mobile panel + desktop floating)
    document.querySelectorAll('#btn-prev-step, #btn-prev-step-desktop').forEach(btn => {
      btn.disabled = isFirst;
    });
    document.querySelectorAll('#btn-next-step, #btn-next-step-desktop').forEach(btn => {
      btn.textContent = isLast ? '✓' : '→';
      btn.classList.toggle('creator-panel-nav-save', isLast);
      btn.classList.toggle('creator-float-save', isLast);
    });

    // Render into desktop panel
    panel.innerHTML = '';
    if (step.id === 'basics') renderBasicsStep(panel);
    else if (step.id === 'skin') renderSkinStep(panel);
    else if (step.id === 'review') renderReviewStep(panel);
    else if (step.dataSource) renderCategoryStep(panel, [step.dataSource], step.optional);
    else if (step.dataSources) renderCategoryStep(panel, step.dataSources, step.optional);

    // Render into mobile panel
    if (mobilePanel) {
      mobilePanel.innerHTML = '';
      if (step.id === 'basics') renderBasicsStep(mobilePanel);
      else if (step.id === 'skin') renderSkinStep(mobilePanel);
      else if (step.id === 'review') renderReviewStep(mobilePanel);
      else if (step.dataSource) renderCategoryStep(mobilePanel, [step.dataSource], step.optional);
      else if (step.dataSources) renderCategoryStep(mobilePanel, step.dataSources, step.optional);
    }
  }

  function renderBasicsStep(panel) {
    // Name
    const nameGroup = document.createElement('div');
    nameGroup.className = 'option-group';
    nameGroup.innerHTML = `
      <div class="option-group-title">Nome</div>
      <div class="name-input-group">
        <input type="text" id="char-name" placeholder="Ex: Luna" maxlength="20" value="${charData.name}">
      </div>
    `;
    panel.appendChild(nameGroup);

    const nameInput = nameGroup.querySelector('#char-name');
    nameInput.addEventListener('input', () => { charData.name = nameInput.value; });

    // Body type: child or adult
    const currentShapeId = charData.body.shapeId || 'child';

    panel.appendChild(createChoiceGroup('Tamanho', [
      { id: 'child', label: 'Crianca', icon: '🧒' },
      { id: 'adult', label: 'Adulto', icon: '🧑' },
    ], currentShapeId, (val) => {
      charData.body.shapeId = val;
      updatePreview();
      renderStep();
    }));
  }

  function renderSkinStep(panel) {
    const colors = Catalog.getColorPalette('skin-tones');
    const group = document.createElement('div');
    group.className = 'option-group';
    group.innerHTML = '<div class="option-group-title">Escolha a cor da pele</div>';
    const items = document.createElement('div');
    items.className = 'option-items';

    colors.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'option-item color-swatch' + (charData.body.skinColorId === c.id ? ' selected' : '');
      swatch.style.backgroundColor = c.hex;
      swatch.title = c.name;
      swatch.addEventListener('click', () => {
        charData.body.skinColorId = c.id;
        updatePreview();
        items.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
      items.appendChild(swatch);
    });

    group.appendChild(items);
    panel.appendChild(group);
  }

  function renderCategoryStep(panel, categoryIds, optional) {
    const renderedColorGroups = new Set();
    for (const catId of categoryIds) {
      const cat = Catalog.getCategory(catId);
      if (!cat || cat.items.size === 0) continue;

      const group = document.createElement('div');
      group.className = 'option-group';
      group.innerHTML = `<div class="option-group-title">${cat.label}</div>`;

      const items = document.createElement('div');
      items.className = 'option-items';

      const currentPartData = charData.parts[catId];
      const currentItemId = currentPartData?.itemId || null;

      // "Nenhum" option for optional categories
      if (optional) {
        const noneEl = document.createElement('div');
        noneEl.className = 'option-item option-none' + (!currentItemId ? ' selected' : '');
        noneEl.textContent = 'Nenhum';
        noneEl.title = 'Sem ' + cat.label.toLowerCase();
        noneEl.addEventListener('click', () => {
          charData.parts[catId] = null;
          updatePreview();
          items.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected'));
          noneEl.classList.add('selected');
        });
        items.appendChild(noneEl);
      }

      for (const [itemId, item] of cat.items) {
        const optEl = document.createElement('div');
        optEl.className = 'option-item' + (currentItemId === itemId ? ' selected' : '');

        // Use thumbnail if available, otherwise asset
        const thumbUrl = item.thumbnail || item.asset || (item.assets && (item.assets.front || item.assets.main));
        if (thumbUrl) {
          const img = document.createElement('img');
          img.src = thumbUrl + '?v=' + Date.now();
          img.alt = item.name;
          optEl.appendChild(img);
        } else {
          optEl.textContent = item.name.slice(0, 3);
        }

        optEl.title = item.name;
        optEl.addEventListener('click', () => {
          if (!charData.parts[catId]) charData.parts[catId] = {};
          charData.parts[catId].itemId = itemId;
          updatePreview();
          items.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected'));
          optEl.classList.add('selected');
        });

        items.appendChild(optEl);
      }

      group.appendChild(items);
      panel.appendChild(group);

      // Color palette if colorable
      // Skip if another category in the same sharedColorGroup already rendered a palette
      const colorGroupId = cat.sharedColorGroup;
      const skipColor = colorGroupId
        ? renderedColorGroups.has(colorGroupId)
        : catId === 'hair-front'; // legacy: hair-front skips (hair-back shows it)

      if (cat.colorable && cat.colorPalette && !skipColor) {
        if (colorGroupId) renderedColorGroups.add(colorGroupId);

        const colors = Catalog.getColorPalette(cat.colorPalette);
        const colorGroup = document.createElement('div');
        colorGroup.className = 'option-group';
        colorGroup.innerHTML = `<div class="option-group-title">Cor</div>`;
        const colorItems = document.createElement('div');
        colorItems.className = 'option-items color-row';

        const currentColorId = currentPartData?.colorId || null;

        function applyColor(colorId) {
          if (!charData.parts[catId]) charData.parts[catId] = {};
          charData.parts[catId].colorId = colorId;
          const syncGroup = colorGroupId
            ? Catalog.getCategoriesByColorGroup(colorGroupId).map(c => c.category)
            : (catId === 'hair-back' || catId === 'hair-front') ? ['hair-back', 'hair-front'] : [];
          for (const syncId of syncGroup) {
            if (charData.parts[syncId]) charData.parts[syncId].colorId = colorId;
          }
          updatePreview();
          colorGroup.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        }

        // Main palette swatches
        colors.forEach(c => {
          const swatch = document.createElement('div');
          swatch.className = 'option-item color-swatch' + (currentColorId === c.id ? ' selected' : '');
          swatch.style.backgroundColor = c.hex;
          swatch.title = c.name;
          swatch.addEventListener('click', () => {
            applyColor(c.id);
            swatch.classList.add('selected');
          });
          colorItems.appendChild(swatch);
        });

        // "+" button opens fullscreen color picker modal
        const moreBtn = document.createElement('div');
        moreBtn.className = 'color-more-btn';
        moreBtn.textContent = '+';
        moreBtn.title = 'Mais cores';
        moreBtn.addEventListener('click', () => {
          openColorPickerModal(currentColorId, (hex) => {
            applyColor(hex);
            colorGroup.querySelector(`.color-swatch[title="${hex}"]`)?.classList.add('selected');
          });
        });
        colorItems.appendChild(moreBtn);

        colorGroup.appendChild(colorItems);
        panel.appendChild(colorGroup);
      }
    }
  }

  const EXTRA_COLORS = [
    '#FF0000','#FF4444','#FF6B6B','#FF8C00','#FFA500','#FFD700',
    '#FFFF00','#ADFF2F','#32CD32','#00C853','#00897B','#00BCD4',
    '#03A9F4','#2196F3','#1565C0','#3F51B5','#673AB7','#9C27B0',
    '#E040FB','#FF4081','#F50057','#E91E63','#AD1457','#880E4F',
    '#795548','#A1887F','#D7CCC8','#9E9E9E','#607D8B','#455A64',
    '#F5F5F5','#E0E0E0','#BDBDBD','#757575','#424242','#222222',
  ];

  function openColorPickerModal(currentColorId, onSelect) {
    // Remove existing overlay
    document.querySelector('.color-picker-overlay')?.remove();

    let selectedHex = (currentColorId && currentColorId.startsWith('#')) ? currentColorId : null;

    const overlay = document.createElement('div');
    overlay.className = 'color-picker-overlay';

    const modal = document.createElement('div');
    modal.className = 'color-picker-modal';

    // Header
    const header = document.createElement('div');
    header.className = 'color-picker-header';
    header.innerHTML = '<h3>Escolha uma cor</h3>';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'color-picker-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => overlay.remove());
    header.appendChild(closeBtn);
    modal.appendChild(header);

    // Grid
    const grid = document.createElement('div');
    grid.className = 'color-picker-grid';
    EXTRA_COLORS.forEach(hex => {
      const swatch = document.createElement('div');
      swatch.className = 'cp-swatch' + (selectedHex === hex ? ' selected' : '');
      swatch.style.backgroundColor = hex;
      if (hex === '#F5F5F5' || hex === '#E0E0E0' || hex === '#BDBDBD') {
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

    // Footer
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
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  function renderReviewStep(panel) {
    const group = document.createElement('div');
    group.className = 'option-group';
    group.style.textAlign = 'center';
    group.innerHTML = `
      <div class="option-group-title" style="font-size:1.3rem">
        ${charData.name || 'Sem nome'} esta ficando incrivel!
      </div>
      <p style="color:var(--text-secondary); margin-top:8px;">
        Revise sua personagem e clique em Salvar!
      </p>
    `;
    panel.appendChild(group);
  }

  function createChoiceGroup(title, options, selectedId, onChange) {
    const group = document.createElement('div');
    group.className = 'option-group';
    group.innerHTML = `<div class="option-group-title">${title}</div>`;
    const btns = document.createElement('div');
    btns.className = 'choice-buttons';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn' + (selectedId === opt.id ? ' selected' : '');
      btn.innerHTML = `<span class="choice-icon">${opt.icon}</span>${opt.label}`;
      btn.addEventListener('click', () => {
        btns.querySelectorAll('.choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        onChange(opt.id);
      });
      btns.appendChild(btn);
    });

    group.appendChild(btns);
    return group;
  }

  async function updatePreview() {
    // Show only body parts during editing - no outfit/clothing
    const previewData = {
      ...charData,
      outfit: {},
    };
    // Calculate scale to fit the preview area
    const area = document.querySelector('.creator-preview-area');
    const areaH = area ? area.clientHeight - 8 : 300;
    const areaW = area ? area.clientWidth - 8 : 250;
    const bodyH = 800; // canvas reference height
    const bodyW = 600;
    const scale = Math.min(areaH / bodyH, areaW / bodyW, 1);
    await Renderer.renderToStage('creator-preview', previewData, scale);
  }

  function nextStep() {
    if (currentStep === 0 && !charData.name.trim()) {
      charData.name = getRandomName();
    }
    if (currentStep < steps.length - 1) {
      currentStep++;
      renderStep();
      updatePreview();
    } else {
      save();
    }
  }

  function prevStep() {
    if (currentStep > 0) {
      currentStep--;
      renderStep();
      updatePreview();
    }
  }

  function save() {
    const saved = Storage.saveCharacter(charData);
    // Fire confetti
    if (typeof confetti === 'function') {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
    // Go directly to wardrobe
    App.showScreen('wardrobe');
    Wardrobe.init(saved.id);
    DragDrop.initDropZone();
  }

  return {
    init,
    nextStep,
    prevStep,
    cleanup,
    getCurrentCharData: () => charData,
  };
})();

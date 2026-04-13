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
  }

  function renderStep() {
    const step = steps[currentStep];
    const panel = document.getElementById('options-panel');
    const title = document.getElementById('step-title');
    const indicator = document.getElementById('step-indicator');
    const prevBtn = document.getElementById('btn-prev-step');
    const nextBtn = document.getElementById('btn-next-step');

    title.textContent = step.label;
    indicator.textContent = `${currentStep + 1}/${steps.length}`;
    prevBtn.disabled = currentStep === 0;
    nextBtn.textContent = currentStep === steps.length - 1 ? 'Salvar!' : 'Proximo →';

    panel.innerHTML = '';

    if (step.id === 'basics') renderBasicsStep(panel);
    else if (step.id === 'skin') renderSkinStep(panel);
    else if (step.id === 'review') renderReviewStep(panel);
    else if (step.dataSource) renderCategoryStep(panel, [step.dataSource], step.optional);
    else if (step.dataSources) renderCategoryStep(panel, step.dataSources, step.optional);
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

      // Color palette if colorable (skip hair-front palette - hair-back already shows it)
      if (cat.colorable && cat.colorPalette && catId !== 'hair-front') {
        const colors = Catalog.getColorPalette(cat.colorPalette);
        const colorGroup = document.createElement('div');
        colorGroup.className = 'option-group';
        colorGroup.innerHTML = `<div class="option-group-title">Cor</div>`;
        const colorItems = document.createElement('div');
        colorItems.className = 'option-items';

        const currentColorId = currentPartData?.colorId || null;

        colors.forEach(c => {
          const swatch = document.createElement('div');
          swatch.className = 'option-item color-swatch' + (currentColorId === c.id ? ' selected' : '');
          swatch.style.backgroundColor = c.hex;
          swatch.title = c.name;
          swatch.addEventListener('click', () => {
            if (!charData.parts[catId]) charData.parts[catId] = {};
            charData.parts[catId].colorId = c.id;
            // Sync hair color: changing one changes both
            if (catId === 'hair-back' || catId === 'hair-front') {
              if (charData.parts['hair-back']) charData.parts['hair-back'].colorId = c.id;
              if (charData.parts['hair-front']) charData.parts['hair-front'].colorId = c.id;
            }
            updatePreview();
            colorItems.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
          });
          colorItems.appendChild(swatch);
        });

        colorGroup.appendChild(colorItems);
        panel.appendChild(colorGroup);
      }
    }
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
    await Renderer.renderToStage('creator-preview', previewData, 0.9);
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
    App.showDone(saved);
  }

  return {
    init,
    nextStep,
    prevStep,
    getCurrentCharData: () => charData,
  };
})();

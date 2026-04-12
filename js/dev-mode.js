/* ============================================
   DEV MODE - Visual positioning editor v2
   Groups, all layers editable, zIndex control
   ============================================ */

const DevMode = (() => {
  let SCALE = 1; // dynamic, set by zoom
  const PADDING = 40; // body-coord margin around canvas
  const ANCHOR_COLORS = {
    head: '#e94560', eyeLine: '#53d8fb', nose: '#ffd700',
    mouth: '#ff69b4', hairTop: '#9b59b6', shoulders: '#2ecc71',
    torsoCenter: '#e67e22', waist: '#3498db', hips: '#1abc9c', feet: '#95a5a6',
  };
  // State
  let state = {
    bodyShapeId: 'child',
    skinMode: 'white',  // 'white' = no tint (grayscale), or a skin-tones color id
    selectedItems: {},
    selectedColors: {},
    // Overrides for ALL layers, keyed by layerKey
    // Each: { x, y, width, height, zIndex } in body-coords
    overrides: {},
    anchorOverrides: {},
    crops: {},              // layerKey -> { x, y, w, h } in % (0-100)
    notes: {},              // layerKey -> { text, hasDefect }
    selectedLayers: new Set(),
    visibility: {},
    showAnchors: false,
    showGrid: true,
  };

  let stage, mainLayer, anchorLayer, gridLayer;
  let transformer;
  let konvaNodes = [];
  let layerList = [];

  // ========== INIT ==========

  async function init() {
    await ConfigLoader.loadAll();
    populateSelectors();
    setupEvents();
    createStage();
    await renderAll();
  }

  function populateSelectors() {
    const selBody = document.getElementById('sel-body-shape');
    Catalog.getAllBodyShapes().forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label || s.id;
      selBody.appendChild(opt);
    });
    selBody.value = state.bodyShapeId;

    // Skin selector
    const selSkin = document.getElementById('sel-skin');
    const skinPalette = Catalog.getColorPalette('skin-tones');
    skinPalette.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.hex})`;
      selSkin.appendChild(opt);
    });
    selSkin.value = state.skinMode;

    const selCat = document.getElementById('sel-category');
    Catalog.getAllCategories().forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.category;
      opt.textContent = `${cat.label} (${cat.category})`;
      selCat.appendChild(opt);
    });

    for (const cat of Catalog.getAllCategories()) {
      const firstItem = cat.items.values().next().value;
      if (firstItem) state.selectedItems[cat.category] = firstItem.id;
    }

    updateItemSelector();
    updateColorSelector();
  }

  function updateItemSelector() {
    const selCat = document.getElementById('sel-category');
    const selItem = document.getElementById('sel-item');
    const catId = selCat.value;
    const cat = Catalog.getCategory(catId);
    selItem.innerHTML = '<option value="">-- nenhum --</option>';
    if (!cat) return;
    for (const [itemId, item] of cat.items) {
      const opt = document.createElement('option');
      opt.value = itemId;
      opt.textContent = `${item.name} (${itemId})`;
      selItem.appendChild(opt);
    }
    selItem.value = state.selectedItems[catId] || '';
  }

  function updateColorSelector() {
    const selCat = document.getElementById('sel-category');
    const selColor = document.getElementById('sel-color');
    const catId = selCat.value;
    const cat = Catalog.getCategory(catId);
    selColor.innerHTML = '<option value="">Sem cor</option>';
    if (!cat || !cat.colorPalette) return;
    const palette = Catalog.getColorPalette(cat.colorPalette);
    palette.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.hex})`;
      selColor.appendChild(opt);
    });
    selColor.value = state.selectedColors[catId] || '';
  }

  function setupEvents() {
    document.getElementById('sel-body-shape').addEventListener('change', (e) => {
      state.bodyShapeId = e.target.value;
      renderAll();
    });
    document.getElementById('sel-skin').addEventListener('change', (e) => {
      state.skinMode = e.target.value;
      renderAll();
    });
    document.getElementById('sel-category').addEventListener('change', () => {
      updateItemSelector();
      updateColorSelector();
    });
    document.getElementById('sel-item').addEventListener('change', (e) => {
      const catId = document.getElementById('sel-category').value;
      if (e.target.value) {
        state.selectedItems[catId] = e.target.value;
      } else {
        delete state.selectedItems[catId];
      }
      renderAll();
    });
    document.getElementById('sel-color').addEventListener('change', (e) => {
      const catId = document.getElementById('sel-category').value;
      state.selectedColors[catId] = e.target.value;
      renderAll();
    });
    document.getElementById('chk-show-anchors').addEventListener('change', (e) => {
      state.showAnchors = e.target.checked;
      renderAnchors();
    });
    document.getElementById('chk-show-grid').addEventListener('change', (e) => {
      state.showGrid = e.target.checked;
      gridLayer.visible(state.showGrid);
      stage.batchDraw();
    });

    // Selection buttons
    document.getElementById('btn-sel-category').addEventListener('click', () => {
      const catId = document.getElementById('sel-category').value;
      selectByCategory(catId);
    });
    document.getElementById('btn-sel-item').addEventListener('click', () => {
      const catId = document.getElementById('sel-category').value;
      const itemId = document.getElementById('sel-item').value;
      if (itemId) selectByItem(catId, itemId);
    });
    document.getElementById('btn-clear-sel').addEventListener('click', clearSelection);

    // Zoom
    document.querySelectorAll('.zoom-btn').forEach(btn => {
      btn.addEventListener('click', () => setZoom(parseInt(btn.dataset.zoom)));
    });
    document.getElementById('zoom-custom').addEventListener('change', (e) => {
      const val = Math.max(10, Math.min(400, parseInt(e.target.value) || 100));
      e.target.value = val;
      setZoom(val);
    });

    // Props
    ['prop-offset-x', 'prop-offset-y', 'prop-width', 'prop-height', 'prop-zindex', 'prop-scale'].forEach(id => {
      document.getElementById(id).addEventListener('input', onPropertyInput);
    });
    document.querySelectorAll('input[name="render-mode"]').forEach(r => {
      r.addEventListener('change', onRenderModeChange);
    });

    // Crop inputs
    ['prop-crop-x', 'prop-crop-y', 'prop-crop-w', 'prop-crop-h'].forEach(id => {
      document.getElementById(id).addEventListener('input', onCropInput);
    });
    document.getElementById('btn-reset-crop').addEventListener('click', onResetCrop);

    // Notes / defects
    document.getElementById('chk-defect').addEventListener('change', onDefectToggle);
    document.getElementById('prop-notes').addEventListener('input', onNotesInput);

    // Report
    document.getElementById('btn-defect-report').addEventListener('click', showDefectReport);
    document.getElementById('btn-report-close').addEventListener('click', () => {
      document.getElementById('report-overlay').classList.add('hidden');
    });
    document.getElementById('btn-report-copy').addEventListener('click', copyDefectReport);
    document.getElementById('btn-report-download').addEventListener('click', downloadDefectReport);

    document.getElementById('btn-copy-json').addEventListener('click', copyJSON);
    document.getElementById('btn-download-json').addEventListener('click', downloadAllJSON);
  }

  // ========== STAGE ==========

  function setZoom(pct) {
    SCALE = pct / 100;
    // Update UI
    document.querySelectorAll('.zoom-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.zoom) === pct);
    });
    document.getElementById('zoom-custom').value = pct;
    updateCanvasInfo();
    renderAll();
  }

  function updateCanvasInfo() {
    const pct = Math.round(SCALE * 100);
    document.getElementById('canvas-info').textContent = `600 x 800 @ ${pct}%`;
  }

  function createStage() {
    const shape = Catalog.getBodyShape(state.bodyShapeId);
    const w = (shape.dimensions.width + PADDING * 2) * SCALE;
    const h = (shape.dimensions.height + PADDING * 2) * SCALE;
    const container = document.getElementById('dev-canvas');
    container.style.width = w + 'px';
    container.style.height = h + 'px';

    stage = new Konva.Stage({ container: 'dev-canvas', width: w, height: h });
    gridLayer = new Konva.Layer();
    mainLayer = new Konva.Layer();
    anchorLayer = new Konva.Layer();
    stage.add(gridLayer);
    stage.add(mainLayer);
    stage.add(anchorLayer);

    transformer = new Konva.Transformer({
      rotateEnabled: false,
      keepRatio: false,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right',
                       'middle-left', 'middle-right', 'top-center', 'bottom-center'],
      borderStroke: '#53d8fb',
      borderStrokeWidth: 2,
      anchorStroke: '#53d8fb',
      anchorFill: '#1a1a2e',
      anchorSize: 8,
      boundBoxFunc: (old, box) => (box.width < 5 || box.height < 5) ? old : box,
    });
    mainLayer.add(transformer);
    drawGrid(shape);
    document.getElementById('canvas-info').textContent =
      `${shape.dimensions.width} x ${shape.dimensions.height} @ ${SCALE}x`;
  }

  function drawGrid(shape) {
    gridLayer.destroyChildren();
    const pad = PADDING * SCALE;
    const bw = shape.dimensions.width * SCALE;
    const bh = shape.dimensions.height * SCALE;
    const totalW = bw + pad * 2;
    const totalH = bh + pad * 2;
    const step = 20 * SCALE;

    // Grid lines over entire canvas
    for (let x = 0; x <= totalW; x += step) {
      gridLayer.add(new Konva.Line({
        points: [x, 0, x, totalH], stroke: '#fff', strokeWidth: 0.3, opacity: 0.12,
      }));
    }
    for (let y = 0; y <= totalH; y += step) {
      gridLayer.add(new Konva.Line({
        points: [0, y, totalW, y], stroke: '#fff', strokeWidth: 0.3, opacity: 0.12,
      }));
    }

    // Body boundary rectangle
    gridLayer.add(new Konva.Rect({
      x: pad, y: pad, width: bw, height: bh,
      stroke: '#e94560', strokeWidth: 1, opacity: 0.4, dash: [6, 4],
    }));

    // Center vertical line
    gridLayer.add(new Konva.Line({
      points: [pad + bw / 2, 0, pad + bw / 2, totalH],
      stroke: '#e94560', strokeWidth: 0.5, opacity: 0.3, dash: [6, 4],
    }));

    // ---- Guide lines: body proportions ----
    const cx = pad + bw / 2;
    const bodyW = shape.dimensions.width;
    const bodyH = shape.dimensions.height;

    // Guides relative to body canvas (% of height)
    const guides = [
      { pct: 0.15, label: 'Topo cabeca', color: '#9b59b6' },
      { pct: 0.30, label: 'Olhos', color: '#53d8fb' },
      { pct: 0.40, label: 'Queixo', color: '#ffd700' },
      { pct: 0.50, label: 'Ombros / Peito', color: '#2ecc71' },
      { pct: 0.65, label: 'Cintura', color: '#3498db' },
      { pct: 0.80, label: 'Joelhos (adulto)', color: '#e67e22' },
      { pct: 0.92, label: 'Pes (crianca)', color: '#e94560' },
      { pct: 1.00, label: 'Pes (adulto)', color: '#95a5a6' },
    ];

    for (const g of guides) {
      const y = pad + bodyH * g.pct * SCALE;
      // Dashed line
      gridLayer.add(new Konva.Line({
        points: [pad, y, pad + bw, y],
        stroke: g.color, strokeWidth: 0.8, opacity: 0.4, dash: [4, 4],
      }));
      // Label
      gridLayer.add(new Konva.Text({
        x: pad + bw + 4,
        y: y - 5,
        text: `${g.label} (${Math.round(g.pct * 100)}%)`,
        fontSize: 9 * SCALE / 2,
        fontFamily: 'JetBrains Mono',
        fill: g.color,
        opacity: 0.7,
      }));
    }

    // Vertical body-width guides (shoulders, hips)
    const bodyGuides = [
      { xPct: 0.25, label: 'L', color: '#2ecc71' },
      { xPct: 0.75, label: 'R', color: '#2ecc71' },
      { xPct: 0.33, label: '', color: '#3498db' },
      { xPct: 0.67, label: '', color: '#3498db' },
    ];
    for (const vg of bodyGuides) {
      const x = pad + bodyW * vg.xPct * SCALE;
      gridLayer.add(new Konva.Line({
        points: [x, pad, x, pad + bh],
        stroke: vg.color, strokeWidth: 0.4, opacity: 0.2, dash: [3, 6],
      }));
    }

    gridLayer.visible(state.showGrid);
  }

  // ========== LAYER BUILDING ==========

  function getLayerGroup(layer) {
    if (layer.type === 'body') return 'body';
    if (layer.type === 'face' || layer.type === 'body-part') return 'face';
    if (layer.type === 'hair') return 'hair';
    if (layer.type === 'clothing') {
      const cat = layer.categoryId ? Catalog.getCategory(layer.categoryId) : null;
      if (cat && cat.type === 'accessory') return 'accessory';
      return 'clothing';
    }
    return 'all';
  }

  function buildDevLayerList() {
    const shape = Catalog.getBodyShape(state.bodyShapeId);
    if (!shape) return [];

    // Skin color: 'white' = no tint (show grayscale), otherwise resolve from palette
    const skinHex = state.skinMode === 'white'
      ? null
      : (Renderer.resolveColor('skin-tones', state.skinMode) || null);
    const layers = [];

    // Body base - pass skin as tintColor for SVG grayscale tinting
    const bodyLayer = makeLayer('body', 'body', 'Body', shape.body, null,
      0, 0, shape.dimensions.width, shape.dimensions.height, 20, null, null, null);
    bodyLayer.tintColor = skinHex;
    layers.push(bodyLayer);

    // Neck (between body and head, zIndex 35)
    if (shape.neck) {
      const neckLayer = makeLayer('neck', 'body', 'Pescoco', shape.neck, null,
        0, 0, shape.dimensions.width, shape.dimensions.height, 35, null, null, null);
      neckLayer.tintColor = skinHex;
      layers.push(neckLayer);
    }

    // Face shape
    addAnchoredPart(layers, 'face-shapes', shape, null, 'face', skinHex);

    // Regular face parts
    for (const catId of ['eyes', 'eyebrows', 'noses', 'mouths', 'extras']) {
      addAnchoredPart(layers, catId, shape, null, 'body-part');
    }

    // Hair (anchor-based, same as renderer)
    const hairId = state.selectedItems['hair'];
    if (hairId) {
      const cat = Catalog.getCategory('hair');
      const item = cat?.items.get(hairId);
      if (item?.layers) {
        const hairColor = state.selectedColors['hair']
          ? Renderer.resolveColor('hair-colors', state.selectedColors['hair']) : null;
        for (const layer of item.layers) {
          const url = item.assets[layer.asset];
          if (!url) continue;
          const key = `hair.${hairId}.${layer.asset}`;
          const s = layer.size || { width: 120, height: 120 };
          const o = layer.offset || { x: 0, y: 0 };
          const anchorName = layer.anchor || 'head';
          const anchor = getAnchor(shape, anchorName);
          const lx = anchor.x - s.width / 2 + o.x;
          const ly = anchor.y - s.height / 2 + o.y;
          layers.push(makeLayer(key, 'hair', `Hair ${layer.asset}: ${item.name}`,
            url, hairColor,
            lx, ly, s.width, s.height,
            layer.zIndex, 'hair', hairId, anchorName));
        }
      }
    }

    // Clothing + Accessories (anchor-based, same as renderer)
    const outfitCats = Catalog.getCategoriesByType('clothing').concat(Catalog.getCategoriesByType('accessory'));
    for (const cat of outfitCats) {
      const itemId = state.selectedItems[cat.category];
      if (!itemId) continue;
      const item = cat.items.get(itemId);
      if (!item) continue;

      const isCol = cat.colorable || item.colorable;
      const pal = cat.colorPalette || item.colorPalette || 'clothing-colors';
      let color = null;
      if (isCol && state.selectedColors[cat.category])
        color = Renderer.resolveColor(pal, state.selectedColors[cat.category]);

      const key = `${cat.category}.${itemId}`;
      const anchorName = item.anchor || cat.anchor;
      const anchor = anchorName ? getAnchor(shape, anchorName)
        : { x: shape.dimensions.width / 2, y: shape.dimensions.height / 2 };
      const s = item.size || { width: 100, height: 100 };
      const o = item.offset || { x: 0, y: 0 };
      const lx = anchor.x - s.width / 2 + o.x;
      const ly = anchor.y - s.height / 2 + o.y;
      layers.push(makeLayer(key, 'clothing', `${cat.label}: ${item.name}`,
        item.asset, color,
        lx, ly, s.width, s.height,
        cat.zIndex, cat.category, itemId, anchorName));
    }

    // Store original dimensions, then apply overrides
    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      l.origWidth = l.width;
      l.origHeight = l.height;
      const ov = state.overrides[l.key];
      if (ov) {
        if (ov.x !== undefined) l.x = ov.x;
        if (ov.y !== undefined) l.y = ov.y;
        if (ov.width !== undefined) l.width = ov.width;
        if (ov.height !== undefined) l.height = ov.height;
        if (ov.zIndex !== undefined) l.zIndex = ov.zIndex;
      }
    }

    layers.sort((a, b) => a.zIndex - b.zIndex);
    return layers;
  }

  function addAnchoredPart(layers, catId, shape, forceColor, type, tintColor) {
    const itemId = state.selectedItems[catId];
    if (!itemId) return;
    const cat = Catalog.getCategory(catId);
    if (!cat) return;
    const item = cat.items.get(itemId);
    if (!item) return;

    const anchor = getAnchor(shape, cat.anchor);
    const s = item.size || { width: 60, height: 60 };
    const o = item.offset || { x: 0, y: 0 };

    let color = forceColor;
    if (!color && cat.colorable && state.selectedColors[catId]) {
      color = Renderer.resolveColor(cat.colorPalette, state.selectedColors[catId]);
    }

    const x = anchor.x - s.width / 2 + o.x;
    const y = anchor.y - s.height / 2 + o.y;

    const layer = makeLayer(`${catId}.${itemId}`, type, `${cat.label}: ${item.name}`,
      item.asset, color, x, y, s.width, s.height, cat.zIndex, catId, itemId, cat.anchor);
    if (tintColor) layer.tintColor = tintColor;
    layers.push(layer);
  }

  function makeLayer(key, type, label, assetUrl, color, x, y, w, h, zIndex, categoryId, itemId, anchorName) {
    return { key, type, label, assetUrl, color, x, y, width: w, height: h, zIndex, categoryId, itemId, anchorName };
  }

  function getAnchor(shape, anchorName) {
    if (!anchorName) return { x: 0, y: 0 };
    const k = `${shape.id}.${anchorName}`;
    return state.anchorOverrides[k] || shape.anchors[anchorName] || { x: 0, y: 0 };
  }

  // ========== RENDER ==========

  async function renderAll() {
    layerList = buildDevLayerList();
    konvaNodes = [];

    // Clear main layer (keep transformer)
    const children = mainLayer.getChildren().slice();
    children.forEach(c => { if (c !== transformer) c.destroy(); });
    transformer.nodes([]);

    const shape = Catalog.getBodyShape(state.bodyShapeId);
    const w = (shape.dimensions.width + PADDING * 2) * SCALE;
    const h = (shape.dimensions.height + PADDING * 2) * SCALE;
    stage.width(w);
    stage.height(h);
    const container = document.getElementById('dev-canvas');
    container.style.width = w + 'px';
    container.style.height = h + 'px';
    drawGrid(shape);

    const images = await Promise.all(
      layerList.map(l => Renderer.loadColorizedImage(l.assetUrl, l.color, l.tintColor))
    );

    for (let i = 0; i < layerList.length; i++) {
      const l = layerList[i];
      const img = images[i];
      if (!img) { konvaNodes.push(null); continue; }

      const vis = state.visibility[l.key] !== false;
      const node = new Konva.Image({
        image: img,
        x: (l.x + PADDING) * SCALE,
        y: (l.y + PADDING) * SCALE,
        width: l.width * SCALE,
        height: l.height * SCALE,
        draggable: true,
        visible: vis,
        opacity: vis ? 1 : 0.15,
      });

      // Apply crop if defined
      const crop = state.crops[l.key];
      if (crop) {
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        node.crop({
          x: Math.round(imgW * crop.x / 100),
          y: Math.round(imgH * crop.y / 100),
          width: Math.round(imgW * crop.w / 100),
          height: Math.round(imgH * crop.h / 100),
        });
      }

      node.on('click tap', (e) => {
        if (e.evt.shiftKey) {
          toggleLayerSelection(i);
        } else {
          selectLayerOnly(i);
        }
      });
      node.on('dragmove', () => onDragMove(i, node));
      node.on('dragend', () => onDragEnd(i, node));
      node.on('transformend', () => onTransformEnd(i, node));

      mainLayer.add(node);
      konvaNodes.push(node);
    }

    transformer.moveToTop();
    mainLayer.batchDraw();
    updateLayerListUI();
    updateAnchorListUI();
    if (state.showAnchors) renderAnchors();

    // Restore selection
    applySelection();
  }

  // ========== SELECTION ==========

  function selectLayerOnly(idx) {
    state.selectedLayers.clear();
    state.selectedLayers.add(idx);
    applySelection();
  }

  function toggleLayerSelection(idx) {
    if (state.selectedLayers.has(idx)) {
      state.selectedLayers.delete(idx);
    } else {
      state.selectedLayers.add(idx);
    }
    applySelection();
  }

  function selectByCategory(catId) {
    state.selectedLayers.clear();
    layerList.forEach((l, i) => {
      if (l.categoryId === catId) state.selectedLayers.add(i);
    });
    applySelection();
  }

  function selectByItem(catId, itemId) {
    state.selectedLayers.clear();
    layerList.forEach((l, i) => {
      if (l.categoryId === catId && l.itemId === itemId) state.selectedLayers.add(i);
    });
    applySelection();
  }

  function clearSelection() {
    state.selectedLayers.clear();
    applySelection();
  }

  function applySelection() {
    const selArr = [...state.selectedLayers].filter(i => i < konvaNodes.length && konvaNodes[i]);
    const nodes = selArr.map(i => konvaNodes[i]).filter(Boolean);

    // All nodes are always draggable, but transformer only on selected
    if (nodes.length > 0) {
      transformer.nodes(nodes);
    } else {
      transformer.nodes([]);
    }

    mainLayer.batchDraw();
    updateLayerListUI();

    // Show props for single selection
    if (state.selectedLayers.size === 1) {
      updatePropertyPanel([...state.selectedLayers][0]);
    } else if (state.selectedLayers.size > 1) {
      showMultiSelectProps();
    } else {
      clearPropertyPanel();
    }
  }

  // ========== DRAG HANDLERS ==========

  function onDragMove(idx, node) {
    // If this layer is in a group selection, move all selected layers together
    if (state.selectedLayers.has(idx) && state.selectedLayers.size > 1) {
      // Konva Transformer handles group dragging automatically
    }
  }

  function onDragEnd(idx, node) {
    // Update override with new position (canvas → body coords)
    const l = layerList[idx];
    const newX = Math.round(node.x() / SCALE - PADDING);
    const newY = Math.round(node.y() / SCALE - PADDING);

    if (!state.overrides[l.key]) state.overrides[l.key] = {};
    state.overrides[l.key].x = newX;
    state.overrides[l.key].y = newY;

    // If multi-select, update all selected layers
    if (state.selectedLayers.size > 1) {
      for (const si of state.selectedLayers) {
        if (si === idx || !konvaNodes[si]) continue;
        const sl = layerList[si];
        const sn = konvaNodes[si];
        if (!state.overrides[sl.key]) state.overrides[sl.key] = {};
        state.overrides[sl.key].x = Math.round(sn.x() / SCALE - PADDING);
        state.overrides[sl.key].y = Math.round(sn.y() / SCALE - PADDING);
      }
    }

    if (state.selectedLayers.size === 1) updatePropertyPanel(idx);
  }

  function onTransformEnd(idx, node) {
    const l = layerList[idx];
    const newW = Math.round(node.width() * node.scaleX());
    const newH = Math.round(node.height() * node.scaleY());
    node.scaleX(1);
    node.scaleY(1);
    node.width(newW);
    node.height(newH);

    const newX = Math.round(node.x() / SCALE - PADDING);
    const newY = Math.round(node.y() / SCALE - PADDING);

    if (!state.overrides[l.key]) state.overrides[l.key] = {};
    state.overrides[l.key].x = newX;
    state.overrides[l.key].y = newY;
    state.overrides[l.key].width = Math.round(newW / SCALE);
    state.overrides[l.key].height = Math.round(newH / SCALE);

    if (state.selectedLayers.size === 1) updatePropertyPanel(idx);
  }

  // ========== PROPERTY PANEL ==========

  function updatePropertyPanel(idx) {
    document.getElementById('props-empty').classList.add('hidden');
    document.getElementById('props-form').classList.remove('hidden');

    const l = layerList[idx];
    document.getElementById('prop-category').textContent = l.categoryId || l.type;
    document.getElementById('prop-item').textContent = l.itemId || l.key;
    document.getElementById('prop-type').textContent = l.type;
    document.getElementById('prop-anchor').textContent = l.anchorName || '-';

    const ov = state.overrides[l.key] || {};
    document.getElementById('prop-offset-x').value = ov.x !== undefined ? ov.x : l.x;
    document.getElementById('prop-offset-y').value = ov.y !== undefined ? ov.y : l.y;
    document.getElementById('prop-width').value = ov.width !== undefined ? ov.width : l.width;
    document.getElementById('prop-height').value = ov.height !== undefined ? ov.height : l.height;
    document.getElementById('prop-zindex').value = ov.zIndex !== undefined ? ov.zIndex : l.zIndex;

    const currentW = ov.width !== undefined ? ov.width : l.width;
    const scale = l.origWidth > 0 ? currentW / l.origWidth : 1;
    document.getElementById('prop-scale').value = parseFloat(scale.toFixed(2));

    // Update crop + notes
    updateNotesPanel(l.key);
  }

  function showMultiSelectProps() {
    document.getElementById('props-empty').classList.add('hidden');
    document.getElementById('props-form').classList.remove('hidden');
    document.getElementById('prop-category').textContent = `${state.selectedLayers.size} selecionados`;
    document.getElementById('prop-item').textContent = 'grupo';
    document.getElementById('prop-type').textContent = '-';
    document.getElementById('prop-anchor').textContent = '-';
  }

  function clearPropertyPanel() {
    document.getElementById('props-empty').classList.remove('hidden');
    document.getElementById('props-form').classList.add('hidden');
  }

  function onPropertyInput(e) {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) return;
    const field = e.target.id;

    for (const idx of state.selectedLayers) {
      const l = layerList[idx];
      if (!state.overrides[l.key]) state.overrides[l.key] = {};
      const ov = state.overrides[l.key];

      switch (field) {
        case 'prop-offset-x': ov.x = val; break;
        case 'prop-offset-y': ov.y = val; break;
        case 'prop-width': ov.width = val; break;
        case 'prop-height': ov.height = val; break;
        case 'prop-zindex': ov.zIndex = val; break;
        case 'prop-scale':
          ov.width = Math.round(l.origWidth * val);
          ov.height = Math.round(l.origHeight * val);
          break;
      }
    }
    renderAll();
  }

  function onRenderModeChange() {
    // Not needed in v2 since all layers track x,y,w,h directly
  }

  // ========== LAYER LIST ==========

  function updateLayerListUI() {
    const list = document.getElementById('layer-list');
    list.innerHTML = '';
    document.getElementById('layer-count').textContent = layerList.length;

    layerList.forEach((l, i) => {
      const selected = state.selectedLayers.has(i);
      const vis = state.visibility[l.key] !== false;
      const group = getLayerGroup(l);

      const note = state.notes[l.key];
      const hasDefect = note && note.hasDefect;

      const el = document.createElement('div');
      el.className = 'layer-item' + (selected ? ' selected' : '') + (hasDefect ? ' has-defect' : '');
      el.innerHTML = `
        <input type="checkbox" class="layer-vis" ${vis ? 'checked' : ''}>
        ${hasDefect ? '<span class="defect-dot"></span>' : ''}
        <span class="layer-z">${l.zIndex}</span>
        <span class="layer-name" title="${l.key}">${l.label}</span>
        <span class="layer-type ${group}">${group}</span>
      `;

      // Click to select (shift for multi)
      el.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') return;
        if (e.shiftKey) {
          toggleLayerSelection(i);
        } else {
          selectLayerOnly(i);
        }
      });

      // Visibility
      el.querySelector('.layer-vis').addEventListener('change', (e) => {
        state.visibility[l.key] = e.target.checked;
        if (konvaNodes[i]) {
          konvaNodes[i].visible(e.target.checked);
          konvaNodes[i].opacity(e.target.checked ? 1 : 0.15);
        }
        mainLayer.batchDraw();
      });

      list.appendChild(el);
    });
  }

  // ========== ANCHORS ==========

  function renderAnchors() {
    anchorLayer.destroyChildren();
    if (!state.showAnchors) { anchorLayer.batchDraw(); return; }

    const shape = Catalog.getBodyShape(state.bodyShapeId);
    for (const [name] of Object.entries(shape.anchors)) {
      const anchor = getAnchor(shape, name);
      const color = ANCHOR_COLORS[name] || '#fff';

      const circle = new Konva.Circle({
        x: (anchor.x + PADDING) * SCALE, y: (anchor.y + PADDING) * SCALE,
        radius: 7, fill: color, stroke: '#fff', strokeWidth: 2, draggable: true, opacity: 0.9,
      });
      const label = new Konva.Text({
        x: (anchor.x + PADDING) * SCALE + 12, y: (anchor.y + PADDING) * SCALE - 6,
        text: `${name} (${anchor.x},${anchor.y})`, fontSize: 10,
        fontFamily: 'JetBrains Mono', fill: color,
      });

      circle.on('dragmove', () => {
        label.x(circle.x() + 12);
        label.y(circle.y() - 6);
        const nx = Math.round(circle.x() / SCALE - PADDING);
        const ny = Math.round(circle.y() / SCALE - PADDING);
        label.text(`${name} (${nx},${ny})`);
        anchorLayer.batchDraw();
      });

      circle.on('dragend', () => {
        state.anchorOverrides[`${state.bodyShapeId}.${name}`] = {
          x: Math.round(circle.x() / SCALE - PADDING),
          y: Math.round(circle.y() / SCALE - PADDING),
        };
        updateAnchorListUI();
        renderAll();
      });

      anchorLayer.add(circle);
      anchorLayer.add(label);
    }
    anchorLayer.batchDraw();
  }

  function updateAnchorListUI() {
    const list = document.getElementById('anchor-list');
    list.innerHTML = '';
    const shape = Catalog.getBodyShape(state.bodyShapeId);
    for (const [name] of Object.entries(shape.anchors)) {
      const a = getAnchor(shape, name);
      const c = ANCHOR_COLORS[name] || '#999';
      const el = document.createElement('div');
      el.className = 'anchor-item';
      el.innerHTML = `<span class="anchor-dot" style="background:${c}"></span>
        <span>${name}</span><span class="anchor-coords">(${a.x}, ${a.y})</span>`;
      list.appendChild(el);
    }
  }

  // ========== EXPORT ==========

  function generateModifiedJSON() {
    const files = {};
    const shape = Catalog.getBodyShape(state.bodyShapeId);

    for (const [key, ov] of Object.entries(state.overrides)) {
      // Find which layer this belongs to
      const layer = layerList.find(l => l.key === key);
      if (!layer || !layer.categoryId) continue;

      const catId = layer.categoryId;
      const itemId = layer.itemId;
      const cat = Catalog.getCategory(catId);
      if (!cat) continue;

      if (!files[catId]) {
        const items = [];
        for (const [, item] of cat.items) {
          items.push(JSON.parse(JSON.stringify(item)));
        }
        files[catId] = {
          version: '1.0', category: cat.category, type: cat.type,
          ...(cat.slotId ? { slotId: cat.slotId } : {}),
          label: cat.label,
          ...(cat.anchor ? { anchor: cat.anchor } : {}),
          zIndex: cat.zIndex,
          colorable: cat.colorable,
          ...(cat.colorPalette ? { colorPalette: cat.colorPalette } : {}),
          ...(cat.conflicts ? { conflicts: cat.conflicts } : {}),
          items,
        };
      }

      const fileItem = files[catId].items.find(i => i.id === itemId);
      if (!fileItem) continue;

      // Convert absolute x,y back to offset relative to anchor
      if (layer.anchorName && (ov.x !== undefined || ov.y !== undefined)) {
        const anchor = getAnchor(shape, layer.anchorName);
        const w = ov.width !== undefined ? ov.width : (fileItem.size?.width || layer.width);
        const h = ov.height !== undefined ? ov.height : (fileItem.size?.height || layer.height);
        fileItem.offset = {
          x: Math.round((ov.x !== undefined ? ov.x : layer.x) - anchor.x + w / 2),
          y: Math.round((ov.y !== undefined ? ov.y : layer.y) - anchor.y + h / 2),
        };
      }
      if (ov.width !== undefined || ov.height !== undefined) {
        fileItem.size = {
          width: ov.width !== undefined ? ov.width : (fileItem.size?.width || layer.width),
          height: ov.height !== undefined ? ov.height : (fileItem.size?.height || layer.height),
        };
      }
      if (ov.zIndex !== undefined) {
        fileItem.zIndex = ov.zIndex;
      }
    }

    // Anchor overrides
    if (Object.keys(state.anchorOverrides).length > 0) {
      const shapes = Catalog.getAllBodyShapes().map(s => {
        const mod = JSON.parse(JSON.stringify(s));
        for (const [an] of Object.entries(mod.anchors)) {
          const k = `${s.id}.${an}`;
          if (state.anchorOverrides[k]) mod.anchors[an] = { ...mod.anchors[an], ...state.anchorOverrides[k] };
        }
        return mod;
      });
      files['body-shapes'] = { version: '1.0', type: 'body-shapes', shapes };
    }

    return files;
  }

  function copyJSON() {
    const files = generateModifiedJSON();
    const text = JSON.stringify(files, null, 2);
    navigator.clipboard.writeText(text).then(() => showToast('JSON copiado!'));
  }

  function downloadAllJSON() {
    const files = generateModifiedJSON();
    if (Object.keys(files).length === 0) {
      showToast('Nenhuma modificacao para exportar');
      return;
    }
    for (const [name, data] of Object.entries(files)) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
    showToast(`${Object.keys(files).length} arquivo(s) baixado(s)!`);
  }

  // ========== CROP ==========

  function onCropInput() {
    if (state.selectedLayers.size !== 1) return;
    const idx = [...state.selectedLayers][0];
    const l = layerList[idx];

    const cx = parseFloat(document.getElementById('prop-crop-x').value) || 0;
    const cy = parseFloat(document.getElementById('prop-crop-y').value) || 0;
    const cw = parseFloat(document.getElementById('prop-crop-w').value) || 100;
    const ch = parseFloat(document.getElementById('prop-crop-h').value) || 100;

    state.crops[l.key] = { x: cx, y: cy, w: cw, h: ch };
    renderAll();
  }

  function onResetCrop() {
    if (state.selectedLayers.size !== 1) return;
    const idx = [...state.selectedLayers][0];
    const l = layerList[idx];
    delete state.crops[l.key];
    document.getElementById('prop-crop-x').value = 0;
    document.getElementById('prop-crop-y').value = 0;
    document.getElementById('prop-crop-w').value = 100;
    document.getElementById('prop-crop-h').value = 100;
    renderAll();
  }

  // ========== NOTES / DEFECTS ==========

  function onDefectToggle(e) {
    if (state.selectedLayers.size !== 1) return;
    const idx = [...state.selectedLayers][0];
    const l = layerList[idx];
    if (!state.notes[l.key]) state.notes[l.key] = { text: '', hasDefect: false };
    state.notes[l.key].hasDefect = e.target.checked;
    updateLayerListUI();
  }

  function onNotesInput(e) {
    if (state.selectedLayers.size !== 1) return;
    const idx = [...state.selectedLayers][0];
    const l = layerList[idx];
    if (!state.notes[l.key]) state.notes[l.key] = { text: '', hasDefect: false };
    state.notes[l.key].text = e.target.value;
  }

  function updateNotesPanel(layerKey) {
    const note = state.notes[layerKey] || { text: '', hasDefect: false };
    document.getElementById('chk-defect').checked = note.hasDefect;
    document.getElementById('prop-notes').value = note.text;

    const crop = state.crops[layerKey] || { x: 0, y: 0, w: 100, h: 100 };
    document.getElementById('prop-crop-x').value = crop.x;
    document.getElementById('prop-crop-y').value = crop.y;
    document.getElementById('prop-crop-w').value = crop.w;
    document.getElementById('prop-crop-h').value = crop.h;
  }

  // ========== DEFECT REPORT ==========

  function getDefectList() {
    const defects = [];
    for (const [key, note] of Object.entries(state.notes)) {
      if (note.hasDefect || note.text.trim()) {
        const layer = layerList.find(l => l.key === key);
        defects.push({
          key,
          label: layer ? layer.label : key,
          assetUrl: layer ? layer.assetUrl : '',
          hasDefect: note.hasDefect,
          text: note.text,
          crop: state.crops[key] || null,
        });
      }
    }
    return defects;
  }

  function showDefectReport() {
    const defects = getDefectList();
    const content = document.getElementById('report-content');

    if (defects.length === 0) {
      content.innerHTML = '<p style="color:var(--dev-text-dim)">Nenhum defeito reportado.</p>';
    } else {
      content.innerHTML = defects.map(d => `
        <div class="report-item">
          <div class="report-asset">${d.hasDefect ? '🔴' : '📝'} ${d.label}</div>
          <div class="report-asset" style="font-size:10px;opacity:0.6">${d.assetUrl}</div>
          ${d.text ? `<div class="report-note">${d.text}</div>` : ''}
          ${d.crop ? `<div class="report-note" style="color:var(--dev-accent2);font-size:10px">Crop: x=${d.crop.x}% y=${d.crop.y}% w=${d.crop.w}% h=${d.crop.h}%</div>` : ''}
        </div>
      `).join('');
    }

    document.getElementById('report-overlay').classList.remove('hidden');
  }

  function defectReportToMarkdown() {
    const defects = getDefectList();
    let md = '# Lauren Fashion - Relatorio de Defeitos\n\n';
    md += `Data: ${new Date().toISOString().split('T')[0]}\n`;
    md += `Body shape: ${state.bodyShapeId}\n`;
    md += `Total: ${defects.length} item(s)\n\n`;

    for (const d of defects) {
      md += `## ${d.hasDefect ? '🔴' : '📝'} ${d.label}\n`;
      md += `- Asset: \`${d.assetUrl}\`\n`;
      if (d.text) md += `- Nota: ${d.text}\n`;
      if (d.crop) md += `- Crop: x=${d.crop.x}% y=${d.crop.y}% w=${d.crop.w}% h=${d.crop.h}%\n`;
      md += '\n';
    }
    return md;
  }

  function copyDefectReport() {
    navigator.clipboard.writeText(defectReportToMarkdown()).then(() => showToast('Relatorio copiado!'));
  }

  function downloadDefectReport() {
    const md = defectReportToMarkdown();
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'defects-report.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Relatorio baixado!');
  }

  // ========== UTILS ==========

  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => DevMode.init());

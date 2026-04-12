/* ============================================
   ADMIN - SVG Asset Editor with Paper.js
   ============================================ */

const Admin = (() => {
  const CANVAS_W = 600, CANVAS_H = 800;
  let zoom = 0.8;
  let currentTool = 'pen';
  let selectedPath = null;
  let selectedSegment = null;
  let currentPath = null; // path being drawn
  let konvaStage = null;

  // Paper.js refs
  let penTool, selectTool, moveTool;
  let guidesLayer, drawingLayer;

  // ========== INIT ==========

  async function init() {
    await ConfigLoader.loadAll();
    setupKonvaPreview();
    setupPaperJs();
    setupTools();
    setupEvents();
    applyZoom();
    updateLayerList();
  }

  // ========== KONVA PREVIEW ==========

  function setupKonvaPreview() {
    const charData = {
      body: { shapeId: document.getElementById('sel-body').value, skinColorId: 'skin-3' },
      parts: {
        'face-shapes': { itemId: 'face-round' },
        eyes: { itemId: 'eyes-round', colorId: 'brown' },
        noses: { itemId: 'nose-small' },
        mouths: { itemId: 'mouth-smile' },
        'hair-back': null,
        'hair-front': null,
        eyebrows: null, extras: null, 'facial-hair': null,
      },
      outfit: {},
    };
    Renderer.renderToStage('konva-preview', charData, zoom);
  }

  // ========== PAPER.JS SETUP ==========

  function setupPaperJs() {
    const canvas = document.getElementById('paper-canvas');
    paper.setup(canvas);

    // Create layers
    guidesLayer = new paper.Layer({ name: 'guides' });
    drawingLayer = new paper.Layer({ name: 'drawing' });
    drawingLayer.activate();

    drawGuides();
    paper.view.draw();
  }

  function drawGuides() {
    guidesLayer.activate();
    guidesLayer.removeChildren();

    const show = document.getElementById('chk-guides').checked;
    if (!show) { drawingLayer.activate(); return; }

    const guides = [
      { y: 186, label: 'Head top', color: '#9b59b6' },
      { y: 240, label: 'Franja MAX', color: '#e94560' },
      { y: 260, label: 'Eyes top', color: '#53d8fb' },
      { y: 290, label: 'Head center', color: '#fff' },
      { y: 394, label: 'Chin', color: '#ffd700' },
      { y: 420, label: 'Shoulders', color: '#2ecc71' },
    ];

    guides.forEach(g => {
      const line = new paper.Path.Line({
        from: [0, g.y], to: [CANVAS_W, g.y],
        strokeColor: g.color, strokeWidth: 0.8, dashArray: [6, 4], opacity: 0.5,
      });
      new paper.PointText({
        point: [CANVAS_W - 5, g.y - 3],
        content: g.label, fillColor: g.color, fontSize: 9,
        fontFamily: 'JetBrains Mono', justification: 'right', opacity: 0.6,
      });
    });

    // Head outline reference
    new paper.Path({
      pathData: 'M325 186C371.392 186 409 223.608 409 270V310C409 356.392 371.392 394 325 394H275C228.608 394 191 356.392 191 310V270C191 223.608 228.608 186 275 186H325Z',
      strokeColor: '#ffffff', strokeWidth: 1, dashArray: [4, 4], opacity: 0.25,
    });

    drawingLayer.activate();
  }

  // ========== TOOLS ==========

  function setupTools() {
    // PEN TOOL
    penTool = new paper.Tool();
    penTool.onMouseDown = function(event) {
      if (!currentPath) {
        // Start new path
        currentPath = new paper.Path({
          strokeColor: document.getElementById('prop-stroke').value,
          strokeWidth: parseInt(document.getElementById('prop-stroke-width').value),
          fillColor: document.getElementById('prop-fill').value,
          strokeCap: 'round', strokeJoin: 'round',
        });
        currentPath.add(event.point);
      } else {
        // Check if closing the path (clicking near first point)
        const first = currentPath.firstSegment.point;
        if (currentPath.segments.length > 2 && event.point.getDistance(first) < 15) {
          currentPath.closePath();
          finishPath();
          return;
        }
        currentPath.add(event.point);
      }
      setStatus(`Pen: ${currentPath.segments.length} pontos. Clique proximo do 1o ponto para fechar.`);
    };

    penTool.onMouseDrag = function(event) {
      if (currentPath && currentPath.lastSegment) {
        // Dragging creates bezier handles
        currentPath.lastSegment.handleOut = event.point.subtract(currentPath.lastSegment.point);
        currentPath.lastSegment.handleIn = currentPath.lastSegment.handleOut.multiply(-1);
      }
    };

    penTool.onKeyDown = function(event) {
      if (event.key === 'escape' && currentPath) {
        finishPath();
      }
      if (event.key === 'z' && event.modifiers.command && currentPath && currentPath.segments.length > 1) {
        currentPath.removeSegment(currentPath.segments.length - 1);
      }
    };

    // SELECT TOOL
    selectTool = new paper.Tool();
    selectTool.onMouseDown = function(event) {
      const hitResult = paper.project.hitTest(event.point, {
        segments: true, stroke: true, fill: true, tolerance: 8,
        match: (hr) => hr.item.layer === drawingLayer,
      });

      if (!hitResult) {
        deselectAll();
        return;
      }

      if (hitResult.type === 'segment') {
        selectPath(hitResult.item);
        selectedSegment = hitResult.segment;
        setStatus(`Editando ponto ${hitResult.segment.index}`);
      } else {
        selectPath(hitResult.item);
        selectedSegment = null;
      }
    };

    selectTool.onMouseDrag = function(event) {
      if (selectedSegment) {
        selectedSegment.point = selectedSegment.point.add(event.delta);
        updateProps();
      } else if (selectedPath) {
        selectedPath.position = selectedPath.position.add(event.delta);
      }
    };

    // MOVE TOOL
    moveTool = new paper.Tool();
    moveTool.onMouseDown = function(event) {
      const hitResult = paper.project.hitTest(event.point, {
        fill: true, stroke: true, tolerance: 8,
        match: (hr) => hr.item.layer === drawingLayer,
      });
      if (hitResult) {
        selectPath(hitResult.item);
      } else {
        deselectAll();
      }
    };
    moveTool.onMouseDrag = function(event) {
      if (selectedPath) {
        selectedPath.position = selectedPath.position.add(event.delta);
      }
    };

    // Set initial tool
    penTool.activate();
  }

  function finishPath() {
    if (currentPath) {
      if (currentPath.segments.length < 2) {
        currentPath.remove();
      } else {
        currentPath.name = `path-${drawingLayer.children.length}`;
        selectPath(currentPath);
      }
      currentPath = null;
      updateLayerList();
      updateSvgOutput();
      setStatus('Path finalizado. Clique para novo path ou troque de ferramenta.');
    }
  }

  function selectPath(path) {
    deselectAll();
    selectedPath = path;
    selectedPath.selected = true;
    selectedPath.fullySelected = true;
    updateProps();
    updateLayerList();
  }

  function deselectAll() {
    if (selectedPath) {
      selectedPath.selected = false;
      selectedPath.fullySelected = false;
    }
    selectedPath = null;
    selectedSegment = null;
    document.getElementById('props-empty').classList.remove('hidden');
    document.getElementById('props-form').classList.add('hidden');
    updateLayerList();
  }

  function deleteSelected() {
    if (selectedSegment && selectedPath) {
      selectedPath.removeSegment(selectedSegment.index);
      selectedSegment = null;
      if (selectedPath.segments.length === 0) {
        selectedPath.remove();
        selectedPath = null;
      }
    } else if (selectedPath) {
      selectedPath.remove();
      selectedPath = null;
    }
    deselectAll();
    updateLayerList();
    updateSvgOutput();
  }

  function setActiveTool(name) {
    currentTool = name;
    if (currentPath) finishPath();
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === name));

    switch (name) {
      case 'pen': penTool.activate(); setStatus('Pen Tool - Clique para pontos, arraste para curvas'); break;
      case 'select': selectTool.activate(); setStatus('Select - Clique em path para editar pontos'); break;
      case 'move': moveTool.activate(); setStatus('Move - Arraste paths'); break;
      case 'delete': deleteSelected(); setActiveTool('select'); break;
    }
  }

  // ========== PROPERTIES ==========

  function updateProps() {
    if (!selectedPath) {
      document.getElementById('props-empty').classList.remove('hidden');
      document.getElementById('props-form').classList.add('hidden');
      return;
    }
    document.getElementById('props-empty').classList.add('hidden');
    document.getElementById('props-form').classList.remove('hidden');

    const fc = selectedPath.fillColor;
    const sc = selectedPath.strokeColor;
    document.getElementById('prop-fill').value = fc ? fc.toCSS(true) : '#FF00FF';
    document.getElementById('prop-stroke').value = sc ? sc.toCSS(true) : '#CC00CC';
    document.getElementById('prop-stroke-width').value = selectedPath.strokeWidth || 6;
    document.getElementById('prop-opacity').value = (selectedPath.opacity || 1) * 100;
    document.getElementById('prop-opacity-value').textContent = Math.round((selectedPath.opacity || 1) * 100) + '%';
    document.getElementById('prop-closed').checked = selectedPath.closed;
    document.getElementById('point-count').textContent = selectedPath.segments.length + ' pontos';
  }

  function applyProp(prop, value) {
    if (!selectedPath) return;
    switch (prop) {
      case 'fill': selectedPath.fillColor = value === 'none' ? null : value; break;
      case 'stroke': selectedPath.strokeColor = value; break;
      case 'stroke-width': selectedPath.strokeWidth = parseFloat(value); break;
      case 'opacity': selectedPath.opacity = parseFloat(value) / 100; break;
      case 'closed':
        if (value) selectedPath.closePath();
        else selectedPath.open(); // paper.js doesn't have open(), we just set closed
        selectedPath.closed = value;
        break;
    }
    updateSvgOutput();
  }

  // ========== LAYERS ==========

  function updateLayerList() {
    const list = document.getElementById('layer-list');
    list.innerHTML = '';
    const children = drawingLayer.children.filter(c => c instanceof paper.Path || c instanceof paper.CompoundPath);
    document.getElementById('layer-count').textContent = children.length;

    children.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = 'layer-item' + (item === selectedPath ? ' selected' : '');
      const fc = item.fillColor ? item.fillColor.toCSS(true) : 'transparent';
      el.innerHTML = `
        <input type="checkbox" ${item.visible ? 'checked' : ''}>
        <span class="layer-color" style="background:${fc}"></span>
        <span class="layer-name">${item.name || 'path-' + i}</span>
      `;
      el.addEventListener('click', (e) => {
        if (e.target.type === 'checkbox') {
          item.visible = e.target.checked;
          return;
        }
        selectPath(item);
      });
      el.querySelector('input').addEventListener('change', (e) => {
        item.visible = e.target.checked;
      });
      list.appendChild(el);
    });
  }

  // ========== IMPORT / EXPORT ==========

  function exportSvg() {
    drawingLayer.activate();
    // Temporarily deselect for clean export
    const wasSelected = selectedPath;
    deselectAll();

    const svgString = paper.project.exportSVG({ asString: true, bounds: new paper.Rectangle(0, 0, CANVAS_W, CANVAS_H) });

    // Clean up: replace paper.js viewBox with our standard
    let clean = svgString
      .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${CANVAS_W} ${CANVAS_H}"`)
      .replace(/width="[^"]*"/, '')
      .replace(/height="[^"]*"/, '');

    // Remove guide elements (they're on a different layer but paper exports all)
    // Just export drawing layer items manually
    let paths = '';
    drawingLayer.children.forEach(item => {
      if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
        paths += '  ' + item.exportSVG({ asString: true }) + '\n';
      }
    });

    clean = `<svg viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${paths}</svg>`;

    document.getElementById('svg-output').value = clean;

    if (wasSelected) selectPath(wasSelected);
    return clean;
  }

  function updateSvgOutput() {
    exportSvg();
  }

  function importSvg(svgString) {
    drawingLayer.activate();
    const imported = paper.project.importSVG(svgString, { insert: false });
    if (imported) {
      // Flatten groups - add all paths directly to drawingLayer
      if (imported instanceof paper.Group) {
        imported.children.forEach((child, i) => {
          if (child instanceof paper.Path || child instanceof paper.CompoundPath) {
            child.name = `imported-${i}`;
            drawingLayer.addChild(child.clone());
          }
        });
      } else if (imported instanceof paper.Path) {
        imported.name = 'imported-0';
        drawingLayer.addChild(imported);
      }
      updateLayerList();
      updateSvgOutput();
      toast('SVG importado!');
    }
  }

  function downloadSvg() {
    const svgStr = exportSvg();
    const category = document.getElementById('sel-category').value;
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category}-new.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('SVG baixado!');
  }

  function copySvg() {
    const svgStr = exportSvg();
    navigator.clipboard.writeText(svgStr).then(() => toast('SVG copiado!'));
  }

  // ========== ZOOM ==========

  function applyZoom() {
    const w = Math.round(CANVAS_W * zoom);
    const h = Math.round(CANVAS_H * zoom);

    // Paper.js canvas
    const paperCanvas = document.getElementById('paper-canvas');
    paperCanvas.width = w;
    paperCanvas.height = h;
    paperCanvas.style.width = w + 'px';
    paperCanvas.style.height = h + 'px';

    // Resize paper view
    paper.view.viewSize = new paper.Size(w, h);
    paper.view.matrix = new paper.Matrix().scale(zoom);
    paper.view.draw();

    // Konva preview
    setupKonvaPreview();

    document.getElementById('zoom-value').textContent = Math.round(zoom * 100) + '%';
  }

  // ========== EVENTS ==========

  function setupEvents() {
    // Tools
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'p': setActiveTool('pen'); break;
        case 'v': setActiveTool('select'); break;
        case 'm': setActiveTool('move'); break;
        case 'Delete': case 'Backspace': deleteSelected(); break;
        case 'Escape':
          if (currentPath) finishPath();
          else deselectAll();
          break;
      }
    });

    // Properties
    document.getElementById('prop-fill').addEventListener('input', (e) => applyProp('fill', e.target.value));
    document.getElementById('prop-stroke').addEventListener('input', (e) => applyProp('stroke', e.target.value));
    document.getElementById('prop-stroke-width').addEventListener('input', (e) => applyProp('stroke-width', e.target.value));
    document.getElementById('prop-opacity').addEventListener('input', (e) => {
      applyProp('opacity', e.target.value);
      document.getElementById('prop-opacity-value').textContent = e.target.value + '%';
    });
    document.getElementById('prop-closed').addEventListener('change', (e) => applyProp('closed', e.target.checked));

    // Color presets
    document.querySelectorAll('.color-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        const parent = btn.parentElement;
        const input = parent.querySelector('input[type=color]');
        if (color === 'none') {
          applyProp('fill', 'none');
        } else {
          input.value = color;
          const prop = input.id.includes('fill') ? 'fill' : 'stroke';
          applyProp(prop, color);
        }
      });
    });

    // Body shape
    document.getElementById('sel-body').addEventListener('change', () => setupKonvaPreview());

    // Guides
    document.getElementById('chk-guides').addEventListener('change', () => drawGuides());

    // Zoom
    document.getElementById('zoom-slider').addEventListener('input', (e) => {
      zoom = parseInt(e.target.value) / 100;
      applyZoom();
    });

    // Import/Export
    document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import').click());
    document.getElementById('file-import').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => importSvg(ev.target.result);
      reader.readAsText(file);
      e.target.value = '';
    });
    document.getElementById('btn-copy').addEventListener('click', copySvg);
    document.getElementById('btn-download').addEventListener('click', downloadSvg);

    // New path button
    document.getElementById('btn-new-path').addEventListener('click', () => {
      setActiveTool('pen');
      currentPath = null;
      setStatus('Pen Tool - Clique para comecar novo path');
    });
  }

  // ========== UTILS ==========

  function setStatus(msg) {
    document.getElementById('status-bar').textContent = msg;
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 2000);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Admin.init());

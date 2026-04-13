/* ============================================
   ADMIN - SVG Asset Editor with Paper.js
   ============================================ */

const Admin = (() => {
  const CANVAS_W = 600, CANVAS_H = 800;
  let zoom = 0.8;
  let currentTool = 'pen';
  let transparencyMode = true;
  let selectedPath = null;
  let selectedSegment = null;       // primary segment (for props panel)
  let selectedSegments = new Set();  // all selected segment indices
  let currentPath = null; // path being drawn
  let konvaStage = null;

  // Paper.js refs
  let penTool, selectTool, moveTool, panTool;
  let guidesLayer, drawingLayer;

  // Pan state
  let panOffset = { x: 0, y: 0 };
  let isPanning = false;
  let toolBeforePan = null; // tool to restore after Space release

  // ========== INIT ==========

  let currentAssetPath = null; // track which asset file is loaded

  async function init() {
    try {
      await ConfigLoader.loadAll();
      setupKonvaPreview();
      setupPaperJs();
      setupTools();
      setupEvents();
      applyZoom();
      applyTransparency();
      updateLayerList();
      loadAssetBrowser();
      console.log('Admin init OK');
    } catch (err) {
      console.error('Admin init FAILED:', err);
      document.body.innerHTML = '<pre style="color:red;padding:20px;">ERRO: ' + err.message + '\n\n' + err.stack + '</pre>';
    }
  }

  // ========== KONVA PREVIEW ==========

  function setupKonvaPreview() {
    const charData = {
      body: { shapeId: document.getElementById('sel-body').value, skinColorId: 'skin-3' },
      parts: {
        'face-shapes': { itemId: 'face-round' },
        eyes: { itemId: 'eyes-round', colorId: 'brown' },
        noses: { itemId: 'nose-round' },
        mouths: { itemId: 'mouth-smile' },
        'hair-back': null,
        'hair-front': null,
        eyebrows: null, extras: null, 'facial-hair': null, mustache: null,
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
    let draggingHandle = null; // 'in', 'out', or null

    selectTool = new paper.Tool();
    selectTool.onMouseDown = function(event) {
      draggingHandle = null;

      const hitResult = paper.project.hitTest(event.point, {
        segments: true, handles: true, stroke: true, fill: true, tolerance: 10,
        match: (hr) => hr.item.layer === drawingLayer && !(hr.item.data && hr.item.data.isMirror),
      });

      if (!hitResult) {
        deselectAll();
        return;
      }

      if (hitResult.type === 'handle-in') {
        selectPath(hitResult.item);
        selectSegment(hitResult.segment, event.event.shiftKey);
        draggingHandle = 'in';
        setStatus(`Arrastando handle IN do ponto ${hitResult.segment.index}`);
      } else if (hitResult.type === 'handle-out') {
        selectPath(hitResult.item);
        selectSegment(hitResult.segment, event.event.shiftKey);
        draggingHandle = 'out';
        setStatus(`Arrastando handle OUT do ponto ${hitResult.segment.index}`);
      } else if (hitResult.type === 'segment') {
        if (hitResult.item !== selectedPath) {
          selectPath(hitResult.item);
        }
        selectSegment(hitResult.segment, event.event.shiftKey);
      } else {
        selectPath(hitResult.item);
        selectedSegment = null;
        selectedSegments.clear();
        if (segmentMarker) { segmentMarker.remove(); segmentMarker = null; }
        updateSegmentProps();
      }
    };

    // Double-click on stroke → add point
    selectTool.onMouseDoubleClick = function(event) {
      const hitResult = paper.project.hitTest(event.point, {
        stroke: true, tolerance: 10,
        match: (hr) => hr.item.layer === drawingLayer && !(hr.item.data && hr.item.data.isMirror),
      });
      if (hitResult && hitResult.type === 'stroke' && hitResult.location) {
        const path = hitResult.item;
        const loc = hitResult.location;
        const newSeg = path.insert(loc.index + 1, event.point);
        selectPath(path);
        selectSegment(newSeg);
        updateSvgOutput();
        toast('Ponto adicionado');
      }
    };

    // Delete/Backspace → remove selected point
    selectTool.onKeyDown = function(event) {
      if ((event.key === 'delete' || event.key === 'backspace') && selectedSegment && selectedPath) {
        const idx = selectedSegment.index;
        selectedPath.removeSegment(idx);
        selectedSegment = null;
        selectedSegments.clear();
        if (segmentMarker) { segmentMarker.remove(); segmentMarker = null; }

        if (selectedPath.segments.length === 0) {
          selectedPath.remove();
          deselectAll();
        } else {
          const newIdx = Math.min(idx, selectedPath.segments.length - 1);
          selectSegment(selectedPath.segments[newIdx]);
        }
        updateSvgOutput();
        updateLayerList();
        toast('Ponto removido');
      }
    };

    selectTool.onMouseDrag = function(event) {
      if (draggingHandle && selectedSegment) {
        // Drag bezier handle (only on primary segment)
        if (draggingHandle === 'in') {
          selectedSegment.handleIn = selectedSegment.handleIn.add(event.delta);
          if (isSegmentSymmetric(selectedSegment)) {
            selectedSegment.handleOut = selectedSegment.handleIn.multiply(-1);
          }
        } else {
          selectedSegment.handleOut = selectedSegment.handleOut.add(event.delta);
          if (isSegmentSymmetric(selectedSegment)) {
            selectedSegment.handleIn = selectedSegment.handleOut.multiply(-1);
          }
        }
        if (mirrorMode) applyMirrorEdit(selectedPath, selectedSegment.index);
        highlightSegment();
        updateSegmentProps();
      } else if (selectedSegments.size > 0 && selectedPath) {
        // Drag all selected segments together
        for (const idx of selectedSegments) {
          const seg = selectedPath.segments[idx];
          if (seg) {
            seg.point = seg.point.add(event.delta);
            if (mirrorMode) applyMirrorEdit(selectedPath, idx);
          }
        }
        highlightSegment();
        updateSegmentProps();
      } else if (selectedPath) {
        selectedPath.position = selectedPath.position.add(event.delta);
      }
    };

    selectTool.onMouseUp = function() {
      draggingHandle = null;
      if (selectedSegment) updateSvgOutput();
    };

    // MOVE TOOL
    moveTool = new paper.Tool();
    moveTool.onMouseDown = function(event) {
      const hitResult = paper.project.hitTest(event.point, {
        fill: true, stroke: true, tolerance: 8,
        match: (hr) => hr.item.layer === drawingLayer && !(hr.item.data && hr.item.data.isMirror),
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

    // PAN TOOL
    panTool = new paper.Tool();
    panTool.onMouseDown = function() {
      isPanning = true;
    };
    panTool.onMouseDrag = function(event) {
      panOffset.x += event.delta.x / zoom;
      panOffset.y += event.delta.y / zoom;
      applyPanZoom();
    };
    panTool.onMouseUp = function() {
      isPanning = false;
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

  let segmentMarker = null;

  function selectPath(path) {
    if (selectedPath === path) return; // already selected, keep segments
    deselectAll();
    selectedPath = path;
    selectedPath.selected = true;
    selectedPath.fullySelected = true;
    updateProps();
    updateLayerList();
  }

  function selectSegment(seg, shift) {
    if (shift) {
      // Toggle this segment in multi-selection
      if (selectedSegments.has(seg.index)) {
        selectedSegments.delete(seg.index);
        // If removed the primary, pick another or clear
        if (selectedSegment === seg) {
          selectedSegment = selectedSegments.size > 0
            ? selectedPath.segments[[...selectedSegments][selectedSegments.size - 1]]
            : null;
        }
      } else {
        selectedSegments.add(seg.index);
        selectedSegment = seg;
      }
    } else {
      // Single selection: clear others
      selectedSegments.clear();
      selectedSegments.add(seg.index);
      selectedSegment = seg;
    }
    highlightSegment();
    updateSegmentProps();
    if (selectedSegments.size === 1) {
      setStatus(`Ponto ${seg.index} (${Math.round(seg.point.x)}, ${Math.round(seg.point.y)})`);
    } else {
      setStatus(`${selectedSegments.size} pontos selecionados (Shift+click para add/remover)`);
    }
  }

  function highlightSegment() {
    if (segmentMarker) { segmentMarker.remove(); segmentMarker = null; }
    if (selectedSegments.size === 0 || !selectedPath) return;

    guidesLayer.activate();
    segmentMarker = new paper.Group();

    for (const idx of selectedSegments) {
      const seg = selectedPath.segments[idx];
      if (!seg) continue;
      const pt = seg.point;
      const isPrimary = seg === selectedSegment;

      // Ring on selected point (primary = red, others = orange)
      segmentMarker.addChild(new paper.Path.Circle({
        center: pt, radius: isPrimary ? 8 : 6,
        strokeColor: isPrimary ? '#e94560' : '#f59e0b',
        strokeWidth: isPrimary ? 2.5 : 2,
        fillColor: isPrimary ? 'rgba(233,69,96,0.25)' : 'rgba(245,158,11,0.25)',
      }));

      // Only show handles on the primary segment
      if (!isPrimary) continue;

      // Handle-in line + dot (blue)
      if (!seg.handleIn.isZero()) {
        const hIn = pt.add(seg.handleIn);
        segmentMarker.addChild(new paper.Path.Line({
          from: pt, to: hIn, strokeColor: '#53d8fb', strokeWidth: 1.5,
        }));
        segmentMarker.addChild(new paper.Path.Circle({
          center: hIn, radius: 4, fillColor: '#53d8fb', strokeColor: '#fff', strokeWidth: 1,
        }));
      }

      // Handle-out line + dot (green)
      if (!seg.handleOut.isZero()) {
        const hOut = pt.add(seg.handleOut);
        segmentMarker.addChild(new paper.Path.Line({
          from: pt, to: hOut, strokeColor: '#4ade80', strokeWidth: 1.5,
        }));
        segmentMarker.addChild(new paper.Path.Circle({
          center: hOut, radius: 4, fillColor: '#4ade80', strokeColor: '#fff', strokeWidth: 1,
        }));
      }
    }

    drawingLayer.activate();
  }

  function deselectAll() {
    if (segmentMarker) { segmentMarker.remove(); segmentMarker = null; }
    if (selectedPath) {
      selectedPath.selected = false;
      selectedPath.fullySelected = false;
    }
    selectedPath = null;
    selectedSegment = null;
    selectedSegments.clear();
    document.getElementById('props-empty').classList.remove('hidden');
    document.getElementById('props-form').classList.add('hidden');
    document.getElementById('segment-props').classList.add('hidden');
    document.getElementById('segment-empty').classList.remove('hidden');
    updateLayerList();
  }

  function deleteSelected() {
    if (selectedSegments.size > 0 && selectedPath) {
      // Remove segments in reverse index order to preserve indices
      const indices = [...selectedSegments].sort((a, b) => b - a);
      for (const idx of indices) {
        selectedPath.removeSegment(idx);
      }
      selectedSegment = null;
      selectedSegments.clear();
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

    const canvas = document.getElementById('paper-canvas');
    canvas.classList.toggle('panning', name === 'pan');
    document.getElementById('btn-pan').classList.toggle('active', name === 'pan');

    switch (name) {
      case 'pen': penTool.activate(); setStatus('Pen Tool - Clique para pontos, arraste para curvas'); break;
      case 'select': selectTool.activate(); setStatus('Select - Clique em path para editar pontos'); break;
      case 'move': moveTool.activate(); setStatus('Move - Arraste paths'); break;
      case 'pan': panTool.activate(); setStatus('Pan - Arraste para mover a vista | Space=temporario | 0=reset'); break;
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
    document.getElementById('point-count').textContent = selectedPath.segments.length + ' pontos - clique num ponto para editar';
    updateSegmentProps();
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
    // Save selection state
    const wasPath = selectedPath;
    const wasSeg = selectedSegment;

    // Temporarily deselect for clean export (removes blue handles from SVG output)
    if (selectedPath) {
      selectedPath.selected = false;
      selectedPath.fullySelected = false;
    }

    // Export drawing layer items individually (skip guides, markers)
    let paths = '';
    drawingLayer.children.forEach(item => {
      if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
        paths += '  ' + item.exportSVG({ asString: true }) + '\n';
      }
    });

    const clean = `<svg viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${paths}</svg>`;
    document.getElementById('svg-output').value = clean;

    // Restore selection state without clearing segment
    if (wasPath) {
      wasPath.selected = true;
      wasPath.fullySelected = true;
      selectedPath = wasPath;
    }
    if (wasSeg) {
      selectedSegment = wasSeg;
      highlightSegment();
    }

    return clean;
  }

  function updateSvgOutput() {
    exportSvg();
  }

  function importSvg(svgString) {
    drawingLayer.activate();
    const imported = paper.project.importSVG(svgString, { insert: false });
    if (!imported) { toast('Erro: SVG invalido'); return; }

    // Recursively extract all drawable items from any nesting depth
    let count = 0;
    function flatten(item) {
      if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
        const clone = item.clone();
        clone.name = `imported-${count++}`;
        drawingLayer.addChild(clone);
      } else if (item instanceof paper.Shape) {
        // Convert shapes (rect, circle, ellipse) to paths
        const pathItem = item.toPath(false);
        pathItem.name = `imported-${count++}`;
        pathItem.style = item.style;
        drawingLayer.addChild(pathItem);
      } else if (item.children) {
        // Group, Layer, or other container - recurse
        const kids = [...item.children];
        kids.forEach(child => flatten(child));
      }
    }

    flatten(imported);
    imported.remove(); // clean up the original import

    if (count === 0) {
      toast('Nenhum path encontrado no SVG');
    } else {
      updateLayerList();
      updateSvgOutput();
      toast(`Importado: ${count} paths`);
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

  // ========== ZOOM + PAN ==========

  function applyZoom() {
    const w = Math.round(CANVAS_W * zoom);
    const h = Math.round(CANVAS_H * zoom);

    // Paper.js canvas
    const paperCanvas = document.getElementById('paper-canvas');
    paperCanvas.width = w;
    paperCanvas.height = h;
    paperCanvas.style.width = w + 'px';
    paperCanvas.style.height = h + 'px';

    // Resize paper view and apply pan
    paper.view.viewSize = new paper.Size(w, h);
    applyPanZoom();

    // Konva preview
    setupKonvaPreview();

    document.getElementById('zoom-value').textContent = Math.round(zoom * 100) + '%';
  }

  function applyPanZoom() {
    paper.view.matrix = new paper.Matrix()
      .scale(zoom)
      .translate(panOffset.x, panOffset.y);
    paper.view.draw();

    // Sync Konva preview offset
    const konvaContainer = document.getElementById('konva-preview');
    konvaContainer.style.transform = `translate(calc(-50% + ${panOffset.x * zoom}px), calc(-50% + ${panOffset.y * zoom}px))`;
  }

  function resetPan() {
    panOffset = { x: 0, y: 0 };
    applyPanZoom();
    // Reset Konva preview
    document.getElementById('konva-preview').style.transform = 'translate(-50%, -50%)';
    toast('Pan resetado');
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
        case ' ':
          e.preventDefault();
          if (!toolBeforePan) {
            toolBeforePan = currentTool;
            setActiveTool('pan');
          }
          break;
        case '0': resetPan(); break;
        case 'Delete': case 'Backspace': deleteSelected(); break;
        case 'c': centerSelected(); break;
        case 'h': mirrorSelected(); break;
        case 'd': cloneSelectedPoint(); break;
        case '=': case '+': setZoom(zoom + 0.1); break;
        case '-': setZoom(zoom - 0.1); break;
        case 'Escape':
          if (currentPath) finishPath();
          else deselectAll();
          break;
      }
    });

    // Space release: restore previous tool
    document.addEventListener('keyup', (e) => {
      if (e.key === ' ' && toolBeforePan) {
        setActiveTool(toolBeforePan);
        toolBeforePan = null;
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

    // Category change → refresh asset browser
    document.getElementById('sel-category').addEventListener('change', () => loadAssetBrowser());

    // Guides
    document.getElementById('chk-guides').addEventListener('change', () => drawGuides());

    // Transparency
    document.getElementById('chk-transparency').addEventListener('change', (e) => {
      transparencyMode = e.target.checked;
      applyTransparency();
    });

    // Actions: center, mirror, mirror-mode
    document.getElementById('btn-center').addEventListener('click', centerSelected);
    document.getElementById('btn-mirror').addEventListener('click', mirrorSelected);
    document.getElementById('btn-clone-point').addEventListener('click', cloneSelectedPoint);
    document.getElementById('btn-transform-apply').addEventListener('click', applyTransform);
    document.getElementById('btn-remove-point').addEventListener('click', removeSelectedPoint);

    // Segment type buttons
    document.querySelectorAll('.seg-type-btn').forEach(btn => {
      btn.addEventListener('click', () => setSegmentType(btn.dataset.type));
    });

    // Segment position inputs
    document.getElementById('seg-x').addEventListener('change', applySegmentPosition);
    document.getElementById('seg-y').addEventListener('change', applySegmentPosition);

    // Handle inputs
    ['handle-in-x', 'handle-in-y', 'handle-out-x', 'handle-out-y'].forEach(id => {
      document.getElementById(id).addEventListener('change', applyHandleValues);
    });

    // Save
    document.getElementById('btn-save-asset').addEventListener('click', saveAsset);
    document.getElementById('chk-mirror-mode').addEventListener('change', (e) => {
      mirrorMode = e.target.checked;
      updateMirrorGuide();
    });

    // Pan buttons
    document.getElementById('btn-pan').addEventListener('click', () => {
      if (currentTool === 'pan') {
        setActiveTool(toolBeforePan || 'pen');
        toolBeforePan = null;
      } else {
        toolBeforePan = currentTool;
        setActiveTool('pan');
      }
      document.getElementById('btn-pan').classList.toggle('active', currentTool === 'pan');
    });
    document.getElementById('btn-reset-pan').addEventListener('click', resetPan);

    // Zoom buttons
    document.getElementById('btn-zoom-in').addEventListener('click', () => setZoom(zoom + 0.1));
    document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoom - 0.1));

    // Scroll: pan normal, zoom com Ctrl/Cmd
    document.querySelector('.canvas-wrapper').addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(zoom + delta);
      } else {
        panOffset.x -= e.deltaX / zoom;
        panOffset.y -= e.deltaY / zoom;
        applyPanZoom();
      }
    }, { passive: false });

    // Zoom
    document.getElementById('zoom-slider').addEventListener('input', (e) => {
      zoom = parseInt(e.target.value) / 100;
      applyZoom();
    });

    // Import/Export
    document.getElementById('btn-new-item').addEventListener('click', createNewItem);
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

  // ========== ACTIONS: CENTER, MIRROR ==========

  function centerSelected() {
    if (!selectedPath) { toast('Selecione um path'); return; }
    selectedPath.position = new paper.Point(CANVAS_W / 2, selectedPath.position.y);
    updateSvgOutput();
    toast('Centralizado horizontalmente');
  }

  function cloneSelectedPoint() {
    if (!selectedPath || !selectedSegment) { toast('Selecione um ponto primeiro'); return; }
    const idx = selectedSegment.index;
    const pt = selectedSegment.point;
    // Insert a duplicate slightly offset so it's easy to grab and move
    const newSeg = selectedPath.insert(idx + 1, new paper.Point(pt.x + 15, pt.y));
    selectSegment(newSeg);
    updateSvgOutput();
    updateLayerList();
    toast('Ponto clonado - arraste para posicionar');
  }

  function removeSelectedPoint() {
    if (!selectedPath || !selectedSegment) { toast('Selecione um ponto primeiro'); return; }
    const idx = selectedSegment.index;
    selectedPath.removeSegment(idx);
    selectedSegment = null;
    if (segmentMarker) { segmentMarker.remove(); segmentMarker = null; }

    if (selectedPath.segments.length === 0) {
      selectedPath.remove();
      deselectAll();
    } else {
      const newIdx = Math.min(idx, selectedPath.segments.length - 1);
      selectSegment(selectedPath.segments[newIdx]);
    }
    updateSvgOutput();
    updateLayerList();
    toast('Ponto removido');
  }

  function applyTransform() {
    const scaleX = parseFloat(document.getElementById('tf-scale-x').value) / 100;
    const scaleY = parseFloat(document.getElementById('tf-scale-y').value) / 100;
    const moveX = parseFloat(document.getElementById('tf-move-x').value) || 0;
    const moveY = parseFloat(document.getElementById('tf-move-y').value) || 0;

    if (scaleX <= 0 || scaleY <= 0) { toast('Scale deve ser > 0'); return; }

    const all = document.getElementById('chk-transform-all').checked;
    const center = new paper.Point(CANVAS_W / 2, CANVAS_H / 2);

    function transformItem(item) {
      if (scaleX !== 1 || scaleY !== 1) {
        item.scale(scaleX, scaleY, center);
      }
      if (moveX !== 0 || moveY !== 0) {
        item.position = item.position.add(new paper.Point(moveX, moveY));
      }
    }

    if (all) {
      drawingLayer.children.forEach(item => {
        if (item instanceof paper.Path || item instanceof paper.CompoundPath) {
          transformItem(item);
        }
      });
      toast(`Transformado ${drawingLayer.children.length} layers`);
    } else {
      if (!selectedPath) { toast('Selecione um path ou marque "Todos layers"'); return; }
      transformItem(selectedPath);
      toast('Transformado');
    }

    // Reset inputs after applying
    document.getElementById('tf-scale-x').value = 100;
    document.getElementById('tf-scale-y').value = 100;
    document.getElementById('tf-move-x').value = 0;
    document.getElementById('tf-move-y').value = 0;

    highlightSegment();
    updateSvgOutput();
  }

  function mirrorSelected() {
    if (!selectedPath) { toast('Selecione um path'); return; }
    const cx = CANVAS_W / 2;
    selectedPath.scale(-1, 1, new paper.Point(cx, selectedPath.position.y));
    updateSvgOutput();
    toast('Espelhado');
  }

  // Mirror mode: edit symmetric paths - moving a point also moves its mirrored counterpart
  let mirrorMode = false;
  const MIRROR_CX = CANVAS_W / 2; // x=300 center axis

  // Find the mirrored counterpart segment within the same path
  function findMirrorSegment(path, segIndex) {
    const seg = path.segments[segIndex];
    const mirroredX = MIRROR_CX * 2 - seg.point.x;
    const mirroredY = seg.point.y;

    let bestIdx = -1;
    let bestDist = Infinity;

    for (let i = 0; i < path.segments.length; i++) {
      if (i === segIndex) continue;
      const other = path.segments[i];
      const dist = Math.abs(other.point.x - mirroredX) + Math.abs(other.point.y - mirroredY);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return bestDist < 40 ? bestIdx : -1;
  }

  // Apply mirror edit: set the counterpart point + handles to be the exact reflection
  function applyMirrorEdit(path, segIndex) {
    if (!mirrorMode || !path) return;
    const seg = path.segments[segIndex];

    // Point on center axis? Constrain to x=300
    if (Math.abs(seg.point.x - MIRROR_CX) < 8) {
      seg.point.x = MIRROR_CX;
      // Mirror handles symmetrically
      if (seg.handleIn && seg.handleOut) {
        const avgY = (seg.handleIn.y - seg.handleOut.y) / 2;
        seg.handleIn = new paper.Point(-Math.abs(seg.handleIn.x), avgY);
        seg.handleOut = new paper.Point(Math.abs(seg.handleOut.x), -avgY);
      }
      return;
    }

    const mirrorIdx = findMirrorSegment(path, segIndex);
    if (mirrorIdx < 0) return;

    const mirror = path.segments[mirrorIdx];

    // Set mirrored position
    mirror.point.x = MIRROR_CX * 2 - seg.point.x;
    mirror.point.y = seg.point.y;

    // Mirror handles (swap in/out and flip X)
    mirror.handleIn = new paper.Point(-seg.handleOut.x, seg.handleOut.y);
    mirror.handleOut = new paper.Point(-seg.handleIn.x, seg.handleIn.y);
  }

  // Show center guide line when mirror mode is on
  let mirrorGuide = null;
  function updateMirrorGuide() {
    if (mirrorGuide) { mirrorGuide.remove(); mirrorGuide = null; }
    if (!mirrorMode) return;
    guidesLayer.activate();
    mirrorGuide = new paper.Path.Line({
      from: [MIRROR_CX, 0], to: [MIRROR_CX, CANVAS_H],
      strokeColor: '#e94560', strokeWidth: 1.5, dashArray: [8, 4], opacity: 0.7,
    });
    drawingLayer.activate();
  }

  // ========== ZOOM ==========

  function setZoom(newZoom) {
    zoom = Math.max(0.25, Math.min(3, newZoom));
    document.getElementById('zoom-slider').value = Math.round(zoom * 100);
    applyZoom();
  }

  // ========== TRANSPARENCY ==========

  function applyTransparency() {
    drawingLayer.opacity = transparencyMode ? 0.5 : 1;
    paper.view.draw();
  }

  // ========== SEGMENT EDITING ==========

  function updateSegmentProps() {
    const segPanel = document.getElementById('segment-props');
    const segEmpty = document.getElementById('segment-empty');

    if (!selectedSegment || !selectedPath) {
      segPanel.classList.add('hidden');
      segEmpty.classList.remove('hidden');
      return;
    }

    segPanel.classList.remove('hidden');
    segEmpty.classList.add('hidden');

    const seg = selectedSegment;
    document.getElementById('seg-x').value = Math.round(seg.point.x);
    document.getElementById('seg-y').value = Math.round(seg.point.y);
    document.getElementById('handle-in-x').value = Math.round(seg.handleIn.x);
    document.getElementById('handle-in-y').value = Math.round(seg.handleIn.y);
    document.getElementById('handle-out-x').value = Math.round(seg.handleOut.x);
    document.getElementById('handle-out-y').value = Math.round(seg.handleOut.y);

    // Detect current type
    const hasHandles = !seg.handleIn.isZero() || !seg.handleOut.isZero();
    const isSymmetric = hasHandles &&
      Math.abs(seg.handleIn.x + seg.handleOut.x) < 2 &&
      Math.abs(seg.handleIn.y + seg.handleOut.y) < 2;

    let type = 'corner';
    if (isSymmetric) type = 'symmetric';
    else if (hasHandles) type = 'smooth';

    document.querySelectorAll('.seg-type-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.type === type);
    });

    document.getElementById('handle-group').style.display = hasHandles ? 'block' : 'none';

    // Update point count to show multi-selection info
    const countEl = document.getElementById('point-count');
    if (selectedSegments.size > 1) {
      countEl.textContent = `${selectedSegments.size} de ${selectedPath.segments.length} pontos selecionados`;
    } else {
      countEl.textContent = selectedPath.segments.length + ' pontos - Shift+click para multi-selecao';
    }
  }

  function isSegmentSymmetric(seg) {
    if (!seg || seg.handleIn.isZero() || seg.handleOut.isZero()) return false;
    return Math.abs(seg.handleIn.x + seg.handleOut.x) < 3 &&
           Math.abs(seg.handleIn.y + seg.handleOut.y) < 3;
  }

  function setSegmentType(type) {
    if (!selectedSegment) return;
    const seg = selectedSegment;

    switch (type) {
      case 'corner':
        seg.handleIn = new paper.Point(0, 0);
        seg.handleOut = new paper.Point(0, 0);
        break;
      case 'smooth': {
        // Create default handles based on neighboring segments
        const prev = seg.previous;
        const next = seg.next;
        if (prev && next) {
          const dir = next.point.subtract(prev.point).normalize(30);
          seg.handleIn = dir.multiply(-1);
          seg.handleOut = dir;
        } else {
          seg.handleIn = new paper.Point(-20, 0);
          seg.handleOut = new paper.Point(20, 0);
        }
        break;
      }
      case 'symmetric': {
        const prev = seg.previous;
        const next = seg.next;
        if (prev && next) {
          const dir = next.point.subtract(prev.point).normalize(30);
          seg.handleIn = dir.multiply(-1);
          seg.handleOut = dir;
        } else {
          seg.handleIn = new paper.Point(-20, 0);
          seg.handleOut = new paper.Point(20, 0);
        }
        break;
      }
    }

    if (mirrorMode) applyMirrorEdit(selectedPath, seg.index);
    updateSegmentProps();
    updateSvgOutput();
  }

  function applySegmentPosition() {
    if (!selectedSegment) return;
    const x = parseFloat(document.getElementById('seg-x').value);
    const y = parseFloat(document.getElementById('seg-y').value);
    if (isNaN(x) || isNaN(y)) return;
    selectedSegment.point = new paper.Point(x, y);
    if (mirrorMode) applyMirrorEdit(selectedPath, selectedSegment.index);
    updateSvgOutput();
  }

  function applyHandleValues() {
    if (!selectedSegment) return;
    const hix = parseFloat(document.getElementById('handle-in-x').value) || 0;
    const hiy = parseFloat(document.getElementById('handle-in-y').value) || 0;
    const hox = parseFloat(document.getElementById('handle-out-x').value) || 0;
    const hoy = parseFloat(document.getElementById('handle-out-y').value) || 0;
    selectedSegment.handleIn = new paper.Point(hix, hiy);
    selectedSegment.handleOut = new paper.Point(hox, hoy);
    if (mirrorMode) applyMirrorEdit(selectedPath, selectedSegment.index);
    updateSvgOutput();
  }

  // ========== SAVE ASSET ==========

  async function saveAsset() {
    if (!currentAssetPath) {
      toast('Nenhum asset carregado para salvar');
      return;
    }

    const svgStr = exportSvg();
    try {
      const resp = await fetch('/api/svg/' + currentAssetPath, {
        method: 'PUT',
        body: svgStr,
        headers: { 'Content-Type': 'image/svg+xml' },
      });
      const result = await resp.json();
      if (result.ok) {
        toast('Salvo: ' + currentAssetPath);
      } else {
        toast('Erro: ' + (result.error || 'falha ao salvar'));
      }
    } catch (err) {
      toast('Erro de rede: ' + err.message);
    }
  }

  // ========== NEW ITEM ==========

  async function createNewItem() {
    const categoryId = document.getElementById('sel-category').value;
    const cat = Catalog.getCategory(categoryId);
    if (!cat) { toast('Categoria invalida'); return; }

    const name = prompt('Nome do novo item (ex: Camiseta Longa):');
    if (!name || !name.trim()) return;

    const id = name.trim().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');

    if (cat.items.has(id)) { toast('Ja existe um item com esse ID: ' + id); return; }

    // Determine asset path based on category type
    const catType = cat.type;
    let assetDir;
    if (catType === 'clothing') assetDir = 'assets/clothing/' + categoryId;
    else if (catType === 'accessory') assetDir = 'assets/accessories/' + categoryId.replace('-acc', '');
    else assetDir = 'assets/faces/' + categoryId;

    const assetPath = assetDir + '/' + id + '.svg';
    const thumbDir = assetDir + '/thumbs';
    const thumbPath = thumbDir + '/thumb-' + id + '.svg';

    // Get offset from an existing item in the category, or compute default
    let offset = { x: 0, y: 0 };
    let size = { width: 600, height: 800 };
    for (const [, existingItem] of cat.items) {
      if (existingItem.offset) { offset = { ...existingItem.offset }; break; }
      if (existingItem.size) { size = { ...existingItem.size }; break; }
    }

    // Save empty SVG
    const emptySvg = `<svg viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">\n</svg>`;
    try {
      await fetch('/api/svg/' + assetPath, { method: 'PUT', body: emptySvg, headers: { 'Content-Type': 'image/svg+xml' } });
      await fetch('/api/svg/' + thumbPath, { method: 'PUT', body: emptySvg, headers: { 'Content-Type': 'image/svg+xml' } });
    } catch (err) {
      toast('Erro ao criar arquivo: ' + err.message);
      return;
    }

    // Build new item entry
    const newItem = { id, name: name.trim(), asset: assetPath, thumbnail: thumbPath, size, offset };

    // Load current JSON, add item, save back
    try {
      // Find JSON file for this category
      const jsonResp = await fetch('/api/json');
      const jsonMap = await jsonResp.json();
      let jsonFile = null;
      for (const [file, meta] of Object.entries(jsonMap)) {
        if (meta.category === categoryId) { jsonFile = file; break; }
      }
      if (!jsonFile) { toast('JSON da categoria nao encontrado'); return; }

      const dataResp = await fetch('/api/json/' + jsonFile);
      const data = await dataResp.json();
      data.items.push(newItem);

      await fetch('/api/json/' + jsonFile, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      });

      // Register in catalog
      Catalog.registerCategory(data);

      // Reload browser and open the new item
      loadAssetBrowser();
      loadAssetToCanvas(assetPath, name.trim());
      toast('Item criado: ' + name.trim());
    } catch (err) {
      toast('Erro ao salvar JSON: ' + err.message);
    }
  }

  // ========== ASSET BROWSER ==========

  function loadAssetBrowser() {
    const categoryId = document.getElementById('sel-category').value;
    const browser = document.getElementById('asset-browser');
    browser.innerHTML = '';

    console.log('loadAssetBrowser:', categoryId);
    const cat = Catalog.getCategory(categoryId);
    console.log('  cat:', cat ? cat.category + ' (' + cat.items.size + ' items)' : 'NULL');
    if (!cat) {
      // Fallback: list all registered categories for debugging
      const all = Catalog.getAllCategories();
      console.log('  Registered categories:', all.map(c => c.category).join(', '));
    }

    if (!cat || cat.items.size === 0) {
      browser.innerHTML = '<div style="color:#888;font-size:0.8rem;padding:8px;">Nenhum asset nesta categoria (' + categoryId + ')</div>';
      return;
    }

    console.log('  Rendering', cat.items.size, 'items into #asset-browser');
    for (const [itemId, item] of cat.items) {
      const btn = document.createElement('button');
      btn.className = 'adm-btn asset-item';
      btn.style.cssText = 'width:100%;text-align:left;margin-bottom:4px;display:flex;align-items:center;gap:8px;padding:8px 10px;min-height:36px;';

      const thumbUrl = item.thumbnail || item.asset;
      if (thumbUrl) {
        const img = document.createElement('img');
        img.src = thumbUrl;
        img.style.cssText = 'width:32px;height:32px;object-fit:contain;border-radius:4px;background:#f0e6ff;';
        btn.appendChild(img);
      }

      const label = document.createElement('span');
      label.style.cssText = 'font-size:0.8rem;overflow:hidden;text-overflow:ellipsis;';
      label.textContent = item.name;
      btn.appendChild(label);

      btn.title = item.asset;
      btn.addEventListener('click', () => loadAssetToCanvas(item.asset, item.name));
      browser.appendChild(btn);
    }
  }

  async function loadAssetToCanvas(assetUrl, name) {
    try {
      const resp = await fetch(assetUrl);
      if (!resp.ok) throw new Error('Failed to fetch ' + assetUrl);
      const svgText = await resp.text();

      // Clear current drawing
      drawingLayer.removeChildren();
      currentPath = null;
      deselectAll();

      // Import SVG
      importSvg(svgText);
      currentAssetPath = assetUrl;
      toast(`Carregado: ${name}`);
      setStatus(`Editando: ${assetUrl}`);
    } catch (err) {
      toast('Erro ao carregar: ' + err.message);
    }
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

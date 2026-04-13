/* ============================================
   RENDERER - Konva-based character compositor
   ============================================ */

const Renderer = (() => {
  // SVG text cache to avoid repeated fetches
  const svgCache = new Map();
  const imageCache = new Map();

  async function fetchSvgText(url) {
    if (svgCache.has(url)) return svgCache.get(url);
    try {
      const resp = await fetch(url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now());
      const text = await resp.text();
      svgCache.set(url, text);
      return text;
    } catch (e) {
      console.warn('Renderer: failed to load', url, e);
      return null;
    }
  }

  function clearCache() {
    svgCache.clear();
    imageCache.clear();
  }

  function colorizeSvgText(svgText, color) {
    if (!svgText || !color) return svgText;
    let result = svgText.replaceAll('#FF00FF', color).replaceAll('#ff00ff', color);
    // #CC00CC = stroke/darker variant placeholder -> 70% of main color
    const rgb = hexToRgb(color);
    const darker = '#' +
      Math.round(rgb.r * 0.7).toString(16).padStart(2, '0') +
      Math.round(rgb.g * 0.7).toString(16).padStart(2, '0') +
      Math.round(rgb.b * 0.7).toString(16).padStart(2, '0');
    result = result.replaceAll('#CC00CC', darker).replaceAll('#cc00cc', darker);
    return result;
  }

  // Tint a grayscale SVG with a skin color
  // White (#FFFFFF) -> skin color, Grays -> darker variants for shading
  function tintGrayscaleSvg(svgText, hexColor) {
    if (!svgText || !hexColor) return svgText;
    const rgb = hexToRgb(hexColor);

    // Darken helper: multiply RGB by factor
    function darken(factor) {
      const r = Math.round(rgb.r * factor).toString(16).padStart(2, '0');
      const g = Math.round(rgb.g * factor).toString(16).padStart(2, '0');
      const b = Math.round(rgb.b * factor).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }

    let result = svgText;
    result = result.replaceAll('#FFFFFF', hexColor).replaceAll('#ffffff', hexColor);
    result = result.replaceAll('#F5F5F5', darken(0.96)).replaceAll('#f5f5f5', darken(0.96));
    result = result.replaceAll('#F0F0F0', darken(0.94)).replaceAll('#f0f0f0', darken(0.94));
    result = result.replaceAll('#E8E8E8', darken(0.91)).replaceAll('#e8e8e8', darken(0.91));
    result = result.replaceAll('#E0E0E0', darken(0.88)).replaceAll('#e0e0e0', darken(0.88));
    result = result.replaceAll('#D0D0D0', darken(0.82)).replaceAll('#d0d0d0', darken(0.82));
    result = result.replaceAll('#C0C0C0', darken(0.75)).replaceAll('#c0c0c0', darken(0.75));
    return result;
  }

  function svgTextToDataUrl(svgText) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      if (imageCache.has(url)) {
        resolve(imageCache.get(url));
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.set(url, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn('Renderer: image load failed', url);
        resolve(null);
      };
      img.src = url;
    });
  }

  async function loadColorizedImage(assetUrl, color, tintColor) {
    if (!assetUrl) return null;

    // No transformation requested → load the file as-is. This applies
    // to PNG/JPG and to SVGs of categories that are not colorable
    // (e.g. accessories, extras) — we deliberately keep whatever
    // colors the designer baked into the SVG without touching them.
    if ((!color && !tintColor) || !assetUrl.endsWith('.svg')) {
      return loadImageFromUrl(assetUrl);
    }

    // SVG with color/tint: fetch as text, transform, encode as data URL
    const svgText = await fetchSvgText(assetUrl);
    if (!svgText) return null;

    let colored = svgText;
    if (tintColor) {
      colored = tintGrayscaleSvg(colored, tintColor);
    } else if (color) {
      colored = colorizeSvgText(colored, color);
    }

    const dataUrl = svgTextToDataUrl(colored);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  // Hex to RGB helper
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 255, g: 220, b: 190 };
  }

  // Apply skin tint to a Konva.Image (grayscale body -> colored)
  function applySkinTint(konvaImg, hexColor) {
    if (!hexColor) return;
    const rgb = hexToRgb(hexColor);

    konvaImg.cache();
    konvaImg.filters([function (imageData) {
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // skip transparent
        // Use luminance of grayscale pixel as multiplier
        const lum = data[i] / 255;
        data[i]     = Math.min(255, Math.round(rgb.r * lum)); // R
        data[i + 1] = Math.min(255, Math.round(rgb.g * lum)); // G
        data[i + 2] = Math.min(255, Math.round(rgb.b * lum)); // B
      }
    }]);
  }

  // Resolve a color ID to hex from palette
  function resolveColor(paletteId, colorId) {
    if (!colorId) return null;
    if (colorId.startsWith('#')) return colorId;
    const palette = Catalog.getColorPalette(paletteId);
    const entry = palette.find(c => c.id === colorId);
    return entry ? entry.hex : null;
  }

  // Build render layers from character data
  function buildLayerList(charData) {
    // Migration: fix old shapeIds
    if (charData.body.shapeId && charData.body.shapeId.includes('-female-') || charData.body.shapeId?.includes('-male-')) {
      charData.body.shapeId = charData.body.shapeId.includes('adult') ? 'adult' : 'child';
    }
    const layers = [];
    const shape = Catalog.getBodyShape(charData.body.shapeId);
    if (!shape) return layers;

    const skinColor = resolveColor('skin-tones', charData.body.skinColorId);

    // 1. Body (grayscale - tinted with skin color)
    layers.push({
      type: 'body',
      assetUrl: shape.body,
      color: null,
      tintColor: skinColor,
      x: 0, y: 0,
      width: shape.dimensions.width,
      height: shape.dimensions.height,
      zIndex: 20,
    });

    // 1b. Neck (between body and head, zIndex 35)
    if (shape.neck) {
      layers.push({
        type: 'body',
        assetUrl: shape.neck,
        color: null,
        tintColor: skinColor,
        x: 0, y: 0,
        width: shape.dimensions.width,
        height: shape.dimensions.height,
        zIndex: 35,
      });
    }

    // 2. Face shape
    const facePart = charData.parts['face-shapes'];
    if (facePart && facePart.itemId) {
      const cat = Catalog.getCategory('face-shapes');
      const item = cat && cat.items.get(facePart.itemId);
      if (item) {
        const anchor = shape.anchors.head;
        layers.push({
          type: 'face',
          assetUrl: item.asset,
          color: null,
          tintColor: skinColor,
          x: anchor.x - item.size.width / 2 + (item.offset?.x || 0),
          y: anchor.y - item.size.height / 2 + (item.offset?.y || 0),
          width: item.size.width,
          height: item.size.height,
          zIndex: cat.zIndex,
        });
      }
    }

    // 3. Regular body parts (includes hair-back and hair-front as separate categories)
    const regularParts = ['hair-back', 'eyes', 'eyebrows', 'noses', 'mouths', 'facial-hair', 'mustache', 'extras', 'hair-front'];
    for (const catId of regularParts) {
      const partData = charData.parts[catId];
      if (!partData || !partData.itemId) continue;
      const cat = Catalog.getCategory(catId);
      if (!cat) continue;
      const item = cat.items.get(partData.itemId);
      if (!item) continue;

      const anchorName = cat.anchor;
      const anchor = shape.anchors[anchorName];
      if (!anchor) continue;

      let color = null;
      let tintColor = null;
      if (cat.colorable && cat.colorPalette) {
        const colorId = partData.colorId || Catalog.getColorPalette(cat.colorPalette)?.[0]?.id;
        if (colorId) {
          color = resolveColor(cat.colorPalette, colorId);
        }
      } else if (!cat.colorable && item.defaultColor) {
        // Non-colorable items may bake a fixed color into the SVG's
        // #FF00FF placeholder via a per-item defaultColor field.
        color = item.defaultColor;
      }
      if (cat.skinTint) {
        tintColor = skinColor;
      }

      layers.push({
        type: 'body-part',
        assetUrl: item.asset,
        color,
        tintColor,
        x: anchor.x - item.size.width / 2 + ((item.offsetByShape && item.offsetByShape[shape.id])?.x ?? item.offset?.x ?? 0),
        y: anchor.y - item.size.height / 2 + ((item.offsetByShape && item.offsetByShape[shape.id])?.y ?? item.offset?.y ?? 0),
        width: item.size.width,
        height: item.size.height,
        zIndex: cat.zIndex,
      });
    }

    // 4. Outfit (clothing + accessories, anchor-based positioning)
    if (charData.outfit) {
      for (const [slotId, slotData] of Object.entries(charData.outfit)) {
        if (!slotData || !slotData.itemId) continue;

        const found = Catalog.findItemGlobal(slotData.itemId);
        if (!found) continue;
        const { category: cat, item } = found;

        let color = null;
        const isColorable = cat.colorable || item.colorable;
        const palette = cat.colorPalette || item.colorPalette || 'clothing-colors';
        if (isColorable && slotData.colorId) {
          color = resolveColor(palette, slotData.colorId);
        } else if (!isColorable && item.defaultColor) {
          // Non-colorable items may bake a fixed color into the SVG's
          // #FF00FF placeholder via a per-item defaultColor field.
          color = item.defaultColor;
        }

        const anchorName = item.anchor || cat.anchor;
        const anchor = anchorName && shape.anchors[anchorName]
          ? shape.anchors[anchorName]
          : { x: shape.dimensions.width / 2, y: shape.dimensions.height / 2 };
        const s = item.size || { width: 100, height: 100 };
        // Support per-shape offsets (e.g. dress positions differently on child vs adult)
        const o = (item.offsetByShape && item.offsetByShape[shape.id])
          ? item.offsetByShape[shape.id]
          : (item.offset || { x: 0, y: 0 });

        // Apply user offset and scale from freePosition items
        const userOff = slotData.userOffset || { x: 0, y: 0 };
        const userScale = slotData.userScale || 1;
        const finalW = s.width * userScale;
        const finalH = s.height * userScale;

        layers.push({
          type: 'clothing',
          assetUrl: item.asset,
          color,
          x: anchor.x - finalW / 2 + o.x + userOff.x,
          y: anchor.y - finalH / 2 + o.y + userOff.y,
          width: finalW,
          height: finalH,
          zIndex: cat.zIndex,
        });
      }
    }

    // Sort by zIndex
    layers.sort((a, b) => a.zIndex - b.zIndex);
    return layers;
  }

  // Compute the vertical adjustment needed so no layer renders above
  // y=0 of the canvas. Some asset offsets (e.g. hair calibrated for the
  // child shape) place content above the canvas top when used with
  // adult anchors; we expand the stage upward to fit.
  function computeVerticalFit(layerList, baseHeight) {
    let minY = 0;
    let maxY = baseHeight;
    for (const l of layerList) {
      if (l.y < minY) minY = l.y;
      const bottom = l.y + l.height;
      if (bottom > maxY) maxY = bottom;
    }
    const shiftY = -Math.min(0, minY);     // how far to push everything down
    const extraBottom = Math.max(0, maxY - baseHeight); // overflow below
    return { shiftY, extendedHeight: baseHeight + shiftY + extraBottom };
  }

  // Render into a Konva stage (keeps old visible until new is ready).
  //
  // `opts` accepts:
  //   - a plain number (legacy)         → treated as scale
  //   - { scale }                       → fixed scale
  //   - { maxWidth, maxHeight }         → fits the rendered character
  //                                       within these bounds (using
  //                                       the EFFECTIVE canvas size,
  //                                       which may be taller than the
  //                                       body shape if assets overflow)
  async function renderToStage(containerId, charData, opts = 1) {
    const shape = Catalog.getBodyShape(charData.body.shapeId);
    if (!shape) return null;

    const container = document.getElementById(containerId);
    if (!container) return null;

    // Build layers and load all images BEFORE touching the DOM
    const layerList = buildLayerList(charData);
    const imagePromises = layerList.map(l => loadColorizedImage(l.assetUrl, l.color, l.tintColor));
    const images = await Promise.all(imagePromises);

    // Expand the canvas vertically if any layer overflows the top/bottom
    // and shift everything down so nothing renders at negative y.
    const baseW = shape.dimensions.width;
    const baseH = shape.dimensions.height;
    const { shiftY, extendedHeight } = computeVerticalFit(layerList, baseH);

    // Resolve scale from opts.
    let scale;
    if (typeof opts === 'number') {
      scale = opts;
    } else if (opts.scale !== undefined) {
      scale = opts.scale;
    } else if (opts.maxWidth || opts.maxHeight) {
      const sW = opts.maxWidth ? opts.maxWidth / baseW : Infinity;
      const sH = opts.maxHeight ? opts.maxHeight / extendedHeight : Infinity;
      scale = Math.min(sW, sH, 1);
    } else {
      scale = 1;
    }

    const w = baseW * scale;
    const h = extendedHeight * scale;

    // Now that everything is loaded, create the stage and swap instantly
    container.innerHTML = '';
    container.style.width = w + 'px';
    container.style.height = h + 'px';

    const stage = new Konva.Stage({
      container: containerId,
      width: w,
      height: h,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    for (let i = 0; i < layerList.length; i++) {
      const img = images[i];
      if (!img) continue;
      const l = layerList[i];

      const konvaImg = new Konva.Image({
        image: img,
        x: l.x * scale,
        y: (l.y + shiftY) * scale,
        width: l.width * scale,
        height: l.height * scale,
      });

      layer.add(konvaImg);
    }

    layer.batchDraw();
    return stage;
  }

  // Render thumbnail (returns data URL)
  async function renderToDataURL(charData, maxHeight = 140) {
    // Create an offscreen container
    const offscreen = document.createElement('div');
    offscreen.id = 'offscreen-render-' + Date.now();
    offscreen.style.position = 'fixed';
    offscreen.style.left = '-9999px';
    offscreen.style.top = '-9999px';
    document.body.appendChild(offscreen);

    const shape = Catalog.getBodyShape(charData.body.shapeId);
    if (!shape) {
      offscreen.remove();
      return null;
    }

    // Use the fit-by-height path so the thumbnail accounts for any
    // vertical overflow added by the renderer.
    const stage = await renderToStage(offscreen.id, charData, { maxHeight });
    if (!stage) {
      offscreen.remove();
      return null;
    }

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });
    stage.destroy();
    offscreen.remove();
    return dataUrl;
  }

  return {
    renderToStage,
    renderToDataURL,
    resolveColor,
    loadColorizedImage,
    clearCache,
    buildLayerList,
    fetchSvgText,
    colorizeSvgText,
    svgTextToDataUrl,
  };
})();

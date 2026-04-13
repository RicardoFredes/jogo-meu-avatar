/* ============================================
   SVG UTILS - Shared SVG helpers
   Unifies the neutral-thumbnail logic used by the
   creator and the studio screens.
   ============================================ */

const SvgUtils = (() => {
  const thumbCache = new Map();

  // Replace the colorization placeholders with neutral grays so the
  // thumbnail reads as a silhouette regardless of user-picked colors.
  function neutralizeSvgColors(svg) {
    return svg
      .replace(/#FF00FF/gi, '#D0D0D0')
      .replace(/#CC00CC/gi, '#333333')
      .replace(/fill="#FFFFFF"/gi, 'fill="#E8E8E8"')
      .replace(/fill="white"/gi, 'fill="#E8E8E8"')
      .replace(/stroke="#FFFFFF"/gi, 'stroke="#555555"')
      .replace(/stroke="white"/gi, 'stroke="#555555"')
      .replace(/stroke="#C0C0C0"/gi, 'stroke="#444444"')
      .replace(/stroke="#E0E0E0"/gi, 'stroke="#555555"');
  }

  // Crop the SVG viewBox to the bounding box of the drawn content
  // so that thumbnails render visually centered even when the artwork
  // only uses a fraction of the canvas.
  function cropViewBoxToContent(svg) {
    const nums = [];
    const dMatches = svg.matchAll(/d="([^"]+)"/g);
    for (const m of dMatches) {
      const pathNums = m[1].match(/-?[\d.]+/g);
      if (!pathNums) continue;
      for (let i = 0; i < pathNums.length - 1; i += 2) {
        const x = parseFloat(pathNums[i]);
        const y = parseFloat(pathNums[i + 1]);
        if (!isNaN(x) && !isNaN(y) && x > -50 && x < 700 && y > -50 && y < 900) {
          nums.push({ x, y });
        }
      }
    }
    const circMatches = svg.matchAll(/cx="([\d.]+)"[^>]*cy="([\d.]+)"/g);
    for (const m of circMatches) {
      nums.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
    }

    if (nums.length <= 2) return svg;

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
    return svg.replace(/viewBox="[^"]*"/, `viewBox="${vbX} ${vbY} ${vbW} ${vbH}"`);
  }

  async function loadNeutralThumb(svgUrl) {
    if (thumbCache.has(svgUrl)) return thumbCache.get(svgUrl);
    try {
      const resp = await fetch(svgUrl + '?v=' + Date.now());
      let svg = await resp.text();
      svg = neutralizeSvgColors(svg);
      svg = cropViewBoxToContent(svg);
      const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      thumbCache.set(svgUrl, dataUrl);
      return dataUrl;
    } catch (e) {
      return null;
    }
  }

  return {
    loadNeutralThumb,
    neutralizeSvgColors,
    cropViewBoxToContent,
  };
})();

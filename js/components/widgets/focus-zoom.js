/* ============================================
   FOCUS ZOOM - Overlay that reacts to focus events
   by zooming the character preview onto the region
   being edited (eyes, feet, torso…).

   Decoupled from the studio via two CustomEvents:
     - studio:focus-change  { active, region, anchor, zoom }
     - character:rendered   { containerId, baseW, extendedHeight, shiftY }

   Mounts on the element that WRAPS a .character-preview
   (typically .studio-preview-area). Reads the canvas-coord
   anchor from the active body-shape, converts it into DOM
   pixels using the layout numbers the renderer writes onto
   the .character-preview dataset, then publishes the final
   transform through three CSS vars on the preview element:

     --zoom-scale   (number)
     --zoom-tx      (px)
     --zoom-ty      (px)

   The CSS rule that applies the transform lives in style.css
   under `.studio-preview-area.panel-open .character-preview`.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('focusZoom', () => ({
    _state: null,
    _onFocus: null,
    _onRendered: null,
    _onResize: null,

    init() {
      this._onFocus = (e) => {
        this._state = e.detail;
        this._apply();
      };
      // Re-measure whenever the preview rerenders (new outfit, different
      // body shape, etc.) so the zoom target stays locked on the anchor.
      this._onRendered = (e) => {
        if (!this._insidePreview(e.detail?.containerId)) return;
        this._apply();
      };
      this._onResize = () => this._apply();

      window.addEventListener('studio:focus-change', this._onFocus);
      window.addEventListener('character:rendered', this._onRendered);
      window.addEventListener('resize', this._onResize);
      window.addEventListener('orientationchange', this._onResize);
    },

    destroy() {
      window.removeEventListener('studio:focus-change', this._onFocus);
      window.removeEventListener('character:rendered', this._onRendered);
      window.removeEventListener('resize', this._onResize);
      window.removeEventListener('orientationchange', this._onResize);
    },

    // True when the rendered container is the preview we're wrapping.
    // The renderer is also used for offscreen thumbnail generation —
    // those containers live elsewhere in the DOM and we ignore them.
    _insidePreview(containerId) {
      if (!containerId) return false;
      const el = this.$el.querySelector('#' + CSS.escape(containerId));
      return !!el;
    },

    _preview() {
      return this.$el.querySelector('.character-preview');
    },

    // Reset the zoom vars to defaults. With the CSS fallbacks
    // (`scale(var(--zoom-scale, 1))`, etc.) the transform collapses
    // to the identity and the preview returns to its natural size.
    _reset(previewEl) {
      previewEl.style.removeProperty('--zoom-tx');
      previewEl.style.removeProperty('--zoom-ty');
      previewEl.style.removeProperty('--zoom-scale');
    },

    _apply() {
      const previewEl = this._preview();
      if (!previewEl) return;
      const s = this._state;

      if (!s || !s.active || !s.anchor) {
        this._reset(previewEl);
        return;
      }

      // Resolve the anchor point in canvas coords (600x800 reference).
      const charData = Alpine.store('character').data;
      const shape = charData && Catalog.getBodyShape(charData.body?.shapeId);
      const p = shape?.anchors?.[s.anchor];
      if (!p) { this._reset(previewEl); return; }

      // getBoundingClientRect reflects the element's CURRENT visual
      // box — already translated & scaled by whatever transform we set
      // on the previous focus change. If we measured that directly,
      // consecutive focus changes would compound (the character would
      // "slide" on each switch). Back out the current zoom transform
      // so we're always reasoning about the element's NATURAL layout.
      const curTx    = parseFloat(previewEl.style.getPropertyValue('--zoom-tx'))    || 0;
      const curTy    = parseFloat(previewEl.style.getPropertyValue('--zoom-ty'))    || 0;
      const curScale = parseFloat(previewEl.style.getPropertyValue('--zoom-scale')) || 1;

      const rect = previewEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const naturalLeft  = rect.left - curTx;
      const naturalTop   = rect.top  - curTy;
      const naturalWidth = rect.width / curScale;

      // Map canvas coords → preview-element pixels. Renderer writes
      // its layout numbers onto the element's dataset; fall back to
      // sensible defaults if a render hasn't happened yet.
      const baseW  = Number(previewEl.dataset.baseW) || 600;
      const shiftY = Number(previewEl.dataset.shiftY) || 0;

      // Pixels-per-canvas-unit using the element's NATURAL width
      // (matches what the renderer computed when it set style.width).
      const live = naturalWidth / baseW;
      const ax = p.x * live;                     // anchor X in natural px
      const ay = (p.y + shiftY) * live;          // anchor Y in natural px

      // Target screen point: center of the visible zone above the
      // bottom panel. The mobile items panel occupies up to 55vh, so
      // the visible preview zone is roughly the top 45vh.
      const cx = window.innerWidth / 2;
      const cy = (window.innerHeight * 0.45) / 2;

      const Z = s.zoom || 1;
      const tx = cx - naturalLeft - ax * Z;
      const ty = cy - naturalTop  - ay * Z;

      previewEl.style.setProperty('--zoom-tx', tx + 'px');
      previewEl.style.setProperty('--zoom-ty', ty + 'px');
      previewEl.style.setProperty('--zoom-scale', Z);
    },
  }));
});

/* ============================================
   CHARACTER PREVIEW - Reactive Konva wrapper.
   Re-renders whenever the character store changes
   OR the active screen changes (so we render with
   real dimensions once the host becomes visible).

   Props:
   - scale:  number | 'fit'   — explicit scale or fit-to-container.
   - paddingPx                — padding subtracted from container size.
   - getOverrideData          — optional function returning a char snapshot
                                instead of reading the live store
                                (used by the fullscreen view).

   Usage:
     <div x-data="characterPreview()" x-effect="render()"></div>
   ============================================ */

let _previewCounter = 0;

document.addEventListener('alpine:init', () => {
  Alpine.data('characterPreview', ({
    scale = 'fit',
    paddingPx = 8,
    getOverrideData = null,
  } = {}) => ({
    _id: 'char-preview-' + (++_previewCounter),
    _stage: null,

    init() {
      // Give the host element a stable id so Konva can target it.
      this.$el.id = this._id;
    },

    getData() {
      if (typeof getOverrideData === 'function') {
        const v = getOverrideData();
        if (v) return v;
      }
      return Alpine.store('character').data;
    },

    async render() {
      // ---- Subscribe to reactive sources EVERY call, even when we'll
      // bail out below. Reading these inside x-effect's tracking context
      // is what makes the effect re-fire on later changes.
      const screen = Alpine.store('app').screen;
      const storeData = Alpine.store('character').data;
      // Walk the entire tree so deep mutations (e.g. parts.eyes.colorId)
      // also trigger a re-render.
      if (storeData) JSON.stringify(storeData);

      const data = this.getData();
      if (!data) return;

      // Wait one tick so x-show / DOM updates are flushed before we
      // measure the container — otherwise clientHeight/Width may still
      // be 0 (parent display:none) and the stage renders invisible.
      await this.$nextTick();

      const area = this.$el.parentElement;
      let opts;
      if (scale === 'fit' && area) {
        const areaH = area.clientHeight - paddingPx;
        const areaW = area.clientWidth - paddingPx;
        // Skip until layout is real; another effect run will retry.
        if (areaH <= 0 || areaW <= 0) return;
        // Let the renderer compute scale against the EFFECTIVE canvas
        // (which may be taller than the body shape if assets overflow).
        opts = { maxWidth: areaW, maxHeight: areaH };
      } else {
        opts = { scale };
      }
      this._stage = await Renderer.renderToStage(this._id, data, opts);
    },
  }));
});

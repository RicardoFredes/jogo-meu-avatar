/* ============================================
   MOBILE PANEL - Slide-up bottom sheet used by
   both creator and studio on mobile.

   Owns its own open/closed state + toggles the
   preview-area "panel-open" CSS class so the
   character scales down when the sheet is up.

   Props:
   - previewSelector: '.creator-preview-area' | '.studio-preview-area'
   - startOpen: boolean  (creator opens by default, studio starts closed)
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('mobilePanel', ({
    previewSelector = '.studio-preview-area',
    startOpen = false,
  } = {}) => ({
    open: startOpen,
    title: '',

    init() {
      this._applyPreviewClass();
    },

    show(title = '') {
      this.title = title;
      this.open = true;
      this._applyPreviewClass();
    },

    close() {
      this.open = false;
      this._applyPreviewClass();
    },

    toggle(title = '') {
      this.open ? this.close() : this.show(title);
    },

    _applyPreviewClass() {
      const area = document.querySelector(previewSelector);
      if (!area) return;
      area.classList.toggle('panel-open', this.open);
    },
  }));
});

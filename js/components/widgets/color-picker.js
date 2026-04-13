/* ============================================
   COLOR PICKER - Palette + extra colors row.
   Pure presentational component driven by props
   passed in via x-data.

   Usage:
     <template x-for="color in colorPicker($palette).colors">
   Or register as Alpine component:
     <div x-data="colorPicker({ palette, currentColorId, onSelect })">
   ============================================ */

const EXTRA_COLORS = [
  '#FF0000', '#FF4444', '#FF6B6B', '#FF8C00', '#FFA500', '#FFD700',
  '#FFFF00', '#ADFF2F', '#32CD32', '#00C853', '#00897B', '#00BCD4',
  '#03A9F4', '#2196F3', '#1565C0', '#3F51B5', '#673AB7', '#9C27B0',
  '#E040FB', '#FF4081', '#F50057', '#E91E63', '#AD1457', '#880E4F',
  '#795548', '#A1887F', '#D7CCC8', '#9E9E9E', '#607D8B', '#455A64',
  '#F5F5F5', '#E0E0E0', '#BDBDBD', '#757575', '#424242', '#222222',
];

document.addEventListener('alpine:init', () => {
  Alpine.data('colorPicker', ({
    // Use getters so the picker stays in sync when the parent's
    // palette / current color change after init.
    getPalette = () => [],
    getCurrentColorId = () => null,
    onSelect,
  } = {}) => ({
    extraColors: EXTRA_COLORS,

    get palette() { return getPalette(); },
    get selected() { return getCurrentColorId(); },

    isSelected(id) { return this.selected === id; },

    pick(colorId) {
      if (typeof onSelect === 'function') onSelect(colorId);
    },
  }));
});

/* ============================================
   COLOR BAR - Web Component
   Expands into the full color-picker markup
   (palette swatches + separator + extras),
   wrapped in a <scroll-row>.

   Assumes `cat` is in scope (provided by an
   outer x-for="cat in categories"), because
   this component is always used inside an
   itemGrid iteration.

   Usage:
     <color-bar></color-bar>
   ============================================ */

class ColorBarElement extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;

    // Self-expanding template. The x-data expression is evaluated
    // in the parent's scope chain, so `cat`, `paletteFor`,
    // `currentColor` and `pickColor` resolve to the itemGrid methods.
    // `scroll-bleed` makes the swatch track run edge-to-edge inside
    // the mobile panel (which has its own lateral padding). If this
    // component is ever embedded in a context without padding,
    // remove the class.
    this.innerHTML = `
      <div x-data="colorPicker({
            getPalette: () => paletteFor(cat),
            getCurrentColorId: () => currentColor(cat),
            onSelect: (id) => pickColor(cat, id)
          })"
           class="option-group color-bar-group">
        <scroll-row class="scroll-bleed">
          <template x-for="c in palette" :key="c.id">
            <div class="option-item color-swatch"
                 :class="{ selected: isSelected(c.id) }"
                 :style="'background-color:' + c.hex"
                 :title="c.name"
                 @click="pick(c.id)"></div>
          </template>
          <div class="color-row-sep"></div>
          <template x-for="hex in extraColors" :key="hex">
            <div class="option-item color-swatch color-swatch-extra"
                 :class="{ selected: isSelected(hex) }"
                 :style="'background-color:' + hex"
                 :title="hex"
                 @click="pick(hex)"></div>
          </template>
        </scroll-row>
      </div>
    `;
  }
}

if (!customElements.get('color-bar')) {
  customElements.define('color-bar', ColorBarElement);
}

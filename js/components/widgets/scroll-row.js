/* ============================================
   SCROLL ROW
   Two pieces working together:
     1) Alpine.data('scrollRow') — the scroll/arrow logic
     2) <scroll-row> Web Component — the markup template

   Using a Web Component is how we get real
   componentization in an Alpine world: a single
   place owns the arrow buttons, the scroll
   container, ARIA attrs, etc. The children you
   put inside the tag become the scrollable items.

   Usage:
     <scroll-row>
       <template x-for="c in palette"><div>...</div></template>
     </scroll-row>

   Variants: pass class="cat-bar" for the compact
   style used by the mobile category bar.
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('scrollRow', () => ({
    canPrev: false,
    canNext: false,
    _ro: null,
    _mo: null,

    init() {
      this.$nextTick(() => this.update());
      const el = this.$refs.scroll;
      if (!el) return;
      // React to container resize AND content changes so the arrow
      // states stay accurate as items load or the viewport rotates.
      if (typeof ResizeObserver !== 'undefined') {
        this._ro = new ResizeObserver(() => this.update());
        this._ro.observe(el);
      }
      if (typeof MutationObserver !== 'undefined') {
        this._mo = new MutationObserver(() => this.update());
        this._mo.observe(el, { childList: true, subtree: false });
      }
    },

    destroy() {
      this._ro?.disconnect();
      this._mo?.disconnect();
    },

    update() {
      const el = this.$refs.scroll;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      this.canPrev = el.scrollLeft > 2;
      this.canNext = el.scrollLeft < maxScroll - 2;
    },

    prev() { this._scrollBy(-1); },
    next() { this._scrollBy(+1); },

    _scrollBy(dir) {
      const el = this.$refs.scroll;
      if (!el) return;
      el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' });
    },
  }));
});

/* ------------------------------------------------
   Web Component: <scroll-row>
   Expands into the scroll-row markup + x-data.
   ------------------------------------------------ */
class ScrollRowElement extends HTMLElement {
  connectedCallback() {
    if (this._mounted) return;
    this._mounted = true;

    // Move the user's children into a dedicated scroll container.
    const children = Array.from(this.childNodes);
    const content = document.createElement('div');
    content.className = 'scroll-row-content';
    content.setAttribute('x-ref', 'scroll');
    content.setAttribute('@scroll.passive', 'update()');
    for (const child of children) content.appendChild(child);

    // Identify this element to Alpine and CSS.
    this.classList.add('scroll-row');
    this.setAttribute('x-data', 'scrollRow');

    // Arrow buttons — currently commented out per product decision;
    // flipping SHOW_ARROWS back to true re-enables them everywhere.
    const SHOW_ARROWS = false;
    if (SHOW_ARROWS) {
      this.appendChild(this._makeArrow('←', 'prev()', '!canPrev'));
    }
    this.appendChild(content);
    if (SHOW_ARROWS) {
      this.appendChild(this._makeArrow('→', 'next()', '!canNext'));
    }
  }

  _makeArrow(label, clickExpr, disabledExpr) {
    const btn = document.createElement('button');
    btn.className = 'scroll-arrow';
    btn.setAttribute('@click', clickExpr);
    btn.setAttribute(':disabled', disabledExpr);
    btn.textContent = label;
    return btn;
  }
}

if (!customElements.get('scroll-row')) {
  customElements.define('scroll-row', ScrollRowElement);
}

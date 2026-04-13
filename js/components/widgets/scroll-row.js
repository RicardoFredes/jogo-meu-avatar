/* ============================================
   SCROLL ROW - Semantic horizontal scroll element.

   Just a custom-element shell that gets styled
   via CSS. No DOM manipulation, no child moving
   — so it plays nicely with Alpine's x-for and
   x-if templates which may add/remove children
   at any time.

   The element itself is the scroll container.
   Children placed inside (e.g. x-for clones)
   are direct flex items and scroll horizontally
   as native overflow-x:auto content.

   Styling lives in css/style.css under the
   `scroll-row` tag selector.
   ============================================ */

if (!customElements.get('scroll-row')) {
  customElements.define('scroll-row', class extends HTMLElement {});
}

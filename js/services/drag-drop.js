/* ============================================
   DRAG & DROP - interact.js based drag system
   ============================================ */

const DragDrop = (() => {
  let dragClone = null;
  let dragData = null;

  // Walk the element (and its descendants) and drop any Alpine-style
  // attribute that the cloned subtree can no longer resolve.
  function stripAlpineAttrs(root) {
    const walker = [root, ...root.querySelectorAll('*')];
    for (const el of walker) {
      for (const attr of Array.from(el.attributes)) {
        const n = attr.name;
        if (n.startsWith('x-') || n.startsWith(':') || n.startsWith('@')) {
          el.removeAttribute(n);
        }
      }
    }
  }

  function initDraggables() {
    // Use interact.js for touch-friendly drag
    interact('.item-thumbnail:not(.item-none)').draggable({
      inertia: false,
      autoScroll: false,
      listeners: {
        start: onDragStart,
        move: onDragMove,
        end: onDragEnd,
      },
    });
  }

  function onDragStart(event) {
    const el = event.target;
    dragData = {
      itemId: el.dataset.itemId,
      categoryId: el.dataset.categoryId,
      slotId: el.dataset.slotId,
    };

    // Create visual clone
    dragClone = el.cloneNode(true);
    dragClone.className = 'drag-clone';
    // Strip Alpine directives from the clone + descendants. The clone
    // is appended to <body>, outside the parent x-for, so references
    // like `cat`, `item`, `isEquipped` would fail to resolve.
    stripAlpineAttrs(dragClone);
    // Belt and suspenders: mark the subtree as ignored so Alpine's
    // MutationObserver doesn't even try to process it.
    dragClone.setAttribute('x-ignore', '');
    const rect = el.getBoundingClientRect();
    dragClone.style.width = rect.width + 'px';
    dragClone.style.height = rect.height + 'px';
    dragClone.style.left = rect.left + 'px';
    dragClone.style.top = rect.top + 'px';
    document.body.appendChild(dragClone);

    // Dim original
    el.classList.add('dragging');
  }

  function onDragMove(event) {
    if (!dragClone) return;
    const x = (parseFloat(dragClone.style.left) || 0) + event.dx;
    const y = (parseFloat(dragClone.style.top) || 0) + event.dy;
    dragClone.style.left = x + 'px';
    dragClone.style.top = y + 'px';

    // Check if over drop zone
    const dropZone = document.querySelector('.drop-zone');
    if (dropZone) {
      const dzRect = dropZone.getBoundingClientRect();
      const cx = x + dragClone.offsetWidth / 2;
      const cy = y + dragClone.offsetHeight / 2;
      const isOver = cx >= dzRect.left && cx <= dzRect.right && cy >= dzRect.top && cy <= dzRect.bottom;
      dropZone.classList.toggle('drag-over', isOver);
    }
  }

  function onDragEnd(event) {
    // Check drop on character
    const dropZone = document.querySelector('.drop-zone');
    let dropped = false;

    if (dropZone && dragClone && dragData) {
      const dzRect = dropZone.getBoundingClientRect();
      const cloneRect = dragClone.getBoundingClientRect();
      const cx = cloneRect.left + cloneRect.width / 2;
      const cy = cloneRect.top + cloneRect.height / 2;

      if (cx >= dzRect.left && cx <= dzRect.right && cy >= dzRect.top && cy <= dzRect.bottom) {
        // Successful drop!
        dropped = true;
        const cat = Catalog.getCategory(dragData.categoryId);
        // Equip via the character store so the change is reactive.
        const store = window.Alpine && Alpine.store('character');
        if (store) store.equipItem(dragData.itemId, cat);

        // Celebration
        if (typeof confetti === 'function') {
          confetti({
            particleCount: 20,
            spread: 40,
            origin: {
              x: cx / window.innerWidth,
              y: cy / window.innerHeight,
            },
          });
        }
      }

      dropZone.classList.remove('drag-over');
    }

    // Cleanup
    if (dragClone) {
      dragClone.remove();
      dragClone = null;
    }

    // Un-dim source
    document.querySelectorAll('.item-thumbnail.dragging').forEach(el => {
      el.classList.remove('dragging');
    });

    dragData = null;
  }

  function initDropZone() {
    // Drop zone highlighting is handled in onDragMove
    // Click on equipped items on character to remove them is handled in wardrobe
  }

  return {
    initDraggables,
    initDropZone,
  };
})();

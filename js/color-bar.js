/* ============================================
   COLOR BAR - Shared color picker component
   ============================================ */

const EXTRA_COLORS = [
  '#FF0000','#FF4444','#FF6B6B','#FF8C00','#FFA500','#FFD700',
  '#FFFF00','#ADFF2F','#32CD32','#00C853','#00897B','#00BCD4',
  '#03A9F4','#2196F3','#1565C0','#3F51B5','#673AB7','#9C27B0',
  '#E040FB','#FF4081','#F50057','#E91E63','#AD1457','#880E4F',
  '#795548','#A1887F','#D7CCC8','#9E9E9E','#607D8B','#455A64',
  '#F5F5F5','#E0E0E0','#BDBDBD','#757575','#424242','#222222',
];


/**
 * Build a color bar component.
 * @param {Object} opts
 * @param {Array} opts.palette - Array of { id, hex, name }
 * @param {string|null} opts.currentColorId - Currently selected color id or hex
 * @param {function} opts.onSelect - Called with (colorId) when a color is picked
 * @returns {HTMLElement} - .option-group element ready to append
 */
function buildColorBar({ palette, currentColorId, onSelect }) {
  const group = document.createElement('div');
  group.className = 'option-group';
  group.style.padding = '8px 10px';
  group.style.marginBottom = '4px';

  const row = document.createElement('div');
  row.className = 'option-items color-row';

  function select(colorId) {
    onSelect(colorId);
    group.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  }

  function swatch(colorId, hex, name, isSelected) {
    const el = document.createElement('div');
    el.className = 'option-item color-swatch' + (isSelected ? ' selected' : '');
    el.style.backgroundColor = hex;
    el.title = name;
    el.addEventListener('click', () => {
      select(colorId);
      el.classList.add('selected');
    });
    return el;
  }

  // "+" button first
  const moreBtn = document.createElement('div');
  moreBtn.className = 'color-more-btn';
  moreBtn.textContent = '+';
  moreBtn.title = 'Mais cores';
  moreBtn.addEventListener('click', () => {
    const firstExtra = row.querySelector('.color-swatch-extra');
    if (firstExtra) row.scrollTo({ left: firstExtra.offsetLeft - row.offsetLeft - 8, behavior: 'smooth' });
  });
  row.appendChild(moreBtn);

  // Palette colors
  palette.forEach(c => {
    row.appendChild(swatch(c.id, c.hex, c.name, currentColorId === c.id));
  });

  // Separator
  const sep = document.createElement('div');
  sep.className = 'color-row-sep';
  row.appendChild(sep);

  // Extra 36 colors
  EXTRA_COLORS.forEach(hex => {
    const s = swatch(hex, hex, hex, currentColorId === hex);
    s.classList.add('color-swatch-extra');
    row.appendChild(s);
  });

  group.appendChild(row);
  return group;
}

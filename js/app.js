/* ============================================
   APP - Main entry point, routing, init
   ============================================ */

const App = (() => {
  let currentScreen = 'loading';

  async function init() {
    try {
      // Load all configs
      await ConfigLoader.loadAll();

      // Setup event listeners
      setupEvents();

      // Show home
      showScreen('home');
      renderHomeCharacters();
    } catch (err) {
      console.error('App init failed:', err);
      document.querySelector('.loading-text').textContent = 'Erro ao carregar. Recarregue a pagina.';
    }
  }

  function setupEvents() {
    // Home
    document.getElementById('btn-new-character').addEventListener('click', () => {
      showScreen('creator');
      CharacterCreator.init(null);
    });

    // Character fullscreen
    document.getElementById('btn-fs-close').addEventListener('click', closeCharFullscreen);
    document.getElementById('btn-fs-dress').addEventListener('click', () => {
      const charId = fullscreenCharId;
      closeCharFullscreen();
      showScreen('wardrobe');
      Wardrobe.init(charId);
      DragDrop.initDropZone();
    });
    document.getElementById('btn-fs-edit').addEventListener('click', () => {
      const charId = fullscreenCharId;
      closeCharFullscreen();
      showScreen('creator');
      CharacterCreator.init(charId);
    });
    document.getElementById('btn-fs-delete').addEventListener('click', () => {
      const charId = fullscreenCharId;
      const char = Storage.getCharacter(charId);
      showConfirmDialog('Apagar ' + (char?.name || 'personagem') + '?', () => {
        Storage.deleteCharacter(charId);
        closeCharFullscreen();
        renderHomeCharacters();
      });
    });

    // Debug: clear localStorage
    document.getElementById('btn-debug-clear').addEventListener('click', () => {
      if (confirm('Apagar todos os personagens salvos?')) {
        localStorage.clear();
        location.reload();
      }
    });

    // Creator navigation - all prev/next buttons (mobile panel + desktop floating)
    document.querySelectorAll('#btn-next-step, #btn-next-step-desktop').forEach(btn => {
      btn.addEventListener('click', () => CharacterCreator.nextStep());
    });
    document.querySelectorAll('#btn-prev-step, #btn-prev-step-desktop').forEach(btn => {
      btn.addEventListener('click', () => CharacterCreator.prevStep());
    });
    // Creator back buttons (desktop + mobile)
    const creatorBackHandler = () => {
      CharacterCreator.cleanup();
      showScreen('home');
      renderHomeCharacters();
    };
    document.getElementById('btn-creator-back').addEventListener('click', creatorBackHandler);
    const creatorBackMobile = document.getElementById('btn-creator-back-mobile');
    if (creatorBackMobile) creatorBackMobile.addEventListener('click', creatorBackHandler);

    // Done screen
    document.getElementById('btn-go-home').addEventListener('click', () => {
      showScreen('home');
      renderHomeCharacters();
    });
    document.getElementById('btn-go-wardrobe').addEventListener('click', () => {
      const charData = CharacterCreator.getCurrentCharData();
      if (charData && charData.id) {
        showScreen('wardrobe');
        Wardrobe.init(charData.id);
        DragDrop.initDropZone();
      }
    });

    // Wardrobe
    // Wardrobe back buttons (desktop + mobile)
    const wardrobeBackHandler = () => {
      showScreen('home');
      renderHomeCharacters();
    };
    document.getElementById('btn-wardrobe-back').addEventListener('click', wardrobeBackHandler);
    const wardrobeBackMobile = document.getElementById('btn-wardrobe-back-mobile');
    if (wardrobeBackMobile) wardrobeBackMobile.addEventListener('click', wardrobeBackHandler);
    document.getElementById('btn-clear-outfit').addEventListener('click', () => Wardrobe.clearOutfit());
    document.getElementById('btn-save-look').addEventListener('click', () => showNameDialog());
    document.getElementById('btn-my-looks').addEventListener('click', () => Wardrobe.showLooksSidebar());
    document.getElementById('btn-close-looks').addEventListener('click', () => Wardrobe.hideLooksSidebar());

    // Mobile wardrobe action buttons (same actions, bigger buttons)
    const clearMobile = document.getElementById('btn-clear-outfit-mobile');
    const saveMobile = document.getElementById('btn-save-look-mobile');
    const looksMobile = document.getElementById('btn-my-looks-mobile');
    if (clearMobile) clearMobile.addEventListener('click', () => Wardrobe.clearOutfit());
    if (saveMobile) saveMobile.addEventListener('click', () => showNameDialog());
    if (looksMobile) looksMobile.addEventListener('click', () => Wardrobe.showLooksSidebar());

    // Dialogs
    document.getElementById('dialog-cancel').addEventListener('click', hideConfirmDialog);
    document.getElementById('name-dialog-cancel').addEventListener('click', hideNameDialog);
    document.getElementById('name-dialog-confirm').addEventListener('click', () => {
      const name = document.getElementById('look-name-input').value.trim() || 'Meu Look';
      Wardrobe.saveLook(name);
      hideNameDialog();
    });
    document.getElementById('look-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = e.target.value.trim() || 'Meu Look';
        Wardrobe.saveLook(name);
        hideNameDialog();
      }
    });
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId + '-screen');
    if (screen) {
      screen.classList.add('active');
      currentScreen = screenId;
    }
  }

  let fullscreenCharId = null;

  async function renderHomeCharacters() {
    const characters = Storage.getCharacters();
    const grid = document.getElementById('characters-grid');
    const empty = document.getElementById('empty-state');

    grid.innerHTML = '';

    if (characters.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    empty.classList.add('hidden');

    for (const char of characters) {
      // Simple card: just preview + name. Tap opens fullscreen.
      const card = document.createElement('div');
      card.className = 'character-card animate__animated animate__fadeIn';

      const previewDiv = document.createElement('div');
      previewDiv.className = 'card-preview';
      card.appendChild(previewDiv);

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = char.name || 'Sem nome';
      card.appendChild(nameEl);

      // Tap card -> open fullscreen
      card.addEventListener('click', () => openCharFullscreen(char.id));

      grid.appendChild(card);

      // Render thumbnail async
      Renderer.renderToDataURL(char, 130).then(dataUrl => {
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.maxHeight = '130px';
          previewDiv.appendChild(img);
        }
      });
    }
  }

  // ========== CHARACTER FULLSCREEN ==========

  async function openCharFullscreen(charId) {
    fullscreenCharId = charId;
    const char = Storage.getCharacter(charId);
    if (!char) return;

    document.getElementById('fs-name').textContent = char.name || 'Sem nome';
    document.getElementById('char-fullscreen').classList.remove('hidden');

    // Render big preview
    const area = document.getElementById('fs-preview').parentElement;
    const areaH = area.clientHeight - 16;
    const areaW = area.clientWidth - 16;
    const scale = Math.min(areaH / 800, areaW / 600, 1);
    await Renderer.renderToStage('fs-preview', char, scale);
  }

  function closeCharFullscreen() {
    document.getElementById('char-fullscreen').classList.add('hidden');
    fullscreenCharId = null;
  }

  function showDone(charData) {
    showScreen('done');
    Renderer.renderToStage('done-preview', charData, 0.8);
    const msg = document.getElementById('done-message');
    msg.textContent = `${charData.name || 'Sua personagem'} esta pronta para novas aventuras!`;
  }

  // Confirm dialog
  let confirmCallback = null;

  function showConfirmDialog(message, onConfirm) {
    document.getElementById('dialog-message').textContent = message;
    document.getElementById('dialog-overlay').classList.remove('hidden');
    confirmCallback = onConfirm;
    document.getElementById('dialog-confirm').onclick = () => {
      const cb = confirmCallback;
      hideConfirmDialog();
      if (cb) cb();
    };
  }

  function hideConfirmDialog() {
    document.getElementById('dialog-overlay').classList.add('hidden');
    confirmCallback = null;
  }

  // Name dialog
  function showNameDialog() {
    document.getElementById('look-name-input').value = '';
    document.getElementById('name-dialog-overlay').classList.remove('hidden');
    setTimeout(() => document.getElementById('look-name-input').focus(), 100);
  }

  function hideNameDialog() {
    document.getElementById('name-dialog-overlay').classList.add('hidden');
  }

  return {
    init,
    showScreen,
    showDone,
    renderHomeCharacters,
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());

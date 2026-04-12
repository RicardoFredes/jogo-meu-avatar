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

    // Debug: clear localStorage
    document.getElementById('btn-debug-clear').addEventListener('click', () => {
      if (confirm('Apagar todos os personagens salvos?')) {
        localStorage.clear();
        location.reload();
      }
    });

    // Creator navigation
    document.getElementById('btn-next-step').addEventListener('click', () => CharacterCreator.nextStep());
    document.getElementById('btn-prev-step').addEventListener('click', () => CharacterCreator.prevStep());
    document.getElementById('btn-creator-back').addEventListener('click', () => {
      showScreen('home');
      renderHomeCharacters();
    });

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
    document.getElementById('btn-wardrobe-back').addEventListener('click', () => {
      showScreen('home');
      renderHomeCharacters();
    });
    document.getElementById('btn-clear-outfit').addEventListener('click', () => Wardrobe.clearOutfit());
    document.getElementById('btn-save-look').addEventListener('click', () => showNameDialog());
    document.getElementById('btn-my-looks').addEventListener('click', () => Wardrobe.showLooksSidebar());
    document.getElementById('btn-close-looks').addEventListener('click', () => Wardrobe.hideLooksSidebar());

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
      const card = document.createElement('div');
      card.className = 'character-card animate__animated animate__fadeIn';

      // Preview container
      const previewDiv = document.createElement('div');
      previewDiv.className = 'card-preview';
      card.appendChild(previewDiv);

      // Name
      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.textContent = char.name || 'Sem nome';
      card.appendChild(nameEl);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'card-actions';

      const dressBtn = document.createElement('button');
      dressBtn.className = 'btn btn-primary';
      dressBtn.textContent = 'Vestir';
      dressBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showScreen('wardrobe');
        Wardrobe.init(char.id);
        DragDrop.initDropZone();
      });

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-secondary';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showScreen('creator');
        CharacterCreator.init(char.id);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-danger';
      delBtn.textContent = 'X';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showConfirmDialog('Apagar ' + (char.name || 'personagem') + '?', () => {
          Storage.deleteCharacter(char.id);
          renderHomeCharacters();
        });
      });

      actions.appendChild(dressBtn);
      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);
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

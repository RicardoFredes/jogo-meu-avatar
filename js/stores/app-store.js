/* ============================================
   APP STORE - Global UI state
   - current screen
   - hamburger menu visibility
   - global confirm/prompt modal
   - loading state
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.store('app', {
    ready: false,
    screen: 'loading', // loading | home | creator | done | wardrobe
    menuOpen: false,
    fullscreenCharId: null,

    // Unified modal: serves both confirm + prompt dialogs
    modal: {
      open: false,
      type: 'confirm', // 'confirm' | 'prompt'
      message: '',
      placeholder: '',
      value: '',
      confirmLabel: 'Sim',
      cancelLabel: 'Não',
      confirmClass: 'bg-red-500 text-white',
      onConfirm: null,
      onCancel: null,
    },

    showScreen(id) {
      this.screen = id;
    },

    openMenu() { this.menuOpen = true; },
    closeMenu() { this.menuOpen = false; },

    openFullscreen(charId) { this.fullscreenCharId = charId; },
    closeFullscreen() { this.fullscreenCharId = null; },

    // Promise-based confirm dialog
    confirm(message, {
      confirmLabel = 'Sim',
      cancelLabel = 'Não',
      confirmClass = 'bg-red-500 text-white',
    } = {}) {
      return new Promise((resolve) => {
        this.modal = {
          open: true,
          type: 'confirm',
          message,
          placeholder: '',
          value: '',
          confirmLabel,
          cancelLabel,
          confirmClass,
          onConfirm: () => { this.closeModal(); resolve(true); },
          onCancel: () => { this.closeModal(); resolve(false); },
        };
      });
    },

    // Promise-based prompt dialog
    prompt(message, {
      placeholder = '',
      defaultValue = '',
      confirmLabel = 'Salvar',
      cancelLabel = 'Cancelar',
    } = {}) {
      return new Promise((resolve) => {
        this.modal = {
          open: true,
          type: 'prompt',
          message,
          placeholder,
          value: defaultValue,
          confirmLabel,
          cancelLabel,
          confirmClass: 'bg-primary text-white',
          onConfirm: () => {
            const v = this.modal.value;
            this.closeModal();
            resolve(v);
          },
          onCancel: () => { this.closeModal(); resolve(null); },
        };
      });
    },

    closeModal() {
      this.modal.open = false;
    },
  });
});

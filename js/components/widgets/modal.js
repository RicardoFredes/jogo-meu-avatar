/* ============================================
   MODAL - Unified confirm/prompt dialog.
   Driven by Alpine.store('app').modal.

   Usage in HTML:
     <div x-data="modal()">...</div>
   ============================================ */

document.addEventListener('alpine:init', () => {
  Alpine.data('modal', () => ({
    get state() { return Alpine.store('app').modal; },

    submitOnEnter(event) {
      if (event.key === 'Enter' && this.state.type === 'prompt') {
        event.preventDefault();
        this.state.onConfirm?.();
      }
    },

    // Autofocus the input when a prompt opens
    onOpenChange() {
      if (this.state.open && this.state.type === 'prompt') {
        this.$nextTick(() => {
          const input = this.$refs.input;
          if (input) input.focus();
        });
      }
    },
  }));
});

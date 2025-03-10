<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalWrapper',
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
}
.modal-container {
  background: var(--theme-bg, #252525);
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}
</style>

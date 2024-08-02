<template>
  <portal to="modals">
    <modal 
      class="vue-dialog beekeeper-modal"
      name="util-died-modal"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          Utility Process Crashed
        </div>
        <div>
          Looks like the utility process has crashed! We've automatically restarted it, but you may need to reconnect to your database if you were previously connected. If this persists, please report it on our <a class="text-primary" href="https://github.com/beekeeper-studio/beekeeper-studio/issues/new/choose">issue tracker</a>.
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button 
          class="btn btn-flat"
          style="margin-right: 0.5rem;"
          type="button"
          @click.prevent="close"
        >
          Close
        </button>
        <button 
          class="btn btn-primary"
          type="button"
          @click.prevent="disconnect"
          autofocus
        >
          Disconnect
        </button>
      </div>
    </modal>
  </portal>
  
</template>

<script lang="ts">

export default {
  methods: {
    disconnect() {
      this.$store.dispatch('disconnect');
      this.$modal.hide('util-died-modal');
    },
    close() {
      this.$modal.hide('util-died-modal');
    }
  },
  mounted() {
    window.main.onUtilDied((_event) => {
      this.$modal.show('util-died-modal');
    });
  }
}
</script>

<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal"
      :name="modalName"
      @before-close="beforeClose"
    >
      <div class="dialog-content">
        <slot name="title">
          <div
            class="dialog-c-title"
          >
            Lost Connection
          </div>
        </slot>
        <slot name="message">
          <div>
            {{ connError }} Would you like to reconnect?
          </div>
        </slot>
      </div>
      <div class="vue-dialog-buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="disconnect"
          autofocus
          ref="dcButton"
        >
          Disconnect
        </button>
        <button
          class="btn btn-primary"
          type="button"
          @click.prevent="connect"
        >
          Reconnect
        </button>
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'

export default Vue.extend({
  data() {
    return {
      modalName: 'lost-connection-modal'
    }
  },
  computed: {
    ...mapState(['connError'])
  },
  watch: {
    connError(value) {
      if (value && value != "") {
        this.$modal.show(this.modalName);
      }
    }
  },
  methods: {
    beforeClose() {
      this.$store.commit('setConnError', null);
    },
    async connect() {
      try {
        await this.$store.dispatch('reconnect');
        this.$modal.hide(this.modalName);
      } catch (e) {
        this.$noty.error(e.message ?? e);
      }
    },
    disconnect() {
      this.$store.dispatch('disconnect');
      this.$modal.hide(this.modalName);
    }
  }
})
</script>

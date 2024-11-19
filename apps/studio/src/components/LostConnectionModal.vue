<template>
  <portal to="modals">
    <common-modal :id="modalName" @before-close="beforeClose">
      <template v-slot:title>
        Lost Connection
      </template>
      <template v-slot:content>
        {{ connError }} Would you like to reconnect?
      </template>
      <template v-slot:action>
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
      </template>
    </common-modal>
  </portal>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
import CommonModal from '@/components/common/modals/CommonModal.vue'

export default Vue.extend({
  components: { CommonModal },
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
      if (value) {
        this.$showModal(this.modalName);
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
        this.$hideModal(this.modalName);
      } catch (e) {
        this.$noty.error(e.message ?? e);
      }
    },
    disconnect() {
      this.$store.dispatch('disconnect');
      this.$hideModal(this.modalName);
    }
  }
})
</script>

<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal upgrade-modal"
      name="upgrade-modal"
      height="auto"
      :width="modalWidth"
    >
      <div
        class="dialog-content upgrade-modal-content"
        v-kbd-trap="true"
      >
        <button
          class="close-btn btn btn-fab"
          @click.prevent="close"
          aria-label="Close"
        >
          <i class="material-icons">clear</i>
        </button>
        <upgrade-panel
          :feature-name="featureName"
          @started-trial="close"
        />
      </div>
    </modal>
  </portal>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
import UpgradePanel from './UpgradePanel.vue'

export default Vue.extend({
  components: { UpgradePanel },
  data() {
    return {
      featureName: null as string | null,
      modalWidth: 620
    }
  },
  methods: {
    showModal(featureName?: string | null) {
      if (this.$store.getters.isCommunity) {
        this.featureName = featureName || null
        this.$modal.show('upgrade-modal')
      }
    },
    close() {
      this.$modal.hide('upgrade-modal')
    }
  },
  mounted() {
    this.$root.$on(AppEvent.upgradeModal, this.showModal)
  },
  beforeDestroy() {
    this.$root.$off(AppEvent.upgradeModal, this.showModal)
  }
})
</script>

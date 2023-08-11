<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal"
      name="upgrade-modal"
      height="auto"
    >
      <div class="dialog-content">
        <h3 class="dialog-c-title">
          Upgrade to use this feature
        </h3>
        <span class="close-btn btn btn-fab">
          <i
            class="material-icons"
            @click.prevent="$modal.hide('upgrade-modal')"
          >clear</i>
        </span>
        <p>This feature is only available in full (paid) version of Beekeeper Studio.</p>
        <p>
          The full version of Beekeeper Studio has great features like multi-table exports, backup and restore, Oracle support, Query Magics, and more!
        </p>
        <div class="vue-dialog-buttons">
          <a
            href="https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition"
            class="btn btn-flat"
          >Learn more</a>
          <a
            href="https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition"
            class="btn btn-primary"
          >Upgrade</a>
        </div>
      </div>
    </modal>
  </portal>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
export default Vue.extend({
  methods: {
    showModal() {
      this.$modal.show('upgrade-modal')
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

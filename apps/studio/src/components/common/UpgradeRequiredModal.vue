<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal upgrade-modal"
      name="upgrade-modal"
      height="auto"
    >
      <div class="dialog-content">
        <h3 class="dialog-c-title has-icon">
          <i class="material-icons">stars</i> <span>Upgrade To Premium</span>
        </h3>

        <span class="close-btn btn btn-fab">
          <i
            class="material-icons"
            @click.prevent="$modal.hide('upgrade-modal')"
          >clear</i>
        </span>
        <div class="checkbox-wrapper">
          <!-- <p class="text-muted">This feature is not included in the Community Edition. Please upgrade the app to continue.</p> -->
          <p class="text-muted"><strong v-if="message">{{ message }}.</strong> Upgrade to get exclusive featuers:</p>
          <div class="row">
            <div class="col s6">
              <ul class="check-list">
                <li>Run queries directly to file</li>
                <li>Export multiple tables</li>
                <li>Backup & restore</li>
                <li>Magic formatting</li>
                <li>More than 2 table filters</li>
              </ul>
            </div>
            <div class="col s6">
              <ul class="check-list">
                <li title="Oracle, Cassandra, BigQuery, and more">More database engines</li>
                <li>Cloud sync</li>
                <li>Read-only mode</li>
                <li>SQLite Extensions</li>
                <li>Import from CSV</li>
              </ul>
            </div>
          </div>
        </div>
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
  data() {
    return {
      message: null
    }
  },
  methods: {
    showModal(message) {
      this.message = message
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

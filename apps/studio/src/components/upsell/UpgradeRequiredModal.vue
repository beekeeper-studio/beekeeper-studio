<template>
  <portal to="modals">
    <modal
      class="vue-dialog beekeeper-modal upgrade-modal"
      name="upgrade-modal"
      height="auto"
    >
      <div
        class="dialog-content"
        v-kbd-trap="true"
      >
        <h3 class="dialog-c-title has-icon">
          <i class="material-icons">stars</i> <span>{{ $t('Upgrade Beekeeper Studio') }}</span>
        </h3>

        <a
          class="close-btn btn btn-fab"
          href="#"
          @click.prevent="$modal.hide('upgrade-modal')"
        >
          <i class="material-icons">clear</i>
        </a>
        <div class="checkbox-wrapper">
          <!-- <p class="text-muted">{{ $t('This feature is not included in the Community Edition. Please upgrade the app to continue.') }}</p> -->
          <p class="text-muted">
            <strong v-if="message">{{ message }}.</strong> {{ $t('Upgrade to get exclusive features:') }}
          </p>
          <div class="row">
            <div class="col s6">
              <ul class="check-list">
                <li>{{ $t('Run queries directly to file') }}</li>
                <li>{{ $t('Export multiple tables') }}</li>
                <li>{{ $t('Backup & restore') }}</li>
                <li>{{ $t('Magic formatting') }}</li>
                <li>{{ $t('More than 2 table filters') }}</li>
              </ul>
            </div>
            <div class="col s6">
              <ul class="check-list">
                <li :title="$t('Oracle, Cassandra, BigQuery, and more').toString()">
                  {{ $t('More database engines') }}
                </li>
                <li>{{ $t('Cloud sync') }}</li>
                <li>{{ $t('Read-only mode') }}</li>
                <li>{{ $t('SQLite Extensions') }}</li>
                <li>{{ $t('Import from file') }}</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <UpsellButtons />
        </div>
      </div>
    </modal>
  </portal>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
import UpsellButtons from '../upsell/common/UpsellButtons.vue';

export default Vue.extend({
  components: { UpsellButtons},
  data() {
    return {
      message: null
    }
  },
  methods: {
    showModal(message) {
      if (this.$store.getters.isCommunity) {
        this.message = message
        this.$modal.show('upgrade-modal')
      }
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

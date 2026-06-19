<template>
  <!-- This component is responsible for showing buttons based on user subscription status -->
  <!-- For example - can they start a trial? -->
  <div class="upsell-buttons">
    <div
      v-if="isSupportDateExpired"
      class="alert alert-warning"
    >
      <i class="material-icons">info_outline</i>
      <div class="alert-body">
        <span>
          Your existing license is not valid for this version of the app.
          <a @click.prevent="showLicenseInfo">Learn more.</a>
        </span>
      </div>
    </div>
    <div class="actions">
      <p v-if="trialExpired" class="help text-muted small">
        Free trial ended on {{ trialEndDate }}
      </p>
      <a v-if="trialAvailable" class="btn btn-flat" v-tooltip="'14 day free trial, no email or credit card required'" @click.prevent="startTrial">Start Free Trial</a>
      <a v-else :href="learnUrl" class="btn btn-flat">Learn more</a>
      <a @click.prevent="buyLicense" class="btn btn-primary" v-tooltip="'Get lifetime app access with any purchase'">Upgrade</a>
    </div>
  </div>
</template>
<style scoped lang="scss">
  .upsell-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
  }
  .help {
    margin: 0 auto 0 0;
    text-align: left;
  }
  .btn {
    white-space: nowrap;
    margin: 0;
    flex: 0 0 auto;
  }
  .alert {
    margin: 0;
    a {
      display: inline;
      font-weight: 700;
      cursor: pointer;
    }
  }
</style>
<script lang="js">
import { AppEvent } from '@/common/AppEvent';
import { mapState } from 'vuex';

export default {
  data: () => ({
    learnUrl: 'https://www.beekeeperstudio.io/upgrade',
    buyUrl: 'https://www.beekeeperstudio.io/pricing',
  }),
  computed: {
    ...mapState('licenses', { 'licenseStatus': 'status' }),
    trialLicense() {
      return this.$store.getters['licenses/trialLicense']
    },
    trialEndDate() {
      return this.trialLicense?.validUntil?.toDateString()
    },
    // Trial is only available if no licenses exist at all
    trialAvailable() {
      return this.$store.getters['licenses/noLicensesFound']
    },
    trialExpired() {
      if (!this.trialLicense) return false
      return this.trialLicense.validUntil < new Date()
    },
    isSupportDateExpired() {
      // this means a lifetime license that is no longer active.
      return this.licenseStatus.isSupportDateExpired
    }
  },
  methods: {
    startTrial() {
      this.$store.dispatch('licenses/add', { trial: true })
      this.$emit('started-trial')
    },
    showLicenseInfo() {
      this.$root.$emit(AppEvent.enterLicense)
    },
    buyLicense() {
      this.$native.openLink(this.buyUrl)
      this.$root.$emit(AppEvent.enterLicense)
    }
  }
}

</script>

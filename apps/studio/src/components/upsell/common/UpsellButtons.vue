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
      <span v-if="helpText" class="help">{{ helpText }}</span>
      <a v-if="trialAvailable" class="btn btn-flat" @click.prevent="startTrial">Start free trial</a>
      <a v-else :href="learnUrl" class="btn btn-flat">Learn more</a>
      <a @click.prevent="buyLicense" class="btn btn-primary" v-tooltip="'Get lifetime app access with any purchase'">Buy License</a>
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
    gap: 0.5rem;
  }
  .help {
    margin-right: auto;
    text-align: left;
    font-size: 0.8rem;
    color: var(--text-light);
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
    helpText() {
      if (this.trialAvailable) return '14-day trial. No email or credit card.'
      if (this.trialExpired) return `Trial ended ${this.trialEndDate}.`
      return null
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

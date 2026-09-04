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
      <span
        v-if="helpText"
        class="help"
      >
        {{ helpText }}
        <template v-if="!trialAvailable">
          <a
            href="#"
            class="request-link"
            @click.prevent="requestLicense"
          >Draft manager approval request</a>
        </template>
      </span>
      <a
        v-if="trialAvailable"
        class="btn btn-flat"
        @click.prevent="startTrial"
      >Start free trial</a>
      <a
        v-else
        :href="learnUrl"
        class="btn btn-flat"
      >Learn more</a>
      <a
        @click.prevent="buyLicense"
        class="btn btn-primary"
        v-tooltip="lifetimeTooltip"
      >Buy License</a>
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
    line-height: 1.4;
    color: var(--text-light);
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .request-link {
    color: var(--text-light);
    text-decoration: underline;
    cursor: pointer;
    &:hover {
      color: var(--text-dark);
    }
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
import { PRICING_URL } from '@/lib/approvalRequest';
import { mapState } from 'vuex';

export default {
  data: () => ({
    learnUrl: 'https://www.beekeeperstudio.io/upgrade',
    buyUrl: PRICING_URL,
    lifetimeTooltip: 'Pay for 12 months and keep lifetime access to the versions released in that period',
  }),
  computed: {
    ...mapState('licenses', { 'licenseStatus': 'status' }),
    trialLicense() {
      return this.$store.getters['licenses/trialLicense']
    },
    trialEndDate() {
      return this.trialLicense?.validUntil?.toLocaleDateString()
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
      if (this.trialAvailable) return '14-day free trial. Every paid feature, no email or card.'
      if (this.trialExpired) return `Trial ended ${this.trialEndDate}.`
      return 'Licenses are per person and unlock every paid feature.'
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
    requestLicense() {
      this.$emit('request-license')
      this.$root.$emit(AppEvent.purchaseRequest)
    },
    buyLicense() {
      this.$native.openLink(this.buyUrl)
      this.$root.$emit(AppEvent.enterLicense)
    }
  }
}

</script>

<template>
  <!-- This component is responsible for showing buttons based on user subscription status -->
  <!-- For example - can they start a trial? -->
  <div class="upsell-buttons">
    <p class="small text-muted card padding flex flex-middle" v-if="isSupportDateExpired">
      <span class="expand flex flex-middle">
        <i class="material-icons me-2">info_outline</i>
        <span>
          Your existing license is not valid for this version of the app.
          <a @click.prevent="showLicenseInfo">Learn more.</a>
        </span>
      </span>
    </p>
    <div class="actions">
      <a v-if="trialAvailable" class="btn btn-flat" v-tooltip="'14 day free trial, no email or credit card required'" @click.prevent="startTrial">Start Free Trial</a>
      <a v-else :href="learnUrl" class="btn btn-flat">Learn more</a>
      <a @click.prevent="buyLicense" class="btn btn-primary" v-tooltip="'Get lifetime app access with any purchase'">Buy License</a>
    </div>
    <p class="help text-right text-muted small" v-if="trialExpired">
      Your free trial ended on {{ trialEndDate }}
    </p>
  </div>
</template>
<style scoped lang="scss">
  .actions {
    display: flex;
    flex-direction: row;
  }
  .help {
    text-align: right;
  }
  .btn {
    white-space: nowrap;
  }
  p {
    .help {
      margin-bottom: 0;
    }
    a {
      display: inline;
      font-weight: 700;
    }
  }
</style>
<script lang="js">
import { AppEvent } from '@/common/AppEvent';
import { mapState } from 'vuex';

export default {
  data: () => ({
    learnUrl: 'https://docs.beekeeperstudio.io/docs/upgrading-from-the-community-edition',
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
    // if we've never started a trail, it's available!
    trialAvailable() {
      return !this.trialLicense
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

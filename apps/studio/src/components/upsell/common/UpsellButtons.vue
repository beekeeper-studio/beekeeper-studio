<template>
  <!-- This component is responsible for showing buttons based on user subscription status -->
  <!-- For example - can they start a trial? -->
  <div class="upsell-buttons">
    <p class="small text-muted card padding flex flex-middle" v-if="isSupportDateExpired">
      <span class="expand flex flex-middle">
        <i class="material-icons me-2">info_outline</i>
        <span>
          {{ $t('upgrade.license.expired') }}
          <a @click.prevent="showLicenseInfo">{{ $t('common.learnMore') }}</a>
        </span>
      </span>
    </p>
    <div class="actions">
      <a v-if="trialAvailable" class="btn btn-flat" v-tooltip="$t('upgrade.trial.tooltip')" @click.prevent="startTrial">{{ $t('upgrade.trial.start') }}</a>
      <a v-else :href="learnUrl" class="btn btn-flat">{{ $t('common.learnMore') }}</a>
      <a @click.prevent="buyLicense" class="btn btn-primary" v-tooltip="$t('upgrade.license.buyTooltip')">{{ $t('upgrade.license.buy') }}</a>
    </div>
    <p class="help text-right text-muted small" v-if="trialExpired">
      {{ $t('upgrade.trial.ended', { date: trialEndDate }) }}
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

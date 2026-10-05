<template>
  <div class="license-information card card-flat padding">
    <h3 class="card-title flex flex-middle">
      <span class="expand">{{ license.email }}</span>
      <a v-if="!licenseStatus.fromFile" @click.prevent="destroy" class="btn btn-danger btn-icon"><i class="material-icons">delete_outline</i><span>Remove from app</span></a>
    </h3>
    <div class="card-body">
      <div
        v-if="notice"
        class="alert license-notice-banner"
        :class="notice.expired ? 'alert-danger' : 'alert-warning'"
      >
        <i class="material-icons">info_outline</i>
        <div class="alert-body">
          <span>{{ notice.text }}</span>
          <a
            v-if="!notice.expired && notice.coveredVersion"
            :href="releaseUrl"
          >Install {{ notice.coveredVersion }}</a>
        </div>
      </div>
      <table class="simple-table">
        <tr>
          <td>License Type <a href="https://docs.beekeeperstudio.io/">learn more</a></td>
          <td>{{ licenseStatus.fromFile ? "Offline File License" : "Online License" }}</td>
        </tr>
        <template v-if="licenseStatus.fromFile">
          <tr>
            <td>File Path</td>
            <td>{{ licenseStatus.filePath }}</td>
          </tr>
        </template>
        <tr>
          <td>Status</td>
          <td>{{ status }}</td>
        </tr>
        <tr>
          <td>Software Updates Until</td>
          <td>{{ license.supportUntil.toLocaleDateString() }}</td>
        </tr>
        <tr>
          <td>Valid for app version</td>
          <td v-if="expiredLifetime">
            {{ license.maxAllowedAppRelease.tagName }} or lower
          </td>
          <td v-else-if="activeLicense">
            Any version
          </td>
          <td v-else>
            No access, new license required
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>
<style scoped>
table.simple-table {
  width: 100%;
  border-collapse: collapse;
}

table.simple-table th,
table.simple-table td {
  padding: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

table.simple-table tr:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.025);
  /* Light darkening for odd rows */
}

table.simple-table td:nth-child(2) {
  text-align: right;
}

table.simple-table th {
  text-align: left;
}
</style>
<script lang="js">
import { recordTrialEndDecision } from '@/lib/trial'

const RELEASES_URL = 'https://github.com/beekeeper-studio/beekeeper-studio/releases/tag/'

export default {
  props: ['license', 'licenseStatus'],
  computed: {
    /** Why paid features are off, when the registered key does not unlock this app. */
    notice() {
      const status = this.licenseStatus
      if (!status || status.isTrial || !status.isCommunity) return null
      const when = this.license.validUntil.toLocaleDateString()
      if (status.isValidDateExpired) {
        return { expired: true, text: `Ended ${when}, no lifetime terms. Expired keys cannot be reactivated; buy a new license to unlock this app.` }
      }
      const coveredVersion = this.license.maxAllowedAppRelease?.tagName
      const appVersion = this.$config?.appVersion
      return {
        expired: false,
        coveredVersion,
        text: `Lifetime use up to ${coveredVersion}; this is ${appVersion}. Paid features are off in this version. Buy a new license to unlock it, or`,
      }
    },
    releaseUrl() {
      return RELEASES_URL + (this.notice?.coveredVersion ?? '')
    },
    activeLicense() {
      return !this.licenseStatus.isValidDateExpired
    },
    expiredLifetime() {
      return this.licenseStatus.isSupportDateExpired && !this.licenseStatus.isValidDateExpired
    },
    status() {
      if (this.expiredLifetime) return "Expired, with lifetime access"
      if (this.activeLicense) return "Active License"
      return "Expired, no lifetime access"
    }
  },
  methods: {
    async destroy() {
      const trialExpired = this.$store.getters['licenses/trialLicense']?.validUntil < new Date()
      const consequence = trialExpired
        ? `Your trial ended on ${this.$store.getters['licenses/trialLicense'].validUntil.toLocaleDateString()}, so paid features turn off right away.`
        : 'Paid features turn off right away.'
      const confirmed = await this.$confirm(
        'Remove this license from the app?',
        `Beekeeper Studio switches to the Community Edition on this computer. ${consequence} The key itself stays valid and can be entered again at any time.`,
        { confirmLabel: 'Remove license', variant: 'danger' }
      )
      if (!confirmed) return
      await this.$store.dispatch('licenses/remove', this.license)
      // Removing a key is an explicit choice, so the trial-ended dialog does
      // not need to ask the same question again.
      if (this.$store.getters['licenses/isTrialExpired']) recordTrialEndDecision('downgraded')
      this.$noty.info('License removed. Now on the Community Edition; a key can be entered again at any time.')
    }
  }

}
</script>

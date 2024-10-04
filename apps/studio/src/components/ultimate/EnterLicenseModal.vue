<template>
  <modal
    name="license"
    class="vue-dialog beekeeper-modal"
    @opened="init"
  >
    <form @submit.prevent="submitLicense">
      <div class="dialog-content">
        <div class="dialog-c-title">
          License Key
        </div>
        <div class="dialog-c-subtitle">
          The license key will be validated with our servers.
        </div>
        <div
          class="existing-licenses"
          v-if="realLicenses.length"
        >
          <h4>Existing License</h4>
          <div
            class="dialog-c-subtitle"
            v-for="license in realLicenses"
            :key="license.key"
          >
            {{ license.email }} &middot; Auto renew: {{ isSubscription(license) ? 'on' : 'off' }} &middot; updates until: {{ timeAgo(license.supportUntil) }}
          </div>
          <div class="">
            Entering a new license will replace the existing license
          </div>
          <br>
        </div>
        <error-alert :error="error" />
        <div class="form-group">
          <label for="email">License Name</label>
          <input
            type="text"
            v-model="email"
          >
        </div>
        <div class="form-group">
          <label for="key">License Key</label>
          <input
            type="text"
            v-model="key"
          >
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <a
          @click.prevent="$modal.hide('license')"
          class="btn btn-flat"
        >Close</a>
        <span class="expand" />
        <span>
          <a
            href="https://beekeeperstudio.io/pricing"
            class="btn btn-flat"
          >Buy a License</a>
          <button
            type="submit"
            class="btn btn-primary"
          >Submit</button>
        </span>
      </div>
    </form>
  </modal>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import TimeAgo from 'javascript-time-ago'
import Vue from 'vue'
import { mapGetters } from 'vuex'
import ErrorAlert from '../common/ErrorAlert.vue'
import _ from 'lodash'
export default Vue.extend({
  components: { ErrorAlert },
  data: () => ({
    email: null, key: null,
    error: null
  }),
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  computed: {
    ...mapGetters('licenses', { 'realLicenses': 'realLicenses'}),
    rootBindings() {
      return [
        {
          event: AppEvent.enterLicense,
          handler: this.openModal
        }
      ]
    },
  },
  methods: {

    isSubscription(license) {
      return license.supportUntil > new Date('2888-01-1')
    },
    timeAgo(date) {
      if (date > new Date('2888-01-01')) {
        return 'forever'
      }
      const ta = new TimeAgo('en-US')

      return ta.format(date)
    },
    openModal() {
      console.log("opening license modal")
      this.$modal.show('license')
    },
    init() {
      this.email = null
      this.key = null
      this.error = null
    },
    async submitLicense() {
      try {
        await this.$store.dispatch('licenses/add', { email: this.email, key: this.key })
        this.$noty.success("License registered, thanks for supporting Beekeeper Studio.")
        this.$modal.hide('license')
        this.$store.dispatch('licenseEntered')
      } catch (error) {
        this.error = error
      }
    }
  }
})
</script>


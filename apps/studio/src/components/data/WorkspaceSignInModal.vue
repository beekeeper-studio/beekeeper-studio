<template>
  <modal
    name="workspace"
    class="vue-dialog beekeeper-modal"
    @opened="focus"
  >
    <form @submit.prevent="login">
      <div class="dialog-content">
        <div
          v-if="lockEmail"
          class="dialoc-c-title"
        >
          {{ $t('Reauthenticate') }} {{ email ? email : '' }}
        </div>
        <div
          v-else
          class="dialog-c-title"
        >
          {{ $t('Team workspace account sign-in') }} <a
            v-tooltip="$t('Store connections and queries in the cloud, share with colleagues. Click to learn more.')"
            href="https://beekeeperstudio.io/workspaces"
          ><i class="material-icons">help_outlined</i></a>
        </div>
        <error-alert :error="error" />
        <div class="form-group">
          <label for="email">{{ $t('Email Address') }}</label>
          <input
            ref="email"
            type="text"
            :disabled="lockEmail"
            v-model="email"
            :placeholder="$t('e.g. matthew@example.com')"
          >
        </div>
        <div class="form-group">
          <label for="password">{{ $t('Password') }}</label>
          <input
            type="password"
            ref="password"
            v-model="password"
            :placeholder="$t('Shh...')"
          >
        </div>
      </div>
      <div class="vue-dialog-buttons flex-between">
        <span class="left">
          <a
            href="https://app.beekeeperstudio.io/users/sign_up"
            class="small text-muted"
          >{{ $t('Create Account') }}</a>
          <a
            href="https://app.beekeeperstudio.io/users/sign_in"
            class="small text-muted"
          >{{ $t('Forgot Password') }}</a>
        </span>
        <span class="right">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="$modal.hide('workspace')"
          >{{ $t('Cancel') }}</button>
          <button
            class="btn btn-primary"
            :disabled="loading"
            type="submit"
          >{{ loading ? '...' : $t('Submit') }}</button>
        </span>
      </div>
    </form>
  </modal>
</template>
<script lang="ts">

import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import Vue from 'vue'
export default Vue.extend({
  components: { ErrorAlert },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  data() {
    return {
      loading: false,
      email: null,
      password: null,
      error: null,
      lockEmail: false
    }
  },
  computed: {
    rootBindings() {
      return [
        {
          event: AppEvent.promptLogin,
          handler: this.openModal
        }
      ]
    }
  },
  methods: {
    openModal(email?: string) {
      console.log("open modal with ", email)
      this.email = email ? email : null
      this.lockEmail = !!email
      this.error = null
      this.password = null
      this.$modal.show('workspace')
    },
    focus() {
      const element = this.lockEmail ? this.$refs.password : this.$refs.email
      element.focus()
    },
    async login() {
      try {
        this.error = null
        this.loading = true
        await this.$store.dispatch('credentials/login', { email: this.email, password: this.password })
        this.$modal.hide('workspace')
      } catch(ex) {
        this.error = ex
      } finally {
        this.loading = false
      }
    }
  }
})
</script>

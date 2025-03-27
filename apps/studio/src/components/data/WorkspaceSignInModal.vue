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
          Reauthenticate {{ email ? email : '' }}
        </div>
        <div
          v-else
          class="dialog-c-title"
        >
          Team workspace account sign-in <a
            v-tooltip="'Store connections and queries in the cloud, share with colleagues. Click to learn more.'"
            href="https://beekeeperstudio.io/workspaces"
          ><i class="material-icons">help_outlined</i></a>
        </div>
        <error-alert :error="error" />
        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            ref="email"
            type="text"
            :disabled="lockEmail"
            v-model="email"
            placeholder="e.g. matthew@example.com"
          >
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            ref="password"
            v-model="password"
            placeholder="Shh..."
          >
        </div>
      </div>
      <div class="vue-dialog-buttons flex-between">
        <span class="left">
          <a
            href="https://app.beekeeperstudio.io/users/sign_up"
            class="small text-muted"
          >Create Account</a>
          <a
            href="https://app.beekeeperstudio.io/users/sign_in"
            class="small text-muted"
          >Forgot Password</a>
        </span>
        <span class="right">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="$modal.hide('workspace')"
          >Cancel</button>
          <button
            class="btn btn-primary"
            :disabled="loading"
            type="submit"
          >{{ loading ? '...' : 'Submit' }}</button>
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

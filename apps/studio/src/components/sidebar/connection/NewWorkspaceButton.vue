<template>
  <div class="add-workspace-button">
    <a @click.prevent="addWorkspace" class="nav-item">
      <span class="avatar btn-link"><i class="material-icons">add</i></span>
    </a>
    <modal name="workspace" class="vue-dialog beekeeper-modal" >
      <form @submit.prevent="login">
        <div class="dialog-content">
          <div class="dialog-c-title">Workspace Sign-in</div>
          <error-alert :error="error" />
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="text" :disabled="lockEmail" v-model="email" placeholder="e.g. matthew@example.com">
          </div>
          <div class="form-group">
            <label for="password">Password</label><input type="password" v-model="password" placeholder="Shh...">
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button class="btn btn-primary" type="submit">Submit</button>
        </div>
      </form>
    </modal>
  </div>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { CredentialBlob } from '@/store/modules/CredentialsModule'
import Vue from 'vue'
export default Vue.extend({
  components: { ErrorAlert },
  mounted() {
    this.registerHandlers(this.rootBindings)
  },
  data() {
    return {
      email: null,
      password: null,
      error: null,
      lockEmail: false,
    }
  },
  computed: {
    rootBindings() {
      return [
        { event: AppEvent.promptLogin, handler: this.handleLogin }
      ]
    }
  },
  methods: {
    handleLogin(c?: CredentialBlob) {
      if (c) {
        this.email = c.credential.email
        this.lockEmail = true
        this.password = null
        this.$modal.show('workspace')
      } else {
        this.addWorkspace()
      }
    },
    addWorkspace() {
      this.email = null
      this.password = null
      this.lockEmail = false
      this.error = null
      this.$modal.show('workspace')
    },
    async login() {
      try {
        await this.$store.dispatch('credentials/login', { email: this.email, password: this.password })
        this.$modal.hide('workspace')
      } catch(ex) {
        this.error = ex
      }
    }
  }
})
</script>
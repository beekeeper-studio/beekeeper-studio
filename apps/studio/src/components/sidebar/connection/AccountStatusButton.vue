<template>
  <div class="account-status-button">
    <a
      class="nav-item account"
      :title="title"
      @click.prevent="showAccountsModal"
    >
      <span class="avatar">
        <i class="material-icons">person</i>
        <status-badge :credentials="credentials" />
      </span>
    </a>
    <modal class="beekeeper-dialog vue-dialog" name="account-status-modal" height="auto" :scrollable="true" >
      <div class="dialog-content">
        <div class="dialog-c-title">Connected Accounts</div>
        <div class="list-group">
          <div class="list-body">
            <div class="list-item account" v-for="blob in credentials" :key="blob.id">
              <a class="list-item-btn">
                <div class="content expand">
                  <div class="title">{{blob.credential.email}}</div>
                  <div class="subtitle">
                    <status-badge :credentials="[blob]" v-if="blob.error" />
                    <span v-if="blob.error" class="text-danger">{{blob.error.message}}</span>
                    <span v-else>{{workspaceText(blob)}}</span>

                  </div>
                </div>

                <div>
                  <x-button class="actions-btn btn btn-flat" title="actions">
                    <span>Actions</span>
                    <i class="material-icons">arrow_drop_down</i>
                    <x-menu>
                      <x-menuitem @click.prevent="refresh">
                        <x-labe>Refresh</x-labe>
                      </x-menuitem>
                      <x-menuitem @click.prevent="reauth(blob)" title="Sign in again with the same email and a new password">
                        <x-label>Re-authenticate</x-label>
                      </x-menuitem>
                      <x-menuitem @click.prevent="logout(blob)" title="Sign out of this account">
                        <x-label>Log out</x-label>
                      </x-menuitem>
                    </x-menu>
                  </x-button>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div class="vue-dialog-buttons">
        <button class="btn btn-primary" type="button" @click.prevent="login"><i class="material-icons">add</i> Add Account</button>
        <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('account-status-modal')">Close</button>
      </div>
    </modal>
  </div>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import { CredentialBlob } from '@/store/modules/CredentialsModule'
import Vue from 'vue'
import { mapState } from 'vuex'
import pluralize from 'pluralize'
import StatusBadge from './StatusBadge.vue'

export default Vue.extend({
  components: { StatusBadge },
  data() {
    return {
    }
  },
  computed: {
    ...mapState('credentials', ['credentials', 'error']),
    creds() {
      return this.credentials.map((i) => i.credential)
    },

    title() {
      const errorCount = this.credentials.filter((c) => c.error).length
      if (this.error) return this.error.message
      const result = `Signed into ${this.credentials.length} Accounts`
      return errorCount ? `${result} (${errorCount} Problems)` : result
    },
  },
  methods: {
    workspaceText(blob: CredentialBlob) {
      return pluralize("Workspace", blob.workspaces.length, true)
    },
    showAccountsModal() {
      this.$modal.show('account-status-modal')
    },
    reauth(c: CredentialBlob) {
      this.$modal.hide('account-status-modal')
      this.$root.$emit(AppEvent.promptLogin, c)
    },
    refresh() {
      this.$modal.hide('account-status-modal')
      this.$store.commit('credentials/load')
    },
    login() {
      this.$modal.hide('account-status-modal')
      this.$root.$emit(AppEvent.promptLogin)
    },
    logout(c: CredentialBlob) {
      this.$store.dispatch('credentials/logout', c)
    }
  }
})
</script>
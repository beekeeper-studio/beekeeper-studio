<template>
  <div
    class="add-workspace-button"
    :class="{disabled: !credentials.length}"
    v-tooltip="title"
  >
    <bk-button class="nav-item" @click="onClick">
      <span class="avatar-btn-link"><i class="material-icons">add</i></span>
      <bk-menu v-if="credentials.length && $store.getters.isUltimate">
        <bk-menuitem @click.prevent="createWorkspace">
          <bk-label>Create a new workspace</bk-label>
        </bk-menuitem>
        <bk-menuitem @click.prevent="addWorkspace">
          <bk-label>{{ credentials.length ? 'Sign in to another workspace account' : 'Sign in' }}</bk-label>
        </bk-menuitem>
      </bk-menu>
    </bk-button>
  </div>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
import { mapState } from 'vuex'
export default Vue.extend({
  computed: {
    ...mapState('credentials', {credentials: 'credentials'}),
    title() {
      return this.credentials.length ? '' : 'Create Workspace - Please sign in to your workspace account first'
    },
  },
  methods: {
    addWorkspace() {
      this.$root.$emit(AppEvent.promptLogin)
    },
    createWorkspace() {
      this.$root.$emit(AppEvent.promptCreateWorkspace)
    },
    signup() {
      document.location.href = `${this.$config.cloudUrl}/users/sign_up`
    },
    onClick() {
      if (this.$store.getters.isCommunity) {
        this.$root.$emit(AppEvent.upgradeModal, 'Cloud Workspaces')
      }
    },
  }
})
</script>

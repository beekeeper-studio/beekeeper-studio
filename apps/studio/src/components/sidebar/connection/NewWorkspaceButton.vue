<template>
  <div
    class="add-workspace-button"
    :class="{disabled: !credentials.length}"
    v-tooltip="title"
  >
    <x-button class="nav-item" @click="onClick">
      <span class="avatar-btn-link"><i class="material-icons">add</i></span>
      <x-menu v-if="credentials.length && $store.getters.isUltimate">
        <x-menuitem @click.prevent="createWorkspace">
          <x-label>Create a new workspace</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="addWorkspace">
          <x-label>{{ credentials.length ? 'Sign in to another workspace account' : 'Sign in' }}</x-label>
        </x-menuitem>
      </x-menu>
    </x-button>
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
        this.$root.$emit(AppEvent.upgradeModal)
      }
    },
  }
})
</script>

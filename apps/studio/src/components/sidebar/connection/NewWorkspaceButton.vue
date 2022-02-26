<template>
  <div class="add-workspace-button" :class="{disabled: !credentials.length}" v-tooltip="title">
    <x-button class="nav-item">
      <span class="avatar-btn-link"><i class="material-icons">add</i></span>
      <x-menu v-if="credentials.length">
        <x-menuitem 
          v-if="credentials.length"
          @click.prevent="createWorkspace"
        >
          <x-label>Create a new workspace</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="addWorkspace">
          <x-label>{{credentials.length ? 'Sign in to another account' : 'Sign in'}}</x-label>
        </x-menuitem>

      </x-menu>
    </x-button>
  </div>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import platformInfo from '@/common/platform_info'
import Vue from 'vue'
import { mapState } from 'vuex'
export default Vue.extend({
  computed: {
    ...mapState('credentials', {credentials: 'credentials'}),
    title() {
      return this.credentials.length ? '' : 'Create Workspace - Please sign in to your account first'
    },
  },
  methods: {
    addWorkspace() {
      this.$root.$emit(AppEvent.promptLogin)
    },
    createWorkspace() {
      document.location.href = `${platformInfo.cloudUrl}/workspaces/new`
    },
    signup() {
      document.location.href = `${platformInfo.cloudUrl}/users/sign_up`
    }

  }
})
</script>

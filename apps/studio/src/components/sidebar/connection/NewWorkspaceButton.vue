<template>
  <div class="add-workspace-button" title="Online Workspace">
    <x-button class="nav-item">
      <span class="avatar-btn-link"><i class="material-icons">add</i></span>
      <x-menu>
        <template v-if="credentials.length">
          <x-menuitem @click.prevent="createWorkspace">
            <x-label>Create a new workspace</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="addWorkspace">
            <x-label>Sign in to another account</x-label>
          </x-menuitem>
        </template>
        <template v-else>
          <x-menuitem @click.prevent="addWorkspace">
            <x-label>Sign in</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="signup">
            <x-label>Create an account</x-label>
          </x-menuitem>
        </template>
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
    ...mapState('credentials', {credentials: 'credentials'})
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

<template>
  <div class="core-account-button">
    <x-button
      class="nav-item account"
      menu
    >
      <span
        :title="title"
        class="avatar"
      >
        <i class="material-icons-outlined">account_circle</i>
        <status-badge
          :errors="[pollError]"
          :display="true"
        />
      </span>
      <x-menu>
        <x-menuitem disabled>
          <x-label>{{ title }}</x-label>
        </x-menuitem>
        <x-menuitem @click.prevent="manage">
          <x-label>{{ $t('Manage Workspace') }}</x-label>
        </x-menuitem>
        <x-menuitem
          v-if="workspace.level === 'team' && workspace.isOwner"
          @click.prevent="invite"
        >
          <x-label>{{ $t('Add Users') }}</x-label>
        </x-menuitem>
        <x-menuitem
          v-if="pollError"
          @click.prevent="reAuthenticate"
        >
          <x-label>
            {{ $t('Log In Again') }}
          </x-label>
        </x-menuitem>
      </x-menu>
    </x-button>
  </div>
</template>
<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import StatusBadge from '@/components/sidebar/connection/StatusBadge.vue'
import Vue from 'vue'
import { mapGetters } from 'vuex'
export default Vue.extend({
  components: { StatusBadge },
  computed: {
    ...mapGetters(['pollError', 'workspace']),
    title() {
      if (this.pollError) return this.pollError.message

      return this.$t('Connected to {name}', { name: this.workspace.name })
    },
  },
  methods: {
    manage() {
      window.location.href = this.workspace.url
    },
    invite() {
      window.location.href = `${this.workspace.url}/invitations/new`
    },
    triggerImport() {
      this.$root.$emit(AppEvent.promptQueryImport)
    },
    reAuthenticate() {
      this.$root.$emit(AppEvent.promptLogin, this.$store.getters.workspaceEmail)
    }
  }
  
})
</script>
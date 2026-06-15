<template>
  <div class="core-account-button">
    <bk-button
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
      <bk-menu>
        <bk-menuitem disabled>
          <bk-label>{{ title }}</bk-label>
        </bk-menuitem>
        <bk-menuitem @click.prevent="manage">
          <bk-label>Manage Workspace</bk-label>
        </bk-menuitem>
        <bk-menuitem
          v-if="workspace.level === 'team' && workspace.isOwner"
          @click.prevent="invite"
        >
          <bk-label>Add Users</bk-label>
        </bk-menuitem>
        <bk-menuitem
          v-if="pollError"
          @click.prevent="reAuthenticate"
        >
          <bk-label>
            Log In Again
          </bk-label>
        </bk-menuitem>
      </bk-menu>
    </bk-button>
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

      return `Connected to ${this.workspace.name}`
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
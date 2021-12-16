<template>
    <div class="workspace-items global-items">
      <div v-if="!loading">
        <a
          v-for="blob in availableWorkspaces"
          :key="blob.workspace.id"
          :class="{active: blob.workspace.id === workspaceId}"
          class="workspace-item nav-item selectable"
          :title="blob.workspace.name"
          @click.prevent="click(blob)"
        >
          <span class="avatar">
            <workspace-avatar :workspace="blob.workspace" />
          </span>
        </a>
        <new-workspace-button />
      </div>
      <div v-if="loading" class="global-loading">
        <content-placeholder :rounded="true">
          <content-placeholder-img extraStyles="margin: 5px 0 10px;" v-for="x in 3" :key="x" :circle="true" />
        </content-placeholder>
      </div>
      <span class="expand"></span>
      <a @click.prevent="refresh" class="nav-item refresh" title="Refresh Workspaces">
        <span class="avatar"><i class="material-icons">refresh</i></span>
      </a>
      <account-status-button />
    </div>
</template>

<script lang="ts">
import { IWorkspace } from '@/common/interfaces/IWorkspace'
import ContentPlaceholder from '@/components/common/loading/ContentPlaceholder.vue'
import ContentPlaceholderImg from '@/components/common/loading/ContentPlaceholderImg.vue'
import WorkspaceAvatar from '@/components/common/WorkspaceAvatar.vue'
import AccountStatusButton from '@/components/sidebar/connection/AccountStatusButton.vue'
import { CloudClient } from '@/lib/cloud/CloudClient'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import NewWorkspaceButton from './connection/NewWorkspaceButton.vue'

export default Vue.extend({
components: { NewWorkspaceButton, WorkspaceAvatar, AccountStatusButton, ContentPlaceholderImg, ContentPlaceholder },
  props: ['activeItem'],
  computed: {
    ...mapState('credentials', ['credentials', 'loading']),
    ...mapState(['workspaceId']),
    ...mapGetters('credentials', { 'availableWorkspaces': 'workspaces'})
  },
  methods: {
    refresh() {
      this.$store.dispatch('credentials/load')
    },
    click(blob: { workspace: IWorkspace, client: CloudClient}) {
      this.$store.commit('workspaceId', blob.workspace.id)
    }
  },
  mounted() {
    this.$store.dispatch('credentials/load')
  }
})
</script>
<style scoped>
  .global-loading {
    margin-left:5px;
    margin-right: 5px;
  }
</style>
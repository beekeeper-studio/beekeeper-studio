<template>
  <div class="workspace-items global-items">
    <div v-if="!loading">
      <a
        v-for="blob in availableWorkspaces"
        :key="blob.workspace.id"
        :class="{active: blob.workspace.id === workspaceId}"
        class="workspace-item nav-item selectable"
        v-tooltip.right-end="workspaceTitle(blob.workspace)"
        @contextmenu="$bks.openMenu({item: blob, options: contextOptionsFor(blob), event: $event})"
        @click.prevent="click(blob)"
      >
        <span class="avatar">
          <workspace-avatar :workspace="blob.workspace" />
        </span>
      </a>
      <new-workspace-button />
    </div>
    <div
      v-if="loading"
      class="global-loading"
    >
      <content-placeholder :rounded="true">
        <content-placeholder-img
          extra-styles="margin: 5px 0 10px;"
          v-for="x in 3"
          :key="x"
          :circle="true"
        />
      </content-placeholder>
    </div>
    <span class="expand" />
    <a
      @click.prevent="refresh"
      class="nav-item refresh"
      title="Refresh Workspaces"
    >
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
import { WSWithClient } from '@/store/modules/CredentialsModule'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import NewWorkspaceButton from './connection/NewWorkspaceButton.vue'
import { AppEvent } from '@/common/AppEvent'

export default Vue.extend({
components: { NewWorkspaceButton, WorkspaceAvatar, AccountStatusButton, ContentPlaceholderImg, ContentPlaceholder },
  props: ['activeItem'],
  computed: {
    ...mapState('credentials', ['credentials', 'loading']),
    ...mapState(['workspaceId']),
    ...mapState('settings', ['settings']),
    ...mapGetters('credentials', { 'availableWorkspaces': 'workspaces'}),

  },
  methods: {
    contextOptionsFor(blob: WSWithClient ) {
      const result = [
        { name: "Manage Workspace", slug: "manage", handler: ({item}) => window.location.href = item.workspace.url}
      ]
      if (blob.workspace.isOwner) {
        result.push({
          name: "Rename Workspace",
          slug: 'rename',
          handler: () => this.$root.$emit(AppEvent.promptRenameWorkspace, {
            workspace: blob.workspace,
            client: blob.client,
          }),
        }, {
          name: "Add Users",
          slug: 'invite',
          handler: ({item}) => window.location.href = `${item.workspace.url}/invitations/new`
        })
      }
      return result
    },
    workspaceTitle(workspace: IWorkspace) {
      const result = [workspace.name, `(${workspace.level})`]
      if (workspace.trialEndsIn) {
        result.push(`[trial ends ${workspace.trialEndsIn}]`)
      }

      return result.join(" ")
    },
    refresh() {
      if (this.$store.getters.isCommunity) {
        this.$root.$emit(AppEvent.upgradeModal)
        return
      }
      this.$store.dispatch('credentials/load')
    },
    click(blob: { workspace: IWorkspace, client: CloudClient}) {
      if (this.$store.getters.isCommunity) {
        this.$root.$emit(AppEvent.upgradeModal)
        return
      }
      this.$store.commit('workspaceId', blob.workspace.id)
      const defaultWorkspace = {
        ...this.settings['lastUsedWorkspace'],
        ...{
          _userValue: blob.workspace.id.toString()
        }
      }
      this.$store.dispatch('settings/saveSetting', defaultWorkspace)
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

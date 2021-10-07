<template>
    <div class="workspace global-items">
      <!-- <div class="divider"><hr></div> -->
      <a
        v-for="blob in availableWorkspaces"
        :key="blob.workspace.id"
        :class="{active: blob.workspace.id === workspaceId}"
        class="nav-item"
        :title="blob.workspace.name"
        @click.prevent="click(blob)"
      >
        <span class="avatar">
          <workspace-avatar :workspace="blob.workspace" />
        </span>
      </a>
      <new-workspace-button />
      <span class="expand"></span>
    </div>
</template>

<script lang="ts">
import { IWorkspace, LocalWorkspace } from '@/common/interfaces/IWorkspace'
import WorkspaceAvatar from '@/components/common/WorkspaceAvatar.vue'
import { CloudClient } from '@/lib/cloud/CloudClient'
import Vue from 'vue'
import { mapState } from 'vuex'
import NewWorkspaceButton from './connection/NewWorkspaceButton.vue'

  export default Vue.extend({
  components: { NewWorkspaceButton, WorkspaceAvatar },
    props: ['activeItem'],
    computed: {
      ...mapState('credentials', ['workspaces']),
      ...mapState(['workspaceId']),
      availableWorkspaces() {
        return [
          { workspace: LocalWorkspace, client: null},
          ...this.workspaces
        ]
      },
    },
    methods: {
      click(blob: { workspace: IWorkspace, client: CloudClient}) {
        this.$store.commit('workspaceId', blob.workspace.id)
      }
    },
    mounted() {
      this.$store.dispatch('credentials/load')
    }
  })
</script>

<template>
    <div class="workspace global-items">
      <a
        class="nav-item"
        title="Personal Workspace"
        :class="{active: localWorkspace === workspace}"
        @click.prevent="click({ workspace: localWorkspace })"
      >
        <span class="avatar"><i class="material-icons">person</i></span>
      </a>
      <div class="divider"><hr></div>

      <a
        v-for="blob in workspaces"
        :key="blob.workspace.id"
        :class="{active: blob.workspace === workspace}"
        class="nav-item"
        :title="blob.workspace.name"
        @click.prevent="click(blob)"
      >
        <span class="avatar">{{blob.workspace.name.toUpperCase()[0]}}</span>
      </a>
      <new-workspace-button />
    </div>
</template>

<script lang="ts">
import { IWorkspace } from '@/common/interfaces/IWorkspace'
import { CloudClient } from '@/lib/cloud/CloudClient'
import Vue from 'vue'
import { mapState } from 'vuex'
import NewWorkspaceButton from './connection/NewWorkspaceButton.vue'

  export default Vue.extend({
  components: { NewWorkspaceButton },
    props: ['activeItem'],
    computed: {
      ...mapState('credentials', ['workspaces']),
      ...mapState(['localWorkspace', 'workspace'])
    },
    methods: {
      click(blob: { workspace: IWorkspace, client: CloudClient}) {
        this.$store.commit('workspace', blob.workspace)
        if (blob.client) {
          blob.client.setWorkspace(blob.workspace.id)
        }
        this.$store.commit('client', blob.client || null)
      }
    },
    mounted() {
      this.$store.dispatch('credentials/load')
    }
  })
</script>

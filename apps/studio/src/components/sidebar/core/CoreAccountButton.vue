<template>
  <div class="core-account-button">
    <x-button class="nav-item account" menu>
      <span :title="title" class="avatar">
        <i class="material-icons-outlined">account_circle</i>
        <status-badge :errors="[pollError]" :display="true" />
      </span>
      <x-menu>
        <x-menuitem disabled>
          <x-label>{{title}}</x-label>
        </x-menuitem>
        <x-menuitem v-if="pollError" @click.prevent="reAuthenticate">
          <x-label>
            Log In Again
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

      return `Connected to ${this.workspace.name}`
    },
  },
  methods: {
    triggerImport() {
      this.$root.$emit(AppEvent.promptQueryImport)
    },
    reAuthenticate() {
      this.$root.$emit(AppEvent.promptLogin, this.$store.getters.workspaceEmail)
    }
  }
  
})
</script>
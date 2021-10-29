<template>
  <div class="add-workspace-button">
    <a @click.prevent="addWorkspace" title="Connect another account" class="nav-item">
      <span class="avatar btn-link"><i class="material-icons">add</i></span>
    </a>
  </div>
</template>

<script lang="ts">
import { AppEvent } from '@/common/AppEvent'
import Vue from 'vue'
export default Vue.extend({
  methods: {
    addWorkspace() {
      this.$root.$emit(AppEvent.promptLogin)
    },

  }
})
</script>

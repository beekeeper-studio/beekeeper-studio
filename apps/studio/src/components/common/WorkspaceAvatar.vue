<template>
  <div class="workspace-avatar">
    <img class="workspace-logo" v-if="workspace.logo" :src="workspace.logo" :alt="workspace.name" />
    <i v-else-if="workspace.icon" class="material-icons workspace-icon">{{workspace.icon}}</i>
    <span v-else class="workspace-letter">{{workspace.name.toUpperCase()[0]}}</span>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['workspace']
})
</script>
<template>
  <div class="diff-viewer">
      <div class="diff-preview" ref="cm" v-html="diff"></div>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['diff'],
  data: () => ({
    editor: null
  }),
  mounted() {
  },
})
</script>
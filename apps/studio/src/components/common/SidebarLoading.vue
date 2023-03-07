<template>
  <nav class="sidebar-loading list-body">
    <content-placeholder :animated="true" :rounded="false" class="list-item">
      <content-placeholder-text :lines="2" v-for="n in 3" :key="n" class="list-item-btn" />
      <!-- <content-placeholder-heading v-for="n in 10" :key="n" :img="true" class="list-item-btn" /> -->
    </content-placeholder>
  </nav>
</template>
<script lang="ts">
import ContentPlaceholder from '@/components/common/loading/ContentPlaceholder.vue'
import ContentPlaceholderText from '@/components/common/loading/ContentPlaceholderText.vue'
import Vue from 'vue'
export default Vue.extend({
  components: { ContentPlaceholder, ContentPlaceholderText },
  
})
</script>

<style scoped>
  .list-item-btn:hover {
    background: transparent!important;
  }
</style>
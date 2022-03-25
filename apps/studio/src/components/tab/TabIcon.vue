<template>
  <table-icon v-if="tab.type === 'table'" :table="tab" />
  <i v-else-if="tab.type === 'query'" class="material-icons item-icon query">code</i>
  <i v-else-if="tab.type === 'table-properties'" class="material-icons-outlined item-icon table-properties" :class="iconClass">construction</i>
  <i v-else-if="tab.type === 'settings'" class="material-icons item-icon settings">settings</i>
  <i v-else-if="tab.type ==='table-builder'" class="material-icons item-icon table-builder">add</i>
  <i v-else class="material-icons item-icon">new_releases</i>
</template>
<script lang="ts">
import Vue from 'vue'
import TableIcon from '../common/TableIcon.vue'
export default Vue.extend({
  components: { TableIcon },
  props: ['tab'],
  computed: {
    iconClass() {
      const result = {}
      result[`${this.tab.entityType}-icon`] = true
      return result
    },
  }
})
</script>

<template>
  <table-icon
    v-if="tab.tabType === 'table'"
    :table="tab"
  />
  <i
    v-else-if="tab.tabType === 'view'"
    class="material-icons item-icon view-icon"
  >grid_on</i>
  <i
    v-else-if="tab.tabType === 'query'"
    class="material-icons item-icon query"
  >code</i>
  <i
    v-else-if="tab.tabType === 'table-properties'"
    class="material-icons-outlined item-icon icon-table-properties"
    :class="iconClass"
  >construction</i>
  <i
    v-else-if="tab.tabType === 'settings'"
    class="material-icons item-icon settings"
  >settings</i>
  <i
    v-else-if="tab.tabType ==='table-builder'"
    class="material-icons item-icon table-builder-icon"
  >add</i>
  <i
    v-else
    class="material-icons item-icon"
  >new_releases</i>
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

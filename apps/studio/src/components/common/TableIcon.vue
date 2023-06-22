<template>
  <i
    :title="title"
    class="material-icons item-icon"
    :class="iconClass"
  >grid_on</i>
</template>
<script>
import _ from 'lodash'
export default {
  props: ['table'],
  computed: {
    iconClass() {
      const result = {}
      result[`${this.table.entityType}-icon`] = true
      return result
    },
      title() {
        return _.startCase(this.table.entityType)
      },
  }
}
</script>
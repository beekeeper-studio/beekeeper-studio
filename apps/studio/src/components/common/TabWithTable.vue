<template>
  <div class="with-table-wrapper">
    <div v-if="!tablesInitialLoaded">
      <x-progressbar />
    </div>
    <div class="no-content" v-else-if="!table">
      <div class="alert alert-danger">
        <i class="material-icons">error_outline</i>
        <div class="alert-body">
          This table does not exist
        </div>
        <a @click.prevent="close" class="btn btn-flat">Close Tab</a>
      </div>
    </div>
    <template v-else>
      <slot :table="table"></slot>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import { mapState } from 'vuex'
export default Vue.extend({
  props: ['tab'],
  computed: {
    ...mapState(['tables', 'tablesInitialLoaded']),
    table() {
      return this.tab.findTable(this.tables)
    },
  }
})
</script>
<style lang="scss" scoped>
  .with-table-wrapper {
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
</style>
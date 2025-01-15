<template>
  <div class="with-table-wrapper">
    <div v-if="!tablesInitialLoaded">
      <x-progressbar />
    </div>
    <div
      class="no-content flex"
      v-else-if="!table"
    >
      <div class="alert alert-danger expand">
        <i class="material-icons">error_outline</i>
        <div class="alert-body expand">
          This table does not exist in the selected database
        </div>
        <a
          @click.prevent="$emit('close', tab)"
          class="btn btn-flat"
        >Close Tab</a>
      </div>
    </div>
    <template v-else>
      <slot :table="table" />
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import rawLog from '@bksLogger'
import { mapState } from 'vuex'
import { findTable } from '@/common/transport/TransportOpenTab'

const log = rawLog.scope('TabWithTable')

export default Vue.extend({
  props: ['tab'],
  computed: {
    ...mapState(['tables', 'tablesInitialLoaded']),
    table() {
      return findTable(this.tab, this.tables)
    },
  },
  watch: {
    table() {
      log.debug("table changed!", this.table)
    }
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

<template>
  <div class="table-list pinned flex-col" ref="pinned">
    <nav class="list-group flex-col">
      <div class="list-heading row">
        <div class="sub row flex-middle expand">
          <div>Pinned <span class="badge">{{pinned.length}}</span></div>
        </div>
      </div>
      <div class="list-body">
        <table-list-item
          v-for="table in pinned"
          v-bind:key="table.name"
          @selected="tableSelected"
          :table="table"
          :connection="connection"
          :selected="table == selectedTable"
          :forceExpand="allExpanded"
          :forceCollapse="allCollapsed"
        ></table-list-item>
      </div>
    </nav>
  </div>
</template>
<script>
import { mapState, mapGetters } from 'vuex'

export default {
  computed: {
    ...mapState(['connection', 'database']),
    ...mapGetters(['pinned'])
  }
}
</script>
<template>
  <div class="sidebar-exports flex-col expand">
    <div class="sidebar-list">
      <nav class="list-group" v-if="exports.length > 0">
        <ExportListItem
          v-for="exporter in exports"
          v-bind:key="exporter.id"
          :exporter="exporter"
        ></ExportListItem>
      </nav>
      <div class="empty" v-if="exports.length === 0">
        <span>No Exports</span>
      </div>
    </div>
  </div>
</template>
<script>
import { mapGetters } from "vuex";
import ExportListItem from "./export_list/ExportListItem";

export default {
  components: { ExportListItem },
  computed: {
    ...mapGetters({ exports: "exports/allExports" }),
  },
};
</script>

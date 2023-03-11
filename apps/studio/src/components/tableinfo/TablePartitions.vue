<template>
  <div class="table-info-table table-schema" v-hotkey="hotkeys">
    <div class="table-info-table-wrap">
      <div class="center-wrap">
        <!-- Errors here -->
        <!-- Notices here -->

        <div class="table-subheader">
          <div class="table-title">
            <h2>Partitions</h2>
          </div>
          <slot />
          <span class="expand"> </span>
          <div class="actions">
            <a class="btn btn-link btn-fab"><i class="material-icons">refresh</i></a>
            <a class="btn btn-primary btn-fab"><i class="material-icons">add</i></a>
          </div>
        </div>
        <div ref="tablePartitions"></div>
      </div>
    </div>

    <div class="expand" />

    <status-bar class="tablulator-footer">
      <div class="flex flex-middle statusbar-actions">
        <slot name="footer" />
      </div>
    </status-bar>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { mapGetters } from 'vuex';
import { TabulatorFull } from 'tabulator-tables'
import { TabulatorStateWatchers } from '@shared/lib/tabulator/helpers'
import StatusBar from '../common/StatusBar.vue'

export default Vue.extend({
	components: {
    StatusBar
  },
  mixins: [],
  props: ['table', 'connection', 'tabID', 'active', 'tabState'],
  data() {
    return {
      tabulator: null,
      forceRedraw: false,
    }
  },
  watch: {
    ...TabulatorStateWatchers
  },
  computed: {
    ...mapGetters([]),
    hotkeys() {
      if (!this.active) return {};
      const result = {};
      // TODO (day): hotkeys here

      return result;
    },
    tableColumns() {
      const result = [
        {
          title: 'Name',
          field: 'name'
        },
        {
          title: 'Partition Expression',
          field: 'expression'
        },
        {
          title: 'Number of Records',
          field: 'num'
        }
      ]

      return result;
    },
    tableData() {
      return this.table.partitions;
    }
  },
  methods: {
    initializeTabulator() {
      if (this.tabulator) this.tabulator.destroy()
      // TODO: a loader would be so cool for tabulator for those gnarly column count tables that people might create...
      // @ts-ignore
      this.tabulator = new TabulatorFull(this.$refs.tablePartitions, {
        columns: this.tableColumns,
        layout: 'fitColumns',
        columnDefaults: {
          title: '',
          tooltip: true,
          resizable: false,
          headerSort: false,
        },
        data: this.tableData,
        placeholder: "No Columns",
      })
    },
  },
  async mounted() {
    if (!this.active) this.forceRedraw = true;
    this.initializeTabulator();
  }
})
</script>
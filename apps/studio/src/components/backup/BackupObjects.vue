<template>
  <div class="backup-wrapper center-wrap">
    <GroupedTables
      @select-rows="selectTables"
      @select-schema="selectSchema"
      :tables="tables"
      :schemas="schemas"
    />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import GroupedTables from '@/components/GroupedTables.vue';
import _ from 'lodash';
import { mapState, mapGetters } from 'vuex';

export default Vue.extend({
  components: {
    GroupedTables
  },
  props: [],
  data() {
    return {
      selectedSchemata: [],
      selectedTables: []
    }
  },
  watch: {
  },
  computed: {
    ...mapState(['tables']),
    ...mapState('backups', {
      'isRestore': 'isRestore'
    }),
    ...mapGetters(['schemas'])
  },
  methods: {
    selectTables(tables: any) {
      this.selectedTables = tables;
    },
    selectSchema(schema: string) {
      this.selectedSchemata.push(schema);
    },
    onNext() {
      this.$store.dispatch('backups/setObjectsIncluded', { tables: this.selectedTables, schemata: this.selectedSchemata });
      this.$store.dispatch('backups/processObjects');
    }
  },
  mounted() {
    this.$store.dispatch('backups/loadTables', this.tables);
    this.$store.dispatch('backups/loadSchemata', this.schemas);
  }
})
</script>

<style>
</style>

<template>
  <div class="import-export center-wrap">
    <grouped-tables
      @select-rows="rowSelectionHandler"
      :schemas="schemas"
      :tables="tables"
    />
  </div>
</template>

<script>
  import _ from 'lodash';
  import { mapGetters, mapState } from 'vuex'
  import GroupedTables from '../GroupedTables.vue'

  export default {
    components: {
      GroupedTables
    },
    props: ['stepperProps'],
    data() {
      return {
        selectedTables: []
      }
    },
    computed: {
      ...mapState('multiTableExports', ['tablesToExport']),
      ...mapState(['tables']),
      schemas() {
        const raw = this.$store.getters.schemas;
        const defaultSchema = this.$store.getters.defaultSchema

        // shortcut if no schemas
        if (!raw?.length || !defaultSchema) return []

        if (raw.includes(defaultSchema)) {
          return _.uniq([defaultSchema, ...raw])
        } else {
          return raw
        }
      }
    },
    watch: {
      selectedTables() {
        this.$emit('change', !!this.selectedTables.length)
      }
    },
    methods: {
      onNext() {
        this.$store.commit('multiTableExports/updateTable', this.selectedTables)
      },
      canContinue() {
        return !!this.selectedTables.length
      },
      rowSelectionHandler(data) {
        this.selectedTables = data
      }
    }
  }
</script>


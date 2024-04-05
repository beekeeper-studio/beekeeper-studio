import { AppEvent } from "@/common/AppEvent";
import { ContextOption } from "@/plugins/BeekeeperPlugin";
import { DialectData } from "@shared/lib/dialects/models";

function disabled(...args: boolean[]) {
  return args.some((v) => v) ? 'disabled' : '';
}

export default {
  data() {
    // HACK (@day): this stuff will be removed once we get write mode working for BQ
    const isBQClass = this.$store.getters.dialect === 'bigquery' ? 'disabled' : '';
    return {
      routineMenuOptions: [
        {
          name: "Copy Name",
          slug: 'copy-name',
          handler: this.routineMenuClick
        },
        {
          name: "Hide",
          slug: 'hide-entity',
          handler: ({ item }) => {
            this.trigger(AppEvent.toggleHideEntity, item, true)
          }
        },
        {
          type: 'divider',
        },
        {
          name: "SQL: Create",
          slug: 'sql-create',
          class: isBQClass,
          handler: this.routineMenuClick
        },


      ] as ContextOption[],

    }
  },
  computed: {
    tableMenuOptions() {
      // HACK (@day): this stuff will be removed once we get write mode working for BQ
      const isBQ = this.$store.getters.dialect === 'bigquery';
      const isBQClass = isBQ ? 'disabled' : '';

      const dialect: DialectData = this.$store.getters.dialectData;

      return [
        {
          name: "View Data",
          slug: 'view-data',
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.loadTable, { table: item })
          }
        },
        {
          name: "View Structure",
          slug: 'view-structure',
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.openTableProperties, { table: item })
          }
        },
        {
          name: "Export To File",
          slug: 'export',
          class: disabled(dialect.disabledFeatures?.exportTable),
          handler: ({ item }) => {
            this.trigger(AppEvent.beginExport, { table: item })
          }
        },
        {
          name: "Import From CSV",
          class: isBQClass,
          slug: 'import',
          ultimate: true,
          handler: ({ item }) => {
            this.trigger(AppEvent.beginImport, { table: item })
          }
        },
        {
          type: 'divider'
        },
        {
          name: "Copy Name",
          slug: 'copy-name',
          handler: ({ item }) => {
            this.$copyText(item.name)
          }
        },
        {
          name: "Hide",
          slug: 'hide-entity',
          handler: ({ item }) => {
            this.trigger(AppEvent.toggleHideEntity, item, true)
          }
        },

        {
          type: 'divider'
        },
        {
          name: "SQL: Create",
          slug: 'sql-create',
          class: isBQClass,
          handler: ({ item }) => {
            this.$root.$emit('loadTableCreate', item)
          }
        },
        {
          name: "Drop",
          slug: 'sql-drop',
          class: isBQClass,
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'drop' })
          }
        },
        {
          name: "Truncate",
          slug: 'sql-truncate',
          class: disabled(dialect.disabledFeatures?.truncateElement, isBQ),
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'truncate' })
          }
        },
        {
          name: "Duplicate",
          slug: 'sql-duplicate',
          class: disabled(dialect.disabledFeatures?.duplicateTable, isBQ),
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.duplicateDatabaseTable, { item, action: 'duplicate' })
          }
        },
      ] as ContextOption[]
    },
    schemaMenuOptions() {
      const dialect: DialectData = this.$store.getters.dialectData;

      return [
        {
          name: "Hide",
          slug: 'hide-schema',
          handler: ({ item }) => {
            this.trigger(AppEvent.toggleHideSchema, item, true)
          },
        },
        {
          name: "Drop",
          slug: 'sql-drop',
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, {item, action: 'drop'})
          }
        },
        {
          name: "Truncate",
          slug: 'sql-truncate',
          class: disabled(dialect.disabledFeatures?.truncateElement),
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, {item, action: 'truncate'})
          }
        },
      ] as ContextOption[]
    }
  },
  methods: {
    routineMenuClick({ item, option }) {
      switch (option.slug) {
        case 'copy-name':
          return this.$copyText(item.name)
        case 'sql-create':
          return this.$root.$emit('loadRoutineCreate', item)
        default:
          break;
      }
    },
  }
}

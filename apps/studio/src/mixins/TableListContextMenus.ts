import { AppEvent } from "@/common/AppEvent";
import { DatabaseElement } from "@/lib/db/types";
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
          label: "Copy Name",
          id: 'copy-name',
          handler: this.routineMenuClick
        },
        {
          label: "Hide",
          id: 'hide-entity',
          handler: (_e, item) => {
            this.trigger(AppEvent.toggleHideEntity, item, true)
          }
        },
        {
          type: 'divider',
        },
        {
          label: "SQL: Create",
          id: 'sql-create',
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
          label: "View Data",
          id: 'view-data',
          handler: (_e, item) => {
            this.$root.$emit(AppEvent.loadTable, { table: item })
          }
        },
        {
          label: "View Structure",
          id: 'view-structure',
          handler: (_e, item) => {
            this.$root.$emit(AppEvent.openTableProperties, { table: item })
          }
        },
        {
          label: "Export To File",
          id: 'export',
          class: disabled(dialect.disabledFeatures?.exportTable),
          handler: (_e, item) => {
            this.trigger(AppEvent.beginExport, { table: item })
          }
        },
        {
          label: {
            html: `Import from File${this.$store.getters.isCommunity ? '<i class="material-icons">stars</i>' : ''}`
          },
          class: isBQClass,
          id: 'import',
          handler: (_e, item) => {
            this.trigger(AppEvent.beginImport, { table: item })
          }
        },
        {
          type: 'divider'
        },
        {
          label: "Copy Name",
          id: 'copy-name',
          handler: (_e, item) => {
            this.$copyText(item.name)
          }
        },
        {
          label: "Hide",
          id: 'hide-entity',
          handler: (_e, item) => {
            this.trigger(AppEvent.toggleHideEntity, item, true)
          }
        },

        {
          type: 'divider'
        },
        {
          label: "SQL: Create",
          id: 'sql-create',
          class: isBQClass,
          handler: (_e, item) => {
            this.$root.$emit('loadTableCreate', item)
          }
        },
        {
          label: "Rename",
          id: 'rename',
          class: ({ item  }) => {
            if (item.entityType === 'table' && dialect.disabledFeatures?.alter?.renameTable) {
              return 'disabled'
            }
            if (item.entityType === 'view' && dialect.disabledFeatures?.alter?.renameView) {
              return 'disabled'
            }
            return ''
          },
          handler: (_e, item) => {
            const type = item.entityType === 'table'
              ? DatabaseElement.TABLE
              : DatabaseElement.VIEW
            this.trigger(AppEvent.setDatabaseElementName, { type, item })
          }
        },
        {
          label: "Drop",
          id: 'sql-drop',
          class: isBQClass,
          handler: (_e, item) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'drop' })
          }
        },
        {
          label: "Truncate",
          id: 'sql-truncate',
          class: disabled(dialect.disabledFeatures?.truncateElement, isBQ),
          handler: (_e, item) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'truncate' })
          }
        },
        {
          label: "Duplicate",
          id: 'sql-duplicate',
          class: disabled(dialect.disabledFeatures?.duplicateTable, isBQ),
          handler: (_e, item) => {
            this.$root.$emit(AppEvent.duplicateDatabaseTable, { item, action: 'duplicate' })
          }
        },
      ] as ContextOption[]
    },
    schemaMenuOptions() {
      const dialect: DialectData = this.$store.getters.dialectData;

      return [
        {
          label: "Hide",
          id: 'hide-schema',
          handler: (_e, item) => {
            this.trigger(AppEvent.toggleHideSchema, item, true)
          },
        },
        { type: 'divider' },
        {
          label: "Rename",
          id: 'rename',
          class: dialect.disabledFeatures?.alter?.renameSchema ? 'disabled' : '',
          handler: (_e, item) => this.trigger(AppEvent.setDatabaseElementName, { type: DatabaseElement.SCHEMA, item })
        },
        {
          label: "Drop",
          id: 'sql-drop',
          handler: (_e, item) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, {item, action: 'drop'})
          }
        },
        {
          label: "Truncate",
          id: 'sql-truncate',
          class: disabled(dialect.disabledFeatures?.truncateElement),
          handler: (_e, item) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, {item, action: 'truncate'})
          }
        },
      ] as ContextOption[]
    }
  },
  methods: {
    routineMenuClick(_event, item, option) {
      switch (option.id) {
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

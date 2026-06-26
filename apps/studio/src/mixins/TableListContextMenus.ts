import { AppEvent } from "@/common/AppEvent";
import { IConnection } from "@/common/interfaces/IConnection";
import { DatabaseElement } from "@/lib/db/types";
import { ContextOption } from "@/plugins/BeekeeperPlugin";
import { DialectData } from "@shared/lib/dialects/models";
import { divider, DividerItem } from "@beekeeperstudio/ui-kit";
import { mapGetters } from "vuex";

function disabled(...args: boolean[]) {
  return args.some((v) => v) ? 'disabled' : '';
}

function disabledTitle(dialectName: string, feature: string, isDisabled: boolean, isReadOnly: boolean): string {
  if (isReadOnly) return 'Read-only mode is enabled';
  if (isDisabled) return `${feature} is not supported for ${dialectName}`;
  return '';
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
        divider,
        {
          name: "SQL: Create",
          slug: 'sql-create',
          class: isBQClass,
          handler: this.routineMenuClick
        },
      ] as (ContextOption | DividerItem)[],

    }
  },
  computed: {
    ...mapGetters(["isCommunity"]),
    tableMenuOptions() {
      const dialect: DialectData = this.$store.getters.dialectData;
      const dialectName: string = this.$store.getters.dialect;
      const usedConfig: IConnection = this.$store.state.usedConfig;
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
          title: disabledTitle(dialectName, 'Export', !!dialect.disabledFeatures?.exportTable, false),
          handler: ({ item }) => {
            this.trigger(AppEvent.beginExport, { table: item })
          }
        },
        {
          name: "Import from File",
          class: disabled(dialect.disabledFeatures?.importFromFile, usedConfig.readOnlyMode),
          title: disabledTitle(dialectName, 'Import', !!dialect.disabledFeatures?.importFromFile, usedConfig.readOnlyMode),
          slug: 'import',
          icon: this.isCommunity ? 'stars' : undefined,
          handler: ({ item }) => {
            this.trigger(AppEvent.beginImport, { table: item })
          }
        },
        divider,
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

        divider,
        {
          name: "SQL: Create",
          slug: 'sql-create',
          class: disabled(dialect.disabledFeatures?.sqlCreate),
          title: disabledTitle(dialectName, 'SQL: Create', !!dialect.disabledFeatures?.sqlCreate, false),
          handler: ({ item }) => {
            this.$root.$emit('loadTableCreate', item)
          }
        },
        {
          name: "Rename",
          slug: 'rename',
          class: ({ item  }) => {
            if (item.entityType === 'table' && dialect.disabledFeatures?.alter?.renameTable) {
              return 'disabled'
            }
            if (item.entityType === 'view' && dialect.disabledFeatures?.alter?.renameView) {
              return 'disabled'
            }
            if (usedConfig.readOnlyMode) {
              return 'disabled'
            }
            return ''
          },
          title: ({ item }) => {
            if (usedConfig.readOnlyMode) return 'Read-only mode is enabled';
            if (item.entityType === 'table' && dialect.disabledFeatures?.alter?.renameTable) {
              return `Rename is not supported for ${dialectName}`;
            }
            if (item.entityType === 'view' && dialect.disabledFeatures?.alter?.renameView) {
              return `Rename is not supported for ${dialectName}`;
            }
            return '';
          },
          handler: ({ item }) => {
            const type = item.entityType === 'table'
              ? DatabaseElement.TABLE
              : DatabaseElement.VIEW
            this.trigger(AppEvent.setDatabaseElementName, { type, item })
          }
        },
        {
          name: "Drop",
          slug: 'sql-drop',
          class: disabled(dialect.disabledFeatures?.dropTable, usedConfig.readOnlyMode),
          title: disabledTitle(dialectName, 'Drop', !!dialect.disabledFeatures?.dropTable, usedConfig.readOnlyMode),
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'drop' })
          }
        },
        {
          name: "Truncate",
          slug: 'sql-truncate',
          class: disabled(dialect.disabledFeatures?.truncateElement, usedConfig.readOnlyMode),
          title: disabledTitle(dialectName, 'Truncate', !!dialect.disabledFeatures?.truncateElement, usedConfig.readOnlyMode),
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'truncate' })
          }
        },
        {
          name: "Duplicate",
          slug: 'sql-duplicate',
          class: disabled(dialect.disabledFeatures?.duplicateTable, usedConfig.readOnlyMode),
          title: disabledTitle(dialectName, 'Duplicate', !!dialect.disabledFeatures?.duplicateTable, usedConfig.readOnlyMode),
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.duplicateDatabaseTable, { item, action: 'duplicate' })
          }
        },
      ] as (ContextOption | DividerItem)[]
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
        divider,
        {
          name: "Rename",
          slug: 'rename',
          class: dialect.disabledFeatures?.alter?.renameSchema ? 'disabled' : '',
          handler: ({ item }) => this.trigger(AppEvent.setDatabaseElementName, { type: DatabaseElement.SCHEMA, item })
        },
        {
          name: "Drop",
          slug: 'sql-drop',
          disabled: disabled(dialect.disabledFeatures?.dropSchema),
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
      ] as (ContextOption | DividerItem)[]
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

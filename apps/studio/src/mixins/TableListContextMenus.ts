import { AppEvent } from "@/common/AppEvent";
import { ContextOption } from "@/plugins/BeekeeperPlugin";

export default {
  data() {
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
            this.$root.$emit(AppEvent.hideEntity, item)
          }
        },
        {
          type: 'divider',
        },
        {
          name: "SQL: Create",
          slug: 'sql-create',
          handler: this.routineMenuClick
        },


      ] as ContextOption[],

    }
  },
  computed: {
    tableMenuOptions() {
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
          handler: ({ item }) => {
            this.trigger(AppEvent.beginExport, { table: item })
          }
        },
        {
          name: "Import From CSV",
          slug: 'import',
          handler: () => {
            this.$root.$emit(AppEvent.upgradeModal)
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
            this.$root.$emit(AppEvent.hideEntity, item)
          }
        },

        {
          type: 'divider'
        },
        {
          name: "SQL: Create",
          slug: 'sql-create',
          handler: ({ item }) => {
            this.$root.$emit('loadTableCreate', item)
          }
        },
        {
          name: "Drop",
          slug: 'sql-drop',
          handler: ({ item }) => {
            console.log("Drop?")
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'drop' })
          }
        },
        {
          name: "Truncate",
          slug: 'sql-truncate',
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.dropDatabaseElement, { item, action: 'truncate' })
          }
        },
        {
          name: "Duplicate",
          slug: 'sql-duplicate',
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.duplicateDatabaseTable, { item, action: 'duplicate' })
          }
        },
      ] as ContextOption[]
    },
    schemaMenuOptions() {
      return [
        {
          name: "Hide",
          slug: 'hide-schema',
          handler: ({ item }) => {
            this.$root.$emit(AppEvent.hideSchema, item.schema)
          },
        },
        {
          name: "Drop",
          slug: 'sql-drop',
          handler: ({ item }) => {
            console.log("Drop?")
            this.$root.$emit(AppEvent.dropDatabaseElement, {item, action: 'drop'})
          }
        },
        {
          name: "Truncate",
          slug: 'sql-truncate',
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

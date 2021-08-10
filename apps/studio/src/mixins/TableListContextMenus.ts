import { AppEvent } from "@/common/AppEvent";

export default {
  data() {
    return {
      tableEvent: null,
      routineEvent: null,
      routineMenuOptions: [
        {
          name: "Copy Name",
          slug: 'copy-name',
        },
        {
          name: "SQL: Create",
          slug: 'sql-create'
        }
      ],
      tableMenuOptions: [
        {
          name: "View Data",
          slug: 'view-data',
        },
        {
          name: "View Structure",
          slug: 'view-structure'
        },
        {
          type: 'divider'
        },
        {
          name: "Copy Name",
          slug: 'copy-name'
        },
        {
          name: "Export",
          slug: 'export'
        },
        {
          type: 'divider'
        },
        {
          name: "SQL: Create",
          slug: 'sql-create'
        },


      ]
    }
  },
  methods: {
    openTableMenu(e, item) {
      console.log("open table menu")
      this.tableEvent = { event: e, item}
    },
    tableMenuClick({ item, option }) {
      switch (option.slug) {
        case 'view-data':
          return this.$root.$emit(AppEvent.loadTable, { table: item })
        case 'view-structure':
          return this.$root.$emit(AppEvent.openTableProperties, { table: item })
        case 'copy-name':
          return this.$copyText(item.name)
        case 'export':
          return this.trigger(AppEvent.beginExport, { table: item })
        case 'sql-create':
          return this.$root.$emit('loadTableCreate', item)
        default:
          break;
      }
    },

    openRoutineMenu(e, item) {
      this.routineEvent = { event: e, item,}
    },
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
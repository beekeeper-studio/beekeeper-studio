<template>
  <div
    class="list-item"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <a
      class="list-item-btn"
      role="button"
      :class="{ 'active': active, 'selected': selected, 'open': showColumns }"
    >
      <span
        @contextmenu.prevent.stop=""
        class="btn-fab open-close"
        @mousedown.prevent="toggleColumns"
      >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span
        class="item-wrapper flex flex-middle expand"
        @dblclick.prevent="openTable"
        @mousedown="selectItem"
      >
        <span
          :title="draggable ? 'drag me!' : ''"
          class="table-item-wrapper"
          :class="{ 'draggable': draggable, 'drag-handle': draggable }"
        >
          <table-icon
            :table="table"
            class="table-icon"
          />
          <i
            class="material-icons item-icon dh"
            v-if="draggable"
          >menu</i>
        </span>
        <span
          class="table-name truncate"
          :title="table.name"
        >{{ table.name }}</span>
      </span>
      <span
        class="actions"
        :class="{ 'pinned': pinned }"
      >
        <span
          v-if="!pinned"
          @mousedown.prevent.stop="pin"
          class="btn-fab pin"
          :title="'Pin'"
        ><i class="bk-pin" /></span>
        <span
          v-if="pinned"
          @mousedown.prevent.stop="unpin"
          class="btn-fab unpin"
          :title="'Unpin'"
        ><i
          class="material-icons"
        >clear</i></span>
        <span
          v-if="pinned"
          @mousedown.prevent.stop="unpin"
          class="btn-fab pinned"
        >
          <i
            class="bk-pin"
            :title="'Unpin'"
          />
          <i class="material-icons">clear</i>
        </span>
      </span>
    </a>
    <div
      v-if="showColumns"
      class="sub-items"
    >
      <span
        class="sub-item"
        v-if="!columnsLoading && table.columns.length === 0"
      >
        No Columns
      </span>
      <template v-else-if="table.columns.length > 0">
        <span
          :key="c.columnName"
          v-for="(c, i) in table.columns"
          class="sub-item"
        >
          <span
            class="title truncate"
            ref="title"
            @click="selectColumn(i)"
          >{{ c.columnName }}</span>
          <span
            class="badge"
            :class="c.dataType"
          ><span>{{ c.dataType }}</span></span>
        </span>
      </template>
      <span
        class="sub-item"
        v-else
      >
        {{ columnsLoading }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped="true">
.sub-item {
  .title {
    user-select: text;
    cursor: pointer;
  }
}

.drag-handle.draggable {
  .dh {
    display: none;
  }

  &:hover {
    .dh {
      display: inline-block;
    }

    .table-icon {
      display: none;
    }
  }
}
</style>

<script type="text/javascript">

// import { mapGetters, mapState } from 'vuex'
import _ from 'lodash'
// import { AppEvent } from '../../../../common/AppEvent'
import { uuidv4 } from '../../utils/uuid'
import TableIcon from './TableIcon.vue'
export default {
  props: ["table", "noSelect", "forceExpand", "forceCollapse", "container", "pinned", "draggable"],
  components: { TableIcon },
  mounted() {
    this.showColumns = !!this.table.showColumns
  },
  data() {
    return {
      showColumns: false,
      id: uuidv4(),
      clickState: {
        timer: null,
        openClicks: 0,
        delay: 500
      },
    }
  },
  watch: {
    forceExpand() {
      if (this.forceExpand) {
        this.showColumns = true
      }
    },
    forceCollapse() {
      if (this.forceCollapse) {
        this.showColumns = false
      }
    },
    showColumns() {
      this.table.showColumns = this.showColumns
    },
    active() {
      if (this.selected && !this.noSelect) {
        let shouldScroll = true
        if (this.container) {
          const box = this.$el.getBoundingClientRect()
          const parentBox = this.container.getBoundingClientRect()
          shouldScroll = !(box.top > parentBox.top && box.bottom <= parentBox.bottom)
        }
        if (shouldScroll) {
          this.$el.scrollIntoView()
        }
      }
    }
  },
  computed: {
    supportsDDL() {
      return ['table', 'view'].includes(this.table.entityType)
    },
    iconClass() {
      const result = {}
      result[`${this.table.entityType}-icon`] = true
      return result
    },
    title() {
      return _.startCase(this.table.entityType)
    },
    selected() {
      return this.selectedSidebarItem === this.id
    },
    active() {
      const tableSelected = this.activeTab && this.activeTab.table &&
        this.activeTab.table.name === this.table.name &&
        this.activeTab.table.schema === this.table.schema

      return tableSelected
    },
    // ...mapGetters(['selectedSidebarItem']),
    // ...mapState(['activeTab', 'database', 'config', 'columnsLoading'])
  },
  methods: {
    doNothing() {
      // do nothing
    },
    selectItem() {
      this.$store.commit('selectSidebarItem', this.id)
    },
    createTable() {
      this.$root.$emit('loadTableCreate', this.table)
    },
    exportTable() {
      console.warn('appevent triggered!!!!')//this.trigger(AppEvent.beginExport, { table: this.table })
    },
    copyTable() {
      this.$copyText(this.table.name)
    },
    selectColumn(i) {
      this.selectChildren(this.$refs.title[i])
    },
    async toggleColumns() {
      this.showColumns = !this.showColumns
      // FIXME: Make this event more consistent with what is happening
      //        We don't handle 'selection' in TableList anymore
      if (this.showColumns) {
        this.$emit('selected', this.table)
      } else {
        this.$emit('unselected', this.table)
      }
    },
    openTable() {
      if (this.clickState.openClicks > 0) {
        return
      }
      this.$root.$emit("loadTable", { table: this.table });
      this.clickState.openClicks++;
      this.clickState.timer = setTimeout(() => {
        this.clickState.openClicks = 0
      }, this.clickState.delay);
    },
    openTableStructure() {
      console.warn('appevent triggered!!!!')//this.$root.$emit(AppEvent.openTableProperties, { table: this.table })
    },
    pin() {
      console.warn('appevent triggered!!!!')//this.trigger(AppEvent.togglePinTableList, this.table, true);
    },
    unpin() {
      console.warn('appevent triggered!!!!')//this.trigger(AppEvent.togglePinTableList, this.table, false);
    }
  }
}
</script>

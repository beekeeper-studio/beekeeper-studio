<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" v-bind:class="{'active': active, 'selected': selected,'open': showColumns }">
      <span class="btn-fab open-close" @mousedown.prevent="toggleColumns" >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span class="item-wrapper flex flex-middle expand" @dblclick.prevent="openTable" @mousedown.prevent="selectItem">
        <i :title="title" :class="iconClass" class="item-icon material-icons">grid_on</i>
        <span class="table-name truncate" :title="table.name">{{table.name}}</span>
      </span>
      <span class="actions" v-bind:class="{'pinned': pinned.includes(table)}">
        <span v-if="!pinned.includes(table)" @mousedown.prevent.stop="pin" class="btn-fab pin" :title="'Pin'"><i class="bk-pin"></i></span>
        <span v-if="pinned.includes(table)" @mousedown.prevent.stop="unpin" class="btn-fab unpin" :title="'Unpin'"><i class="material-icons">clear</i></span>
        <span v-if="pinned.includes(table)" class="btn-fab pinned"><i class="bk-pin" :title="'Unpin'"></i></span>
      </span>
      <x-contextmenu>
        <x-menu>

          <x-menuitem @click.prevent="openTable">
            <x-label>Open</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="copyTable">
            <x-label>Copy Name</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="toggleColumns">
            <x-label>Toggle Columns</x-label>
          </x-menuitem>
          <hr>
          <x-menuitem @click.prevent="createTable" v-if="supportsDDL">
            <x-label>SQL: Create {{table.entityType}}</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="exportTable">
            <x-label>Export</x-label>
          </x-menuitem>
          <hr>
          <x-menuitem @click.prevent="openTableStructure">
            <x-label>Properties</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>
    <div v-if="showColumns" class="sub-items">
      <span v-bind:key="c.columnName" v-for="(c, i) in table.columns" class="sub-item">
        <span class="title truncate" ref="title" @click="selectColumn(i)">{{c.columnName}}</span>
        <span class="badge" v-bind:class="c.dataType"><span>{{c.dataType}}</span></span>
      </span>
    </div>

  </div>
</template>

<style lang="scss">
  .sub-item {
    .title {
      user-select: text;
      cursor: pointer;
    }
  }
</style>

<script type="text/javascript">

import { mapGetters, mapState } from 'vuex'
import _ from 'lodash'
import { AppEvent } from '../../../../common/AppEvent'
import { uuidv4 } from '../../../../lib/uuid'
	export default {
		props: ["connection", "table", "noSelect", "forceExpand", "forceCollapse", "container"],
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
      ...mapGetters(['pinned', 'selectedSidebarItem']),
      ...mapState(['activeTab'])
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
        this.trigger(AppEvent.beginExport, {table: this.table})
      },
      copyTable() {
        this.$copyText(this.table.name)
      },
      selectTable() {
        this.$emit('selected', this.table)
      },
      selectColumn(i) {
        this.selectChildren(this.$refs.title[i])
      },
      async toggleColumns() {
        this.$emit('selected', this.table)
        this.showColumns = !this.showColumns
      },
      openTable() {
        if (this.clickState.openClicks > 0) {
          return
        }
        this.$root.$emit("loadTable", {table: this.table});
        this.clickState.openClicks ++;
        this.clickState.timer = setTimeout(() => {
          this.clickState.openClicks = 0
        }, this.clickState.delay);
      },
      openTableStructure(){
        this.$root.$emit('loadTableProperties', {table: this.table})
      },
      pin() {
        this.$store.dispatch('pinTable', this.table)
      },
      unpin() {
        this.$store.dispatch('unpinTable', this.table)
      }
    }
	}
</script>

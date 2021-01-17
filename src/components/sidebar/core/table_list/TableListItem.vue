<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" v-bind:class="{'active': selected,'open': showColumns }">
      <span class="btn-fab open-close" @mousedown.prevent="toggleColumns" >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span class="item-wrapper flex flex-middle expand" @click.prevent="openTable" @dblclick.prevent="openTable">
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
          <x-menuitem @click.prevent="copyTable">
            <x-label>Copy table name</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="openTable">
            <x-label>Open table</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="toggleColumns">
            <x-label>Toggle columns</x-label>
          </x-menuitem>
          <hr>
          <x-menuitem @click.prevent="createTable" v-if="supportsDDL">
            <x-label>SQL: Create {{table.entityType}}</x-label>
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
	export default {
		props: ["connection", "table", "noSelect", "forceExpand", "forceCollapse"],
    mounted() {
      this.showColumns = !!this.table.showColumns
    },
    data() {
      return {
        showColumns: false,
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
      selected() {
        if (this.selected && !this.noSelect) {
          this.$el.scrollIntoView()
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
        return this.activeTab && this.activeTab.table &&
          this.activeTab.table.name === this.table.name &&
          this.activeTab.table.schema === this.table.schema
      },
      ...mapGetters(['pinned']),
      ...mapState(['activeTab'])
    },
    methods: {
      createTable() {
        this.$root.$emit('loadTableCreate', this.table)
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
        this.$root.$emit("loadTable", {table: this.table});
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

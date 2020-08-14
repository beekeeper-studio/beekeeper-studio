<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" v-bind:class="{'active': selected,'open': showColumns }" @mousedown.prevent="toggleColumns">
      <span class="btn-fab open-close" >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <i :title="title" :class="iconClass" class="item-icon material-icons">grid_on</i>
      <span class="table-name truncate expand">{{table.name}}</span>
      <span class="actions" v-bind:class="{'pinned': pinned.includes(table)}">
        <span class="btn-fab launch" title="Open in a new tab" @mousedown.prevent.stop="openTable"><i class="material-icons">launch</i></span>
        <span v-if="!pinned.includes(table)" @mousedown.prevent.stop="pin" class="btn-fab pin" :title="'Pin'"><i class="bk-pin"></i></span>
        <span v-if="pinned.includes(table)" @mousedown.prevent.stop="unpin" class="btn-fab unpin" :title="'Unpin'"><i class="material-icons">clear</i></span>
        <span v-if="pinned.includes(table)" class="btn-fab pinned"><i class="bk-pin" :title="'Unpin'"></i></span>
      </span>
    </a>
    <div v-show="showColumns" class="sub-items">
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

  import { mapGetters } from 'vuex'
  import _ from 'lodash'
	export default {
		props: ["connection", "table", "selected", "forceExpand", "forceCollapse"],
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
      }
    },
    computed: {
      iconClass() {
        const result = {}
        result[`${this.table.entityType}-icon`] = true
        return result
      },
      title() {
        return _.startCase(this.table.entityType)
      },
      ...mapGetters(['pinned'])
    },
    methods: {
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

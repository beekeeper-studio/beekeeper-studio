<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" v-bind:class="{'active': selected,'open': showColumns }" @click="toggleColumns" @dblclick.prevent="doubleClick" @click.prevent="$emit('selected', table)">
      <span class="btn-fab open-close" >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <i class="item-icon material-icons">grid_on</i>
      <span class="table-name truncate expand">{{table.name}}</span>
      <span class="actions">
        <!-- <span class="btn-fab new-tab"><i class="material-icons">open_in_new</i></span> -->
        <span class="btn-fab dropdown"><i class="material-icons">arrow_drop_down</i></span>
      </span>
    </a>
    <div v-show="showColumns" class="sub-items">
      <span v-bind:key="c.columnName" v-for="c in table.columns" class="sub-item">
        <span class="title">{{c.columnName}}</span>
        <span class="badge" v-bind:class="c.dataType">{{c.dataType}}</span>
      </span>
    </div>
  </div>
</template>

<script type="text/javascript">
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
    methods: {
      async toggleColumns() {
        this.showColumns = !this.showColumns
      },
      doubleClick() {
        // TODO (matthew): Load table tab when double clicking
      }
    }
	}
</script>

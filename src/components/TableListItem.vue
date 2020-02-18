<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" v-bind:class="{'active': selected}" @dblclick.prevent="doubleClick" @click.prevent="$emit('selected', table)">
      <span class="btn-fab" @click="toggleColumns" v-bind:class="{ 'open': showColumns }">
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <!-- <i class="item-icon material-icons">grid_on</i> -->
      <span class="table-name truncate expand">{{table.name}}</span>
    </a>
    <div v-show="showColumns" class="sub-items">
      <span v-bind:key="c.columnName" v-for="c in table.columns" class="sub-item">
        <span class="title">{{c.columnName}}</span>
        <span class="badge">{{c.dataType}}</span>
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
<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" @click.prevent="manuallyExpanded = !manuallyExpanded">
      <span class="btn-fab open-close" >
        <i v-if="expanded" class="dropdown-icon material-icons">keyboard_arrow_down</i>
        <i v-else class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <i title="Schema" class="table-icon item-icon material-icons">dynamic_feed</i>
      <span class="table-name truncate expand">{{title}}</span>
    </a>
    <div v-show="expanded" class="sub-items contents">
      <slot></slot>
    </div>
  </div>
</template>

<script type="text/javascript">

	export default {
    props: ["title", "forceExpand", "forceCollapse"],
    data() {
      return {
        manuallyExpanded: false,
      }
    },
    computed: {
      expanded() {
        return (this.manuallyExpanded || !!this.forceExpand) && !this.forceCollapse
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
      tableSelected(table) {
        this.$emit("tableSelected", table)
      }
    }
	}
</script>

<style scoped>
.sub-items.contents {
  padding-left: 20px !important;
}
</style>
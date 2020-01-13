<template>
  <div>
    <a @click="toggleColumns" role="button">
      <i class="item-icon material-icons">grid_on</i>
      <span>{{table.name}}</span>
    </a>
    <div v-show="showColumns" v-if="columns" class="sub-items">
      <span v-bind:key="c.columnName" v-for="c in columns" class="sub-item">
        <span class="title">{{c.columnName}}</span>
        <span class="badge">{{c.dataType}}</span>
      </span>
    </div>    
  </div>
</template>

<script type="text/javascript">
	export default {
		props: ["connection", "table"],
    data() {
      return {
        columns: null,
        showColumns: false
      }
    },
    methods: {
      async toggleColumns() {
        // TODO (matthew): move to the store later on when we need this info
        if(this.showColumns) {
          this.showColumns = false
          return
        }

        if (!this.columns) {
          this.columns = await this.connection.listTableColumns(this.table.name)
        }
        this.showColumns = true
        console.log("columns")
        console.log(this.columns)
      }
    }
	}
</script>
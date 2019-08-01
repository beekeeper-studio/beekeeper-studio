<template>
  <div class="core-tabs">
    <ul class="nav-tabs nav">
      <li v-for="(tab, idx) in tabItems" class="nav-item">
        <a
          :href="'#tab-'+idx"
          class="nav-link"
          v-on:click="click(idx)"
          :class="{ active: activeItem === idx }"
        >{{tab.title}}</a>
      </li>
      <li class="nav-item">
        <a v-on:click="createQuery" class="nav-link"><i class="fa fa-plus"></i></a>
      </li>
    </ul>
    <div class="tab-content">
      <div
        v-for="(tab, idx) in tabItems"
        class="tab-pane"
        :id="'tab-' + idx"
        :class="{show: (activeItem === idx), active: (activeItem === idx)}"
      >
        <QueryEditor v-if="tab.type === 'query'" :query="tab"></QueryEditor>
        <div v-if="tab.type === 'table'">TABLE</div>
      </div>
    </div>
  </div>
</template>

<script>

  import QueryEditor from './QueryEditor'

  export default {
    props: [ 'connection' ],
    components: { QueryEditor },
    data() {
      return {
        tabItems: [],
        activeItem: 0
      }
    },

    methods: {
      createQuery() {
        const result = {
          queryText: "",
          connection: this.connection,
          type: "query",
          title: "Query #" + this.tabItems.length,
        }
        this.tabItems.push(result)
        this.activeItem = this.tabItems.length - 1
      },
      openTable(table) {
        const t = {
          title: table.name,
          table: table,
          type: "table",
          connection: this.connection
        }
        this.tabItems.push(t)
      },
      click(clickedIdx) {
        this.activeItem = clickedIdx
      }

    }
  }
</script>

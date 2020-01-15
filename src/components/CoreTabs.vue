<template>
  <div class="core-tabs">
    <ul class="nav-tabs nav">
      <li v-for="(tab, idx) in tabItems" class="nav-item" :key="idx">
        <a
          :href="'#tab-'+idx"
          class="nav-link"
          @click.prevent="click(idx)"
          :class="{ active: activeItem === idx }"
        >
          <span class="truncate">{{tab.title}}</span>
          <span class="tab-close" @click.prevent.stop="close(tab, idx)"><i class="material-icons">close</i></span>
        </a>
      </li>
      <li class="nav-item">
        <a v-on:click="createQuery" class="nav-link add-query"><i class=" material-icons">add</i></a>
      </li>
    </ul>
    <div class="tab-content">
      <div
        v-for="(tab, idx) in tabItems"
        class="tab-pane"
        :id="'tab-' + idx"
        :key="idx"
        :class="{show: (activeItem === idx), active: (activeItem === idx)}"
      >
        <QueryEditor v-if="tab.type === 'query'" :query="tab" :connection="connection"></QueryEditor>
        <div v-if="tab.type === 'table'">TABLE</div>
      </div>
    </div>
  </div>
</template>

<script>

  import _ from 'lodash'
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
        this.click()
      },
      openTable(table) {
        // todo (matthew): trigger this from a vuex event
        const t = {
          title: _.capitalize(table.name),
          table: table,
          type: "table",
          connection: this.connection
        }
        this.tabItems.push(t)
      },
      click(clickedIdx) {
        if(clickedIdx) {
          this.activeItem = clickedIdx
        } else{
          this.activeItem = this.tabItems.length - 1
        }
      },
      close(tab) {
        this.tabItems = _.without(this.tabItems, tab)
        console.log("length ", this.tabItems.length)
        if (this.activeItem >= this.tabItems.length) {
          this.click()
        }
      },

    }
  }
</script>

<template>
  <div class="core-tabs" v-hotkey="keymap">
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
        <QueryEditor v-if="tab.type === 'query'" :active="activeItem == idx" :query="tab" :connection="connection"></QueryEditor>
        <div v-if="tab.type === 'table'">TABLE</div>
      </div>
    </div>
  </div>
</template>

<script>

  import _ from 'lodash'
  import QueryEditor from './TabQueryEditor'
  import config from '../config'


  export default {
    props: [ 'connection' ],
    components: { QueryEditor },
    data() {
      return {
        tabItems: [],
        activeItem: 0
      }
    },
    computed: {
      lastItem() {
        return this.tabItems.length - 1
      },
      activeTab() {
        return this.tabItems[this.activeItem]
      },
      keymap() {

        let cmdOrCtrl = 'ctrl'

        if(config.isMac) {
          cmdOrCtrl = 'cmd'
        }

        const newTab = cmdOrCtrl + '+t'
        const result = {
          'ctrl+tab': this.nextTab,
          'ctrl+shift+tab': this.previousTab,
          'ctrl+w': this.closeTab
        }
        result[newTab] = this.createQuery
        return result
      }
    },
    methods: {
      nextTab() {
        if(this.activeItem == this.lastItem) {
          this.activeItem = 0
        } else {
          this.activeItem = this.activeItem + 1
        }
      },

      previousTab() {
        if(this.activeItem == 0) {
          this.activeItem = this.lastItem
        } else {
          this.activeItem = this.activeItem - 1
        }
      },
      closeTab() {
        this.close(this.activeTab)
      },
      createQuery() {
        const result = {
          queryText: "",
          connection: this.connection,
          type: "query",
          title: "Query #" + this.tabItems.length,
        }
        this.tabItems.push(result)
        this.click(this.lastItem)
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
        this.activeItem = clickedIdx
      },
      close(tab) {
        this.tabItems = _.without(this.tabItems, tab)
        if (this.activeItem >= this.tabItems.length) {
          this.click(this.lastItem)
        }
      },

    },
    mounted() {
      this.createQuery()
    }
  }
</script>

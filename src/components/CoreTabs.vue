<template>
  <div class="core-tabs" v-hotkey="keymap">
    <ul class="nav-tabs nav">
      <core-tab-header
        v-for="(tab, idx) in tabItems"
        :key="idx"
        :tab="tab"
        :selected="activeTab === tab"
        @click="click"
        @close="close"
        ></core-tab-header>
      <li class="nav-item">
        <a @click.prevent="createQuery(null)" class="nav-link add-query"><i class=" material-icons">add</i></a>
      </li>
    </ul>
    <div class="tab-content">
      <div
        v-for="(tab, idx) in tabItems"
        class="tab-pane"
        :id="'tab-' + idx"
        :key="idx"
        :class="{show: (activeTab === tab), active: (activeTab === tab)}"
      >
        <QueryEditor v-if="tab.type === 'query'" :active="activeTab == tab" :query="tab" :connection="connection"></QueryEditor>
        <div v-if="tab.type === 'table'">TABLE</div>
      </div>
    </div>
  </div>
</template>

<script>

  import _ from 'lodash'
  import QueryEditor from './TabQueryEditor'
  import config from '../config'
  import CoreTabHeader from './CoreTabHeader'


  export default {
    props: [ 'connection' ],
    components: { QueryEditor, CoreTabHeader },
    data() {
      return {
        tabItems: [],
        activeTab: null,
        activeItem: 0,
        newTabId: 1
      }
    },
    computed: {
      lastTab() {
        return this.tabItems[this.tabItems.length - 1];
      },
      firstTab() {
        return this.tabItems[0]
      },
      activeIdx() {
        return _.indexOf(this.tabItems, this.activeTab)
      },
      keymap() {

        let cmdOrCtrl = 'ctrl'

        if(config.isMac) {
          cmdOrCtrl = 'meta'
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
        if(this.activeTab == this.lastTab) {
          this.activeTab = this.firstTab
        } else {
          this.activeTab = this.tabItems[this.activeIdx + 1]
        }
      },

      previousTab() {
        if(this.activeTab == this.firstTab) {
          this.activeTab = this.lastTab
        } else {
          this.activeTab = this.tabItems[this.activeIdx - 1]
        }
      },
      closeTab() {
        this.close(this.activeTab)
      },
      createQuery(optionalText) {
        // const text = optionalText ? optionalText : ""
        const result = {
          text: optionalText,
          connection: this.connection,
          type: "query",
          title: "Query #" + this.newTabId,
        }
        this.tabItems.push(result)
        this.newTabId += 1
        this.$nextTick(() => {
          this.click(result)
        })

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
      click(tab) {
        this.activeTab = tab
      },
      close(tab) {

        if (this.activeTab === tab) {
          if(tab === this.lastTab) {
            this.previousTab()
          } else {
            this.nextTab()
          }
        }
        this.tabItems = _.without(this.tabItems, tab)
      },

    },
    mounted() {
      this.createQuery()
      this.$root.$on('historyClick', (item) => {
        this.createQuery(item.text)
      })
    }
  }
</script>

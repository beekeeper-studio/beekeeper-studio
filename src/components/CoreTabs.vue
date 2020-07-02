<template>
  <div class="core-tabs" v-hotkey="keymap">
    <div class="tabs-header">
      <ul class="nav-tabs nav">
        <core-tab-header
          v-for="tab in tabItems"
          :key="tab.id"
          :tab="tab"
          :selected="activeTab === tab"
          @click="click"
          @close="close"
          ></core-tab-header>
      </ul>
      <span class="actions">
        <a @click.prevent="createQuery(null)" class="btn-fab add-query"><i class=" material-icons">add_circle</i></a>
      </span>
    </div>
    <div class="tab-content">
      <div
        v-for="(tab, idx) in tabItems"
        class="tab-pane"
        :id="'tab-' + idx"
        :key="tab.id"
        :class="{show: (activeTab === tab), active: (activeTab === tab)}"
      >
        <QueryEditor v-if="tab.type === 'query'" :active="activeTab == tab" :tab="tab" :connection="connection"></QueryEditor>
        <TableTable v-if="tab.type === 'table'" :connection="tab.connection" :table="tab.table"></TableTable>
      </div>
    </div>
  </div>
</template>

<script>

  import _ from 'lodash'
  import {FavoriteQuery} from '../entity/favorite_query'
  import QueryEditor from './TabQueryEditor'
  import CoreTabHeader from './CoreTabHeader'
  import { uuidv4 } from '@/lib/crypto'
  import TableTable from './tableview/TableTable'

  export default {
    props: [ 'connection' ],
    components: { QueryEditor, CoreTabHeader, TableTable },
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

        const newTab = this.ctrlOrCmd('t')
        const closeTab = this.ctrlOrCmd('w')
        const result = {
          'ctrl+tab': this.nextTab,
          'ctrl+shift+tab': this.previousTab
        }
        result[newTab] = this.handleCreateTab
        result[closeTab] = this.closeTab
        return result
      }
    },
    methods: {
      addTab(item) {
        this.tabItems.push(item)
        this.newTabId += 1
        this.$nextTick(() => {
          this.click(item)
        })
      },
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
      handleCreateTab() {
        this.createQuery()
      },
      createQuery(optionalText) {
        // const text = optionalText ? optionalText : ""
        const query = new FavoriteQuery()
        query.text = optionalText

        const result = {
          id: uuidv4(),
          type: "query",
          title: "Query #" + this.newTabId,
          connection: this.connection,
          query: query,
          unsavedChanges: true
        }

        this.addTab(result)

      },
      openTable(table) {
        // todo (matthew): trigger this from a vuex event
        const t = {
          id: uuidv4(),
          type: 'table',
          table: table,
          connection: this.connection
        }
        this.addTab(t)
      },
      openSettings(settings) {
        const t = {
          title: "Settings",
          settings,
          type: 'settings'
        }
        this.addTab(t)
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
        if (tab.query && tab.query.id) {
          tab.query.reload()
        }
      },

    },
    mounted() {
      this.createQuery()
      this.$root.$on('historyClick', (item) => {
        this.createQuery(item.text)
      })

      this.$root.$on('loadTable', this.openTable)
      this.$root.$on('loadSettings', this.openSettings)
      this.$root.$on('favoriteClick', (item) => {

        const queriesOnly = this.tabItems.map((item) => {
          return item.query
        })

        if (queriesOnly.includes(item)) {
          this.click(this.tabItems[queriesOnly.indexOf(item)])
        } else {
          const result = {
            id: uuidv4(),
            type: 'query',
            title: item.title,
            connection: this.connection,
            query: item,
            unsavedChanges: false
          }
          this.addTab(result)
        }


      })

    }
  }
</script>

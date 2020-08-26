<template>
  <div  class="core-tabs" v-hotkey="keymap">
    <div class="tabs-header">
      <ul class="nav-tabs nav">
        <core-tab-header
          v-for="tab in tabItems"
          :key="tab.id"
          :tab="tab"
          :tabsCount="tabItems.length"
          :selected="activeTab === tab"
          @click="click"
          @close="close"
          @closeAll="closeAll"
          @closeOther="closeOther"
          @duplicate="duplicate"
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
        <QueryEditor v-if="tab.type === 'query'" :active="activeTab === tab" :tab="tab" :tabId="tab.id" :connection="connection"></QueryEditor>
        <TableTable @setTabTitleScope="setTabTitleScope" v-if="tab.type === 'table'" :active="activeTab === tab" :tabId="tab.id" :connection="tab.connection" :initialFilter="tab.initialFilter" :table="tab.table"></TableTable>
      </div>
    </div>
  </div>
</template>

<script>

  import _ from 'lodash'
  import {FavoriteQuery} from '../common/appdb/models/favorite_query'
  import QueryEditor from './TabQueryEditor'
  import CoreTabHeader from './CoreTabHeader'
  import { uuidv4 } from '@/lib/crypto'
  import TableTable from './tableview/TableTable'
  import AppEvent from '../common/AppEvent'
  import platformInfo from '../common/platform_info'
  import { mapGetters } from 'vuex'

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
    watch: {

    },
    computed: {
      ...mapGetters({ 'menuStyle': 'settings/menuStyle' }),
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
        const meta = platformInfo.isMac ? 'meta' : 'ctrl'
        const closeTab = `${meta}+w`
        const result = {
          'ctrl+tab': this.nextTab,
          'ctrl+shift+tab': this.previousTab,
        }

        // This is a hack because codemirror steals the shortcut
        // when the shortcut is captured on the electron side
        // but not on mac, on mac we don't wanna capture it. Because reasons.
        // 'registerAccelerator' doesn't disable shortcuts on mac.
        if (!platformInfo.isMac) {
          result[closeTab] = this.closeTab
        }
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
      setTabTitleScope(id, value) {
        this.tabItems.filter(t => t.id === id).forEach(t => t.titleScope = value)
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
      openTable({ table, filter, tableName }) {

        let resolvedTable = null

        if (!table && tableName) {
          resolvedTable = this.$store.state.tables.find(t => t.name === tableName)
        }
        const t = {
          id: uuidv4(),
          type: 'table',
          table: resolvedTable || table,
          connection: this.connection,
          initialFilter: filter,
          titleScope: "all"
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
      closeAll() {
        this.tabItems = []
      },
      closeOther(tab) {
        this.tabItems = [tab]
        this.activeTab = tab;
        if (tab.query && tab.query.id) {
          tab.query.reload()
        }
      },
      duplicate(tab) {
        const duplicatedTab = {
            id: uuidv4(),
            type: tab.type,
            connection: tab.connection,
        }

        if(tab.type === 'query') {
          const query = new FavoriteQuery()
          query.text = tab.query.text

          duplicatedTab['title'] = "Query #" + this.newTabId
          duplicatedTab['unsavedChanges'] = true
          duplicatedTab['query'] = query
        } else if(tab.type === 'table') {
          duplicatedTab['table'] = tab.table
        }
        this.addTab(duplicatedTab)
      }
    },
    mounted() {
      this.createQuery()
      this.$root.$on(AppEvent.closeTab, () => { this.closeTab() })
      this.$root.$on(AppEvent.newTab, () => { this.createQuery() })
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

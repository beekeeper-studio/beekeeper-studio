<template>
  <div class="sidebar-history flex-col expand">
    <div class="fixed">
      <div class="filter" :class="{ 'history-cloud-filter': isCloud }">
        <div class="filter-wrap">
          <input
            v-if="!isCloud"
            class="filter-input"
            type="text"
            placeholder="Filter"
            aria-label="Search query history"
            v-model="filterQuery"
          >
          <x-buttons class="filter-actions">
            <x-button v-if="filterQuery" @click="clearFilter" title="Clear search">
              <i class="clear material-icons">cancel</i>
            </x-button>
            <x-button
              class="history-filter btn btn-fab btn-link action-item"
              :class="{ active: originsFiltered }"
              :title="originsFiltered ? 'Filter active' : 'Filter history'"
              aria-label="Filter history"
              menu
            >
              <i class="material-icons-outlined">filter_alt</i>
              <x-menu class="history-filter-menu" style="--target-align: right;">
                <label>
                  <input type="checkbox" v-model="showAllHistory">
                  <span>All connections</span>
                </label>
                <!-- Cloud history does not include query origin metadata. -->
                <template v-if="!isCloud">
                  <hr>
                  <label v-for="origin in originOptions" :key="origin.value">
                    <input
                      type="checkbox"
                      :value="origin.value"
                      v-model="selectedOrigins"
                    >
                    <span>{{ origin.label }}</span>
                  </label>
                </template>
                <x-menuitem />
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </div>
    <div class="sidebar-list">
      <nav
        class="list-group"
        ref="wrapper"
      >
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div
              class="expand"
              title="Query execution history for this workspace"
            >
              History
            </div>
            <div class="actions">
              <a @click.prevent="refresh">
                <i
                  title="Refresh Query History"
                  class="material-icons"
                >refresh</i>
              </a>
            </div>
          </div>
        </div>
        <error-alert
          v-if="searchError || error"
          :error="searchError || error"
          title="Problem loading history"
        />
        <sidebar-loading v-else-if="loading || searchLoading" />
        <div
          v-else-if="!currentHistory.length"
          class="empty"
        >
          {{ searchActive ? 'No matching queries' : 'No recent queries' }}
        </div>
        <div
          v-else
          class="list-body"
        >
          <div
            class="list-item"
            @contextmenu.prevent.stop="openContextMenu($event, item)"
            v-for="item in currentHistory"
            :key="item.id"
          >
            <a
              class="list-item-btn"
              @click.prevent="select(item)"
              @dblclick.prevent="click(item)"
              :title="item.excerpt"
              :class="{selected: item === selected}"
            >
              <i
                class="item-icon query material-icons"
                :title="`${originInfo(item).label} query`"
              >{{ originInfo(item).icon }}</i>
              <!-- <input @click.stop="" type="checkbox" :value="item" class="form-control delete-checkbox" v-model="checkedHistoryQueries" v-bind:class="{ shown: checkedHistoryQueries.length > 0 }"> -->
              <div class="list-title flex-col">
                <span class="item-text expand truncate">{{ nicelySized(item.excerpt) }}</span>
                <span class="subtitle"><span>{{ item.numberOfRecords || 0 }} Results</span>, {{ formatTimeAgo(item) }}</span>
              </div>
            </a>
          </div>
        </div>
      </nav>
    </div>
    <!-- <div class="toolbar btn-group row flex-right" v-show="checkedHistoryQueries.length > 0">
      <a class="btn btn-link" @click="discardCheckedHistoryQueries">Cancel</a>
      <a class="btn btn-primary" :title="removeTitle" @click="removeCheckedHistoryQueries">Remove</a>
    </div> -->
  </div>
</template>

<script>
import _ from 'lodash'
import TimeAgo from 'javascript-time-ago';
import { mapGetters, mapState } from 'vuex'
import ErrorAlert from '@/components/common/ErrorAlert.vue';
import SidebarLoading from '@/components/common/SidebarLoading.vue'
import { QUERY_ORIGIN_OPTIONS } from '@/common/interfaces/QueryOrigin'

  export default {
  components: { ErrorAlert, SidebarLoading },
    data: function () {
      return {
        filterQuery: '',
        searchResults: [],
        searchLoading: false,
        searchError: null,
        searchRequestId: 0,
        checkedHistoryQueries: [],
        timeAgo: new TimeAgo('en-US'),
        selected: null,
        showAllHistory: false,
        selectedOrigins: QUERY_ORIGIN_OPTIONS.map(origin => origin.value),
        originOptions: QUERY_ORIGIN_OPTIONS
      }
    },
    computed: {
      ...mapGetters(['isCloud']),
      ...mapState(['usedConfig', 'workspaceId']),
      ...mapState('data/usedQueries', { 'history': 'items', 'loading': 'loading', 'error': 'error'},),
      removeTitle() {
        return `Remove ${this.checkedHistoryQueries.length} saved history queries`;
      },
      searchActive() {
        return !this.isCloud && !!this.filterQuery.trim()
      },
      originsFiltered() {
        return !this.isCloud && this.selectedOrigins.length !== this.originOptions.length
      },
      currentHistory(){
        const history = (this.searchActive ? this.searchResults : this.history)
          .filter(item => (item.text ?? item.excerpt ?? '').trim())
        const connectionHistory = this.showAllHistory
          ? history
          // an unsaved connection has no id, and so no history of its own
          : this.usedConfig?.id
            ? history.filter(item => item.connectionId === this.usedConfig.id)
            : []
        // Remove this bypass after cloud migration to support query origin
        if (!this.originsFiltered) {
          return connectionHistory
        }

        return connectionHistory.filter(item => {
          return this.selectedOrigins.includes(this.originInfo(item).value)
        })
      },
    },
    watch: {
      filterQuery: 'queueSearch',
      history() {
        if (this.searchActive) this.queueSearch()
      },
      workspaceId() {
        this.clearFilter()
        this.resetSearch()
      },
      isCloud() {
        this.clearFilter()
        this.resetSearch()
      }
    },
    created() {
      this.debouncedSearch = _.debounce(this.search, 300)
    },
    mounted() {
      document.addEventListener('mousedown', this.maybeUnselect)
    },
    beforeDestroy() {
      this.resetSearch()
      document.removeEventListener('mousedown', this.maybeUnselect)
    },
    methods: {
      queueSearch() {
        this.resetSearch()
        if (this.searchActive) {
          this.searchLoading = true
          this.debouncedSearch(this.searchRequestId)
        }
      },
      clearFilter() {
        this.filterQuery = ''
      },
      resetSearch() {
        this.debouncedSearch.cancel()
        this.searchRequestId++
        this.searchResults = []
        this.searchLoading = false
        this.searchError = null
      },
      async search(requestId) {
        if (!this.searchActive) return
        this.searchLoading = true
        try {
          const results = await this.$util.send('appdb/usedQuery/search', {
            searchText: this.filterQuery.trim()
          })
          if (requestId === this.searchRequestId) {
            this.searchResults = _.orderBy(results, ['updatedAt'], ['desc'])
          }
        } catch (error) {
          if (requestId === this.searchRequestId) this.searchError = error
        } finally {
          if (requestId === this.searchRequestId) this.searchLoading = false
        }
      },
      formatTimeAgo(item) {
        const dt = _.isDate(item.updatedAt) ? item.updatedAt : new Date(item.updatedAt * 1000)
        return this.timeAgo.format(dt)
      },
      maybeUnselect(e) {
        if (!this.selected) return
        if (this.$refs.wrapper.contains(e.target)) {
          return
        } else {
          this.selected = null
        }
      },
      openContextMenu(event, item) {
        this.$bks.openMenu({
          event, item,
          options: [
            {
              name: "Remove",
              handler: ({ item }) => this.remove(item)
            }
          ]
        })
      },
      async refresh() {
        await this.$store.dispatch('data/usedQueries/load')
        if (this.searchActive) {
          this.resetSearch()
          await this.search(this.searchRequestId)
        }
      },
      click(item) {
        this.$root.$emit("historyClick", item)
      },
      nicelySized(text) {
        if (text.length >= 128) {
          return `${text.substring(0, 128)}...`
        } else {
          return text
        }
      },
      originInfo(item) {
        if (item.origin === 'plugin' && item.pluginId) {
          const specificPlugin = this.originOptions.find(option => {
            return option.pluginId === item.pluginId
          })

          if (specificPlugin) {
            return specificPlugin
          }
        }

        const genericOrigin = this.originOptions.find(option => {
          return option.origin === item.origin && !option.pluginId
        })

        if (genericOrigin) {
          return genericOrigin
        }

        return {
          label: 'Unknown',
          icon: 'code'
        }
      },
      select(item) {
        this.selected = item
      },
      async remove(historyQuery) {
        await this.$store.dispatch('data/usedQueries/remove', historyQuery)
        this.searchResults = this.searchResults.filter(item => item.id !== historyQuery.id)
      },
      async removeCheckedHistoryQueries() {
        for(let i = 0; i < this.checkedHistoryQueries.length; i++) {
          await this.remove(this.checkedHistoryQueries[i])
        }
        this.checkedHistoryQueries = [];
      },
      discardCheckedHistoryQueries() {
        this.checkedHistoryQueries = [];
      }
    },
  }
</script>

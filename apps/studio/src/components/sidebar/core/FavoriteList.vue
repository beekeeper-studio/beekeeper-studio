<template>
  <div class="sidebar-favorites flex-col expand">
    <div class="sidebar-list">
      <div class="list-group">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div class="expand">Saved Queries</div>
            <div class="actions">
              <a class="" @click.prevent="refresh">
                <i title="Refresh Saved Queries" class="material-icons">refresh</i>
              </a>
            </div>

          </div>

        </div>
      <error-alert v-if="error" :error="error" title="Problem loading queries" />
      <sidebar-loading v-else-if="loading" />
      <nav v-else-if="savedQueries.length > 0" class="list-body">
        <sidebar-folder
          v-for="{ folder, queries } in foldersWithQueries"
          :key="folder.id"
          :title="`${folder.name} (${queries.length})`"
          placeholder="No Queries"
          :expandedInitially="true"
        >
          <favorite-list-item
            v-for="item in queries"
            :key="item.id"
            :item="item"
            :selected="selected(item)"
          />
        </sidebar-folder>
        <favorite-list-item
          v-for="item in lonelyQueries"
          :key="item.id"
          :item="item"
          :selected="selected(item)"
         />
      </nav>
      <div class="empty" v-else>
        <span>No Saved Queries</span>
      </div>
      </div>
    </div>
  </div>
</template>

<script>
import ErrorAlert from '@/components/common/ErrorAlert.vue'
  import { mapState } from 'vuex'
  import SidebarLoading from '../../common/SidebarLoading.vue'
  import FavoriteListItem from './favorite_list/FavoriteListItem.vue'
  import SidebarFolder from '@/components/common/SidebarFolder.vue'
  export default {
    components: { SidebarLoading, ErrorAlert, FavoriteListItem, SidebarFolder },
    data: function () {
      return {
        checkedFavorites: []
      }
    },
    computed: {
      ...mapState(['activeTab']),
      ...mapState('data/queries', {'savedQueries': 'items', 'queriesLoading': 'loading', 'queriesError': 'error'}),
      ...mapState('data/queryFolders', {'folders': 'items', 'foldersLoading': 'loading', 'foldersError': 'error'}),
      loading() {
        return this.queriesLoading || this.foldersLoading || null
      },
      error() {
        return this.queriesError || this.foldersError || null
      },
      foldersWithQueries() {
        return this.folders.map((folder) => {
          return {
            folder,
            queries: this.savedQueries.filter((q) => 
              q.queryFolderId === folder.id
            )
          }
        })
      },
      lonelyQueries() {
        return this.savedQueries.filter((query) => {
          const folderIds = this.folders.map((f) => f.id)
          return !query.queryFolderId || !folderIds.includes(query.queryFolderId)
        })
      },
      removeTitle() {
        return `Remove ${this.checkedFavorites.length} saved queries`;
      }
    },
    methods: {
      refresh() {
        this.$store.dispatch("data/queries/load")
      },
      openContextMenu(event, item) {
        this.$bks.openMenu({
          item, event,
          options: [
            {
              name: "Remove",
              handler: ({ item }) => this.remove(item)
            }
          ]
        })
      },
      selected(item) {
        return this.activeTab && this.activeTab.query &&
          this.activeTab.query.id === item.id
      },
      click(item) {
        this.$root.$emit('favoriteClick', item)
      },
      async remove(favorite) {
        await this.$store.dispatch('data/queries/remove', favorite)
      },
      async removeCheckedFavorites() {
        for(let i = 0; i < this.checkedFavorites.length; i++) {
          await this.remove(this.checkedFavorites[i])
        }
        this.checkedFavorites = [];
      },
      discardCheckedFavorites() {
        this.checkedFavorites = [];
      }
    }
  }
</script>

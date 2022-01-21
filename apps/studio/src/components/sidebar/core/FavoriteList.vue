<template>
  <div class="sidebar-favorites flex-col expand">
    <div class="sidebar-list">
      <div class="list-group">
        <div class="list-heading row">
          <div class="sub row flex-middle expand">
            <div class="expand">Saved Queries</div>
            <div class="actions">
              <a v-if="isCloud" title="Import queries from local workspace" @click.prevent="importFromLocal"><i class="material-icons">save_alt</i></a>
              <a class="" @click.prevent="refresh">
                <i title="Refresh Saved Queries" class="material-icons">refresh</i>
              </a>
            </div>

          </div>

        </div>
      <error-alert v-if="error" :error="error" title="Problem loading queries" />
      <sidebar-loading v-if="loading" />
      <nav v-else-if="savedQueries.length > 0" class="list-body" ref="wrapper">
        <sidebar-folder
          v-for="({ folder, queries }) in foldersWithQueries"
          :key="`${folder.id}-${queries.length}`"
          :title="`${folder.name} (${queries.length})`"

          :expandedInitially="true"
        >
          <favorite-list-item
            v-for="item in queries"
            :key="item.id"
            :item="item"
            :active="isActive(item)"
            :selected="selected === item"
            @remove="remove"
            @select="select"
            @open="open"
            @rename="rename"
          />
        </sidebar-folder>
        <favorite-list-item
          v-for="item in lonelyQueries"
          :key="item.id"
          :item="item"
          :active="isActive(item)"
          :selected="selected === item"
          @remove="remove"
          @select="select"
          @open="open"
          @rename="rename"
         />
      </nav>
      <div class="empty" v-else>
        <span class="empty-title">No Saved Queries</span>
        <span class="empty-actions" v-if="isCloud">
          <a class="btn btn-flat btn-block btn-icon" @click.prevent="importFromLocal" title="Import queries from local workspace"><i class="material-icons">save_alt</i> Import</a>
        </span>
      </div>
      </div>
    </div>
    <modal class="vue-dialog beekeeper-modal" name="rename-modal" @closed="renameMe=null" height="auto" :scrollable="true">
      <div class="dialog-content" v-if="renameMe">
        <div class="dialog-c-title">Rename {{renameMe.title}}</div>
        <query-rename-form :query="renameMe" @done="$modal.hide('rename-modal')" />
      </div>
    </modal>

  </div>
</template>

<script>
import ErrorAlert from '@/components/common/ErrorAlert.vue'
  import { mapGetters, mapState } from 'vuex'
  import SidebarLoading from '../../common/SidebarLoading.vue'
  import FavoriteListItem from './favorite_list/FavoriteListItem.vue'
  import SidebarFolder from '@/components/common/SidebarFolder.vue'
import { AppEvent } from '@/common/AppEvent'
import QueryRenameForm from '@/components/common/form/QueryRenameForm.vue'
  export default {
    components: { SidebarLoading, ErrorAlert, FavoriteListItem, SidebarFolder, QueryRenameForm },
    data: function () {
      return {
        checkedFavorites: [],
        selected: null,
        renameMe: null
      }
    },
    mounted() {
      document.addEventListener('mousedown', this.maybeUnselect)
    },
    beforeDestroy() {
      document.removeEventListener('mousedown', this.maybeUnselect)
    },
    computed: {
      ...mapGetters(['workspace', 'isCloud']),
      ...mapState('tabs', {'activeTab': 'active'}),
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
      createQuery() {
        this.$root.$emit(AppEvent.newTab)
      },
      rename(query) {
        this.$modal.show('rename-modal')
        this.renameMe = query
      },
      importFromLocal() {
        this.$root.$emit(AppEvent.promptQueryImport)
      },
      maybeUnselect(e) {
        if (!this.selected) return
        if (this.$refs.wrapper.contains(e.target)) {
          return
        } else {
          this.selected = null
        }
      },
      refresh() {
        this.$store.dispatch("data/queries/load")
      },
      isActive(item) {
        return this.activeTab && this.activeTab.queryId === item.id
      },
      select(item) {
        this.selected = item
      },
      open(item) {
        this.$root.$emit('favoriteClick', item)
      },
      async remove(favorite) {
        if (window.confirm("Really delete?")) {
          await this.$store.dispatch('data/queries/remove', favorite)
        }
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

<template>
  <div class="sidebar-favorites flex-col expand">
    <div class="sidebar-heading">
      <span class="title">Saved Queries</span>
      <span class="expand"></span>
      <span class="buttons">
        <a class="btn btn-link" @click.prevent="refresh">
          <i class="material-icons">refresh</i>
        </a>
      </span>
    </div>
    <div class="sidebar-list">
      <nav class="list-group" v-if="savedQueries.length > 0">   
        <div class="list-item" @contextmenu.prevent.stop="openContextMenu($event, item)" v-for="item in savedQueries" v-bind:key="item.id">
          <a class="list-item-btn" @click.prevent="click(item)" :class="{active: selected(item)}">
            <i class="item-icon query material-icons">code</i>
            <div class="list-title flex-col">
              <span class="item-text title truncate expand" :title="item.title">{{item.title}}</span>
              <span class="database subtitle"><span :title="item.database" >{{item.database}}</span></span>
            </div>
          </a>
        </div>
      </nav>
      <div class="empty" v-if="savedQueries.length === 0">
        <span>No Saved Queries</span>
      </div>
    </div>
    <!-- <div class="toolbar btn-group row flex-right" v-show="checkedFavorites.length > 0">
      <a class="btn btn-link" @click="discardCheckedFavorites">Cancel</a>
      <a class="btn btn-primary" :title="removeTitle" @click="removeCheckedFavorites">Remove</a>
    </div> -->
  </div>
</template>

<script>
  import { mapState } from 'vuex'
  export default {
    data: function () {
      return {
        checkedFavorites: []
      }
    },
    computed: {
      ...mapState(['activeTab']),
      ...mapState('data/queries', {'savedQueries': 'items'}),
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

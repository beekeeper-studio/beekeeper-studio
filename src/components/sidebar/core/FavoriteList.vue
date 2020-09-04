<template>
  <div class="sidebar-favorites">
    <nav class="list-group" v-if="favorites.length > 0">
      <div class="list-item" v-for="item in favorites" v-bind:key="item.id">
        <a class="list-item-btn" @click.prevent="click(item)">
          <input @click.stop="" type="checkbox" :value="item" class="form-control delete-checkbox" v-model="checkedFavorites" v-bind:class="{ shown: checkedFavorites.length > 0 }">
          <i class="item-icon query material-icons">code</i>
          <div class="list-title flex-col">
            <span class="item-text title truncate expand" :title="item.title">{{item.title}}</span>
            <span class="database subtitle"><span :title="item.database" >{{item.database}}</span></span>
          </div>
          <x-button class="btn-fab" skin="iconic">
            <i class="material-icons">more_horiz</i>
            <x-menu style="--target-align: right; --v-target-align: top;">
              <x-menuitem @click="remove(item)">
                <x-label class="text-danger">Remove</x-label>
              </x-menuitem>
            </x-menu>
          </x-button>
        </a>
      </div>
      <div class="toolbar" v-show="checkedFavorites.length > 0">
        <div class="flex flex-right">
          <a class="btn btn-link" @click="discardCheckedFavorites">Discard</a>
          <a :title="removeTitle" class="btn btn-primary" @click="removeCheckedFavorites">Remove</a>
        </div>
      </div>
    </nav>
    <div class="empty" v-if="favorites.length === 0">
      <span>No Saved Queries</span>
    </div>
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
      ...mapState(['favorites']),
      removeTitle() {
        return `Remove ${this.checkedFavorites.length} saved queries`;
      }
    },
    methods: {
      click(item) {
        this.$root.$emit('favoriteClick', item)
      },
      async remove(favorite) {
        await this.$store.dispatch('removeFavorite', favorite)
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

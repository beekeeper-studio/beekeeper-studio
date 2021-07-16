<template>
  <div class="sidebar-favorites flex-col expand">
    <div class="sidebar-list">
      <nav class="list-group" v-if="favorites.length > 0">
        <div class="list-item" v-for="item in favorites" :key="item.id">
          <a
            class="list-item-btn"
            @click.prevent="click(item)"
            :class="{ active: selected(item) }"
          >
            <i class="item-icon query material-icons">code</i>
            <!-- <input @click.stop="" type="checkbox" :value="item" class="form-control delete-checkbox" v-model="checkedFavorites" :class="{ shown: checkedFavorites.length > 0 }"> -->
            <div class="list-title flex-col">
              <span
                class="item-text title truncate expand"
                :ref="`title-${item.id}`"
                :title="item.title"
                >{{ item.title }}</span
              >
              <input
                type="text"
                :ref="`input-${item.id}`"
                v-model="renameSystem.title"
                style="display:none;"
                autofocus
              />

              <span class="database subtitle">
                <span :title="item.database">{{ item.database }} </span>
              </span>
            </div>
            <x-contextmenu>
              <x-menu style="--target-align: right; --v-target-align: top;">
                <x-menuitem>
                </x-menuitem>
                <x-menuitem @click.prevent="remove(item)">
                  <x-label class="text-danger">Remove</x-label>
                </x-menuitem>
              </x-menu>
            </x-contextmenu>
          </a>
        </div>
      </nav>
      <div class="empty" v-if="favorites.length === 0">
        <span>No Saved Queries</span>
      </div>
    </div>
    <x-contextmenu>
      <x-menu style="--target-align: right; --v-target-align: top;">
        <x-menuitem>
          <x-label @click="createFolder">New Folder</x-label>
          <x-icon
            name="folder"
            computedsize="small"
            size="small"
            iconset="https://xel-toolkit.org/iconsets/material.svg"
          ></x-icon>
        </x-menuitem>
      </x-menu>
    </x-contextmenu>
    <!-- <div class="toolbar btn-group row flex-right" v-show="checkedFavorites.length > 0">
      <a class="btn btn-link" @click="discardCheckedFavorites">Cancel</a>
      <a class="btn btn-primary" :title="removeTitle" @click="removeCheckedFavorites">Remove</a>
    </div> -->
  </div>
</template>

<script>
import { mapState } from "vuex";
export default {
  data() {
    return {
      checkedFavorites: [],
    };
  },
  computed: {
    ...mapState(["favorites", "activeTab"]),
    removeTitle() {
      return `Remove ${this.checkedFavorites.length} saved queries`;
    }
  },
  methods: {
    // other trigger needed because files are multiplied not components
    selected(item) {
      return (
        this.activeTab &&
        this.activeTab.query &&
        this.activeTab.query.id === item.id
      );
    },
    click(item) {
      this.$root.$emit("favoriteClick", item);
    },
    async remove(favorite) {
      console.log(favorite.remove());
      await this.$store.dispatch("removeFavorite", favorite);
    },
    async removeCheckedFavorites() {
      for (let i = 0; i < this.checkedFavorites.length; i++) {
        await this.remove(this.checkedFavorites[i]);
      }
      this.checkedFavorites = [];
    },
    discardCheckedFavorites() {
      this.checkedFavorites = [];
    }
  }
};
</script>

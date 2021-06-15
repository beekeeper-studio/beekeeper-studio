<template>
  <div class="sidebar-favorites flex-col expand">
    <x-contextmenu>
      <x-menu style="--target-align: right; --v-target-align: top">
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
import { createParentDirectory } from "common/utils";
import { buildTree } from "@/plugins/foldertree";
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
    },
  },
  methods: {
    // other trigger needed because files are multiplied not component

    createFolder() {},

    openFolder() {
      buildTree();
    },

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
    },
  },
};
</script>

<template>
  <div class="sidebar-favorites flex-col expand">
    <x-contextmenu>
      <x-menu style="--target-align: right; --v-target-align: top">
        <x-menuitem>
          <x-label>New Folder</x-label>
          <x-icon
            name="folder"
            computedsize="small"
            size="small"
            iconset="https://xel-toolkit.org/iconsets/material.svg"
          ></x-icon>
        </x-menuitem>
      </x-menu>
    </x-contextmenu>
    <button @click="openFolder">something</button>
    <!-- <div class="toolbar btn-group row flex-right" v-show="checkedFavorites.length > 0">
      <a class="btn btn-link" @click="discardCheckedFavorites">Cancel</a>
      <a class="btn btn-primary" :title="removeTitle" @click="removeCheckedFavorites">Remove</a>
    </div> -->
  </div>
</template>

<script>
import { mapState } from "vuex";
import { buildTree } from "@/plugins/foldertree";
const { dialog } = window.require("electron").remote;
export default {
  data() {
    return {
      checkedFavorites: []
    };
  },
  computed: {
    ...mapState(["favorites", "activeTab"]),
    removeTitle() {
      return `Remove ${this.checkedFavorites.length} saved queries`;
    }
  },
  methods: {
    // other trigger needed because files are multiplied not component

    createFolder() {},

    openFolder() {
      dialog.showOpenDialog({ properties: ["openDirectory"] }).then(res => {
        buildTree(res.filePaths[0]);
      });
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
    }
  }
};
</script>

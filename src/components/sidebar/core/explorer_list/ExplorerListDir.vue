<template>
  <div class="list-item">
    <a class="list-item-btn" role="button" :class="{ open: showColumns }">
      <span class="btn-fab open-close" @mousedown.prevent="toggleColumns">
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span class="item-wrapper flex flex-middle expand">
        <i class="schema-icon item-icon material-icons">
          folder
        </i>
        <span class="folder-name truncate">
          {{ node.name }}
        </span>
      </span>

      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="createFolder">
            <x-label>New Folder</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="createFile">
            <x-label>New File</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click.prevent="remove">
            <x-label class="text-danger">Remove</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>
    <div v-if="showColumns" class="sub-items">
      <explorer-list-file
        v-for="file in files"
        :key="file.name"
        class="sub-item"
        :file="file"
      ></explorer-list-file>
      <explorer-list-dir
        v-for="dir in directories"
        :key="dir.name"
        class="sub-item"
        :node="dir"
      ></explorer-list-dir>
    </div>
  </div>
</template>

<style lang="scss">
.sub-items {
  padding-left: 0.3rem !important;
  .sub-item {
    .title {
      user-select: text;
      cursor: pointer;
    }
  }
}
</style>

<script type="text/javascript">
import ExplorerListFile from "./ExplorerListFile.vue";
import { uuidv4 } from "../../../../lib/uuid";

export default {
  name: "explorer-list-dir",
  props: ["node"],
  components: { ExplorerListFile },
  mounted() {
    this.showColumns = !!false;
  },
  data() {
    return {
      showColumns: false,
      id: uuidv4(),
      currentItem: null
    };
  },
  watch: {
    forceExpand() {
      if (this.forceExpand) {
        this.showColumns = true;
      }
    },
    forceCollapse() {
      if (this.forceCollapse) {
        this.showColumns = false;
      }
    }
  },
  computed: {
    // iconClass() {
    //   const result = {};
    //   result[`${this.table.entityType}-icon`] = true;
    //   return result;
    // },

    directories() {
      const dirArr = this.node.children.filter(element => {
        if (element.type === ".dir") {
          return element;
        }
      });

      return dirArr;
    },
    files() {
      const fileArr = this.node.children.filter(element => {
        if (element.type !== ".dir") {
          return element;
        }
      });

      return fileArr;
    }
  },

  methods: {
    doNothing() {
      // do nothing
    },

    async toggleColumns() {
      // this.$emit("selected", this.table);
      this.showColumns = !this.showColumns;
    }
  }
};
</script>

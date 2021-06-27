<template>
  <div class="list-item" :style="indent">
    <a class="list-item-btn" role="button" :class="{ open: showColumns }">
      <span
        class="btn-fab open-close"
        @mousedown.prevent="toggleColumns"
        @click.prevent="selectedDir(node.name)"
      >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span class="item-wrapper flex flex-middle expand">
        <i class="schema-icon item-icon material-icons">
          folder
        </i>
        <span class="folder-name-unselected truncate" :ref="node.name">
          {{ node.name }}
        </span>
      </span>

      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="createState('.dir')">
            <x-label>New Folder</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="createState('file')">
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
      <CreateNewNode
        v-show="creating.trigger"
        :placeholder="creating.placeholder"
        :type="creating.type"
        @cancel="cancel"
      ></CreateNewNode>

      <explorer-list-file
        v-for="file in files"
        :key="file.name"
        :file="file"
      ></explorer-list-file>
      <explorer-list-dir
        v-for="dir in directories"
        :key="dir.name"
        :node="dir"
        :depth="depth + 1"
      ></explorer-list-dir>
    </div>
  </div>
</template>

<script type="text/javascript">
import ExplorerListFile from "./ExplorerListFile.vue";
import CreateNewNode from "./CreateNewNode.vue";
import { uuidv4 } from "../../../../lib/uuid";

export default {
  name: "explorer-list-dir",
  props: ["node", "depth"],
  components: { ExplorerListFile, CreateNewNode },
  mounted() {
    this.showColumns = !!false;
  },
  data() {
    return {
      showColumns: false,
      id: uuidv4(),
      selected: {
        dir: null
      },
      creating: {
        trigger: false,
        placeholder: "",
        type: ""
      }
    };
  },

  computed: {
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
    },

    indent() {
      if (this.depth === 0) {
        return "";
      } else {
        return { transform: `translate(0.89rem)` };
      }
    }
  },

  methods: {
    async toggleColumns() {
      // this.$emit("selected", this.table);
      this.showColumns = !this.showColumns;
    },

    selectedDir(node) {
      for (const key in this.$refs) {
        const spanElement = this.$refs[key];
        if (spanElement.classList.contains("folder-name-selected")) {
          spanElement.classList.replace(
            "folder-name-selected",
            "folder-name-unselected"
          );
          return;
        }
        spanElement.classList.add("folder-name-selected");
      }
    },

    createState(type) {
      this.creating.trigger = true;
      this.showColumns = true;

      switch (type) {
        case ".dir":
          this.creating.placeholder = "Foldername";
          this.creating.type = type;
          break;
        case "file":
          this.creating.placeholder = "Filename";
          this.creating.type = "";
          break;
      }
    },

    cancel() {}
  }
};
</script>

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

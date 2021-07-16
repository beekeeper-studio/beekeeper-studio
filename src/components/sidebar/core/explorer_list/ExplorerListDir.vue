<template>
  <div class="list-item" :style="indent">
    <a class="list-item-btn" role="button" :class="{ open: showColumns }">
      <span
        class="btn-fab open-close"
        @mousedown.prevent="toggleColumns"
        @click.prevent="select(node)"
      >
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span class="item-wrapper flex flex-middle expand">
        <i class="schema-icon item-icon material-icons">
          folder
        </i>
        <RenameNode
          :currentNode="currentNode"
          :currentDir="currentDir"
          @closeRename="close"
          v-if="renameState.trigger"
        ></RenameNode>
        <span class="folder-name-unselected truncate" :ref="node.name" v-else>
          {{ node.name }}
        </span>
      </span>

      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="createState('dir')">
            <x-label>New Folder</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="createState('file')">
            <x-label>New File</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="createState('rename')">
            <x-label>Rename</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click.prevent="remove">
            <x-label class="text-danger">Remove</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>

    <div v-if="showColumns" class="sub-items">
      <NodeActions
        v-show="nodeData.trigger && nodeData.actionType !== 'rename'"
        :placeholder="nodeData.placeholder"
        :type="nodeData.actionType"
        :currentDir="currentDir"
        @close="close"
      ></NodeActions>

      <explorer-list-file
        v-for="file in files"
        :key="file.name"
        :file="file"
        @selectFile="selectFile"
        :currentNode="currentNode"
        :currentDir="currentDir"
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
import NodeActions from "./node_actions/NodeActions.vue";
import RenameNode from "./node_actions/RenameNode.vue";
import { uuidv4 } from "../../../../lib/uuid";
import explorer_actions from "@/mixins/explorer_actions";

export default {
  name: "explorer-list-dir",
  props: ["node", "depth"],
  mixins: [explorer_actions],
  components: { ExplorerListFile, NodeActions, RenameNode },
  mounted() {
    this.showColumns = !!false;
  },

  data() {
    return {
      showColumns: false,
      id: uuidv4(),

      renameState: {
        trigger: false
      },

      nodeData: {
        trigger: false,
        placeholder: "",
        actionType: ""
      }
    };
  },

  computed: {
    directories() {
      const dirArr = this.node.children.filter(element => {
        if (element.type === "dir") {
          return element;
        }
      });

      return dirArr;
    },

    files() {
      const fileArr = this.node.children.filter(element => {
        if (element.type !== "dir") {
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
      this.showColumns = !this.showColumns;
    },

    select(node) {
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

      this.selected.dir = node;
      this.selected.node = node;
    },

    createState(actionTyp) {
      this.select(this.node);
      this.nodeData.trigger = true;
      this.showColumns = true;
      this.nodeData.actionType = actionTyp;

      switch (actionTyp) {
        case "dir":
          this.nodeData.placeholder = "Foldername";
          break;
        case "file":
          this.nodeData.placeholder = "Filename";
          break;
        case "rename":
          this.renameState.trigger = true;
          break;
      }
    },

    close() {
      this.nodeData = {
        trigger: false,
        placeholder: "",
        type: ""
      };
    }
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

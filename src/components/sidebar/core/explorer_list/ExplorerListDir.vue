<template>
  <div class="list-item" :style="indent" @contextmenu="isNotRootLevel">
    <a class="list-item-btn" role="button" :class="{ open: showColumns }">
      <span class="btn-fab open-close" @click.prevent="selectDir(node)">
        <i class="dropdown-icon material-icons">keyboard_arrow_right</i>
      </span>
      <span class="item-wrapper flex flex-middle expand">
        <i class="schema-icon item-icon material-icons">
          folder
        </i>
        <RenameNode
          :currentNode="currentDir"
          :currentParentNode="currentParentNode"
          :type="'dir'"
          @close="closeRename"
          v-if="state.renameTrigger"
        ></RenameNode>
        <span
          class="folder-name-unselected truncate"
          :ref="node.node.title"
          v-else
        >
          {{ node.node.title }}
        </span>
      </span>

      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="createState('dir', node)">
            <x-label>New Folder</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="createState('file', node)">
            <x-label>New File</x-label>
          </x-menuitem>
          <x-menuitem @click.prevent="createState('rename', node)">
            <x-label>Rename</x-label>
          </x-menuitem>
          <hr />
          <x-menuitem @click.prevent="remove(node.node)">
            <x-label class="text-danger">Remove</x-label>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>

    <div v-if="showColumns" class="sub-items">
      <NodeActions
        v-show="state.creationTrigger"
        :placeholder="nodeData.placeholder"
        :type="nodeData.actionType"
        :currentDir="currentDir"
        @close="close"
      ></NodeActions>

      <explorer-list-file
        v-for="query in queries"
        :key="query.name"
        :query="query"
        @select="selectQuery"
        :currentNode="currentNode"
        :currentParentNode="currentParentNode"
      ></explorer-list-file>
      <explorer-list-dir
        v-for="dir in directories"
        :key="dir.title"
        :node="dir"
        :depth="depth + 1"
        @setParentNode="setParentNode"
      ></explorer-list-dir>
    </div>
  </div>
</template>

<script type="text/javascript">
import NodeActions from "./node_actions/NodeActions.vue";
import RenameNode from "./node_actions/RenameNode.vue";
import { uuidv4 } from "../../../../lib/uuid";
import ExplorerListFile from "./ExplorerListFile.vue";
import explorer_actions from "@/mixins/explorer_actions";
export default {
  name: "explorer-list-dir",
  props: ["node", "depth"],
  components: { ExplorerListFile, NodeActions, RenameNode },
  mixins: [explorer_actions],
  mounted() {
    this.showColumns = !!false;
  },

  data() {
    return {
      showColumns: false,
      id: uuidv4()
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

    queries() {
      const queriesArr = this.node.children.filter(element => {
        if (element.usage === "query") {
          return element;
        }
      });

      return queriesArr;
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
    isNotRootLevel() {
      this.$root.$emit("isNotRootLevel");
    },

    async toggleColumns() {
      this.showColumns = !this.showColumns;
    },

    async selectDir(node) {
      this.toggleColumns();
      const spanElement = this.$refs[node.node.title];
      if (spanElement.classList.contains("folder-name-selected")) {
        spanElement.classList.replace(
          "folder-name-selected",
          "folder-name-unselected"
        );
        this.unselectDir(node);
        return;
      }

      spanElement.classList.replace(
        "folder-name-unselected",
        "folder-name-selected"
      );

      this.setDir(node);
    },

    createState(actionType, node) {
      this.nodeData.actionType = actionType;
      this.correctSelection(node, actionType);

      setTimeout(() => {
        switch (actionType) {
          case "dir":
            this.nodeData.placeholder = "Foldername";
            this.state.creationTrigger = true;

            break;
          case "file":
            this.nodeData.placeholder = "Filename";
            this.state.creationTrigger = true;

            break;
          case "rename":
            this.$emit("setParentNode");

            this.state.renameTrigger = true;
            break;
        }
      }, 1);
    },

    async remove(node) {
      // safety measuere should be implemented because one time go and brrrr goes all files
      // TODO find the las currentDir after the one is deleted (Treestructure would be best)
      await this.$store.dispatch("removeDirectory", node);
      setTimeout(() => {
        this.$root.$emit("refreshExplorer");
      }, 1);
    },

    correctSelection(node, actionType) {
      if (actionType !== "rename") {
        const span = this.$refs[node.node.title];
        if (span.classList.contains("folder-name-unselected")) {
          this.selectDir(node);
          return;
        }
        this.setDir(node);
      } else {
        this.setDir(node);
      }
    },

    closeRename(node) {
      this.state.renameTrigger = false;
      setTimeout(() => {
        if (this.showColumns) {
          this.selectDirNoToggle(node);
        } else {
          this.correctSelection(node, "file");
        }
      }, 1);
    },

    async selectDirNoToggle(node) {
      const spanElement = this.$refs[node.node.title];
      if (spanElement.classList.contains("folder-name-selected")) {
        spanElement.classList.replace(
          "folder-name-selected",
          "folder-name-unselected"
        );
        this.unselectDir(node);
        return;
      }

      spanElement.classList.replace(
        "folder-name-unselected",
        "folder-name-selected"
      );

      this.setDir(node);
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

<template>
  <div
    class="list-item"
    :style="indent"
    @contextmenu="$root.$emit('isNotRootLevel')"
  >
    <a
      class="list-item-btn"
      role="button"
      :class="{ open: showColumns }"
      @click.alt.exact="createState('rename', node)"
      @click.ctrl.alt.exact="remove(null)"
    >
      <span class="btn-fab open-close" @click.exact="selectDir(node)">
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
          :validation="$store.getters.allValidation.dir"
          @close="closeRename"
          @rename="rename"
          v-if="state.renameTrigger"
        ></RenameNode>
        <span :class="selectClasses" v-else>
          {{ node.node.title }}
        </span>
      </span>

      <x-contextmenu>
        <x-menu>
          <x-menuitem @click="createState('dir', node)">
            <x-label>New Folder</x-label>
          </x-menuitem>
          <x-menuitem @click="createState('file', node)">
            <x-label>New File</x-label>
          </x-menuitem>
          <x-menuitem @click="createState('rename', node)">
            <x-label>Rename</x-label>
            <x-shortcut value="Alt+LMB"></x-shortcut>
          </x-menuitem>
          <hr />
          <x-menuitem @click.stop="remove(null)">
            <x-label class="text-danger">Remove</x-label>
            <x-shortcut value="Control+Alt+LMB"></x-shortcut>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </a>

    <div v-if="showColumns" class="sub-items">
      <NodeActions
        v-if="state.creationTrigger"
        :placeholder="nodeData.placeholder"
        :type="nodeData.actionType"
        :currentDir="currentDir"
        @close="close"
        @createFile="saveQuery"
        @createDirectory="createDirectory"
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

    <!-- remove-modal -->
    <modal
      class="vue-dialog beekeeper-modal shorter-width"
      name="remove-modal"
      height="auto"
    >
      <form @submit.prevent="remove(node)" @keydown.esc="cancel">
        <div class="dialog-content">
          <div class="dialog-c-title text-danger">Redbutton-Protocoll</div>
          <p class="dialog-c-text">
            Are you sure you want to delete the directory and all the content
            inside it?
          </p>
          <label class="checkbox-group" for="rememberDeleteInfo">
            <input
              class="form-control"
              id="rememberDeleteInfo"
              type="checkbox"
              name="rememberDeleteInfo"
              v-model="dontAskAgain"
            />
            <span>Don't ask again</span>
            <i
              class="material-icons"
              v-tooltip="
                'If checked, we will not warn you in the future anymore'
              "
              >help_outlined</i
            >
          </label>
        </div>
        <div class="vue-dialog-buttons">
          <button class="btn btn-flat" type="button" @click.prevent="cancel">
            Cancel
          </button>
          <button class="btn btn-danger" type="submit">
            Remove
          </button>
        </div>
      </form>
    </modal>
  </div>
</template>

<script type="text/javascript">
import NodeActions from "./node_actions/NodeActions.vue";
import RenameNode from "./node_actions/RenameNode.vue";
import { uuidv4 } from "../../../../lib/uuid";
import ExplorerListFile from "./ExplorerListFile.vue";
import node_actions_integration from "@/mixins/explorer/node_actions_integration";
import select_system from "@/mixins/explorer/select_system";
import rename_integration from "@/mixins/explorer/rename_integration";
export default {
  name: "explorer-list-dir",
  props: ["node", "depth"],
  components: { ExplorerListFile, NodeActions, RenameNode },
  mixins: [node_actions_integration, select_system, rename_integration],

  mounted() {
    this.showColumns = false;
    if (this.$store.getters.allOpenDirectories.includes(this.node)) {
      this.showColumns = true;
    }
  },

  data() {
    return {
      showColumns: false,
      id: uuidv4(),
      dontAskAgain: false
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
    },

    selectClasses() {
      return {
        "folder-name-selected": this.showColumns,
        "folder-name-unselected": !this.showColumns,
        truncate: true
      };
    }
  },

  methods: {
    cancel() {
      this.$modal.hide("remove-modal");
    },

    async toggleColumns() {
      this.showColumns = !this.showColumns;
    },

    saveQuery(title) {
      this.$root.$emit("saveQuery", title);
    },

    createDirectory(title) {
      this.$root.$emit("createDirectory", title);
    },

    createState(actionType, node = this.node) {
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
      if (node === null) {
        this.$modal.show("remove-modal");
      } else {
        await this.$store.dispatch("removeDirectory", node);
        if (this.dontAskAgain) {
          await this.$store.dispatch("dontAskAgainDirectory");
        }
        setTimeout(() => {
          this.$root.$emit("refreshExplorer");
          this.$noty.success("Deleted Directory");
          this.$modal.hide("remove-modal");
        }, 1);
      }
    },

    closeRename(node) {
      this.state.renameTrigger = false;
      this.$nextTick(() => {
        if (this.showColumns) {
          this.setDir(node);
        } else {
          this.correctSelection(node, "file");
        }
      });
    },

    async selectDir(node) {
      this.toggleColumns();
      const spanElement = this.$refs[node.node.title];
      if (!this.showColumns) {
        this.unselectDir(node);
        return;
      }

      this.setDir(node);
    },

    correctSelection(node, actionType) {
      if (actionType !== "rename") {
        if (!this.showColumns) {
          this.selectDir(node);
          return;
        }
        this.setDir(node);
      } else {
        this.setDir(node);
      }
    },

    async rename(name) {
      this.currentNode.node.title = name;
      await this.$store.dispatch("createDirectory", this.currentNode.node);
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

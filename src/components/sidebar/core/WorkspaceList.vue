<template>
  <div :class="`sidebar-history flex-col expand ${isEmpty}`">
    <div class="sidebar-list" v-if="workspaces.length > 0">
      <nav class="list-group">
        <div
          class="list-item"
          v-for="workspace in workspaces"
          :key="workspace.id"
        >
          <a class="list-item-btn" @click="select(workspace)">
            <i class="item-icon material-icons">widgets</i>

            <div class="list-title flex-col">
              <span class="item-text expand truncate">
                {{ nicelySized(workspace.title) }}</span
              >
              <span class="subtitle"
                ><span>{{ workspace.createdAt }}</span></span
              >
            </div>
            <x-contextmenu>
              <x-menu style="--target-align: right; --v-target-align: top;">
                <x-menuitem @click="remove(workspace)">
                  <x-label class="text-danger">Remove</x-label>
                </x-menuitem>
              </x-menu>
            </x-contextmenu>
          </a>
        </div>
      </nav>
    </div>
    <div class="empty" v-if="workspaces.length === 0">
      <span>No Workspaces found</span>
      <br />
      <span class="text-info align" @click="create"
        >Create Workspace
        <i class="item-icon material-icons left-margin">widgets</i></span
      >
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {};
  },

  mounted() {
    if (this.workspaces.length === 0) {
      this.$emit("empty");
    }
  },

  computed: {
    workspaces() {
      return this.$store.getters.allWorkspaces;
    },

    isEmpty() {
      if (this.workspaces.length <= 0) {
        return "center-empty";
      } else {
        return "";
      }
    }
  },

  methods: {
    nicelySized(text) {
      if (text.length >= 128) {
        return `${text.substring(0, 128)}...`;
      } else {
        return text;
      }
    },

    select(workspace) {
      this.$emit("select", workspace);
    },

    create() {
      this.$emit("create");
    },

    async remove(workspace) {
      await this.$store.dispatch("removeHistoryQuery", workspace);
    }
  }
};
</script>

<style lang="scss" scoped>
.center-empty {
  display: grid;
  justify-content: center;
  align-items: center;
}

.align {
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.left-margin {
  margin-left: 5px;
}
</style>

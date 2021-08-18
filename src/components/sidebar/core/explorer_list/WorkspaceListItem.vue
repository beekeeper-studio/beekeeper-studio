<template>
  <div class="list-item">
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
</template>

<script>
export default {
  props: ["workspace"],
  data() {
    return {};
  },

  computed: {},

  methods: {
    nicelySized(text) {
      if (text.length >= 128) {
        return `${text.substring(0, 128)}...`;
      } else {
        return text;
      }
    },

    async remove(workspace) {
      await this.$store.dispatch("removeWorkspace", workspace);
    },

    select(workspace) {
      this.$root.$emit("selectWorkspace", workspace);
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

.shoter-widht {
  width: 300px !important;
}
</style>

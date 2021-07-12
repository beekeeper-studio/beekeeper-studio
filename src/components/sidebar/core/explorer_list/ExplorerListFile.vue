<template>
  <div class="list-item extra-padding">
    <a class="list-item-btn " role="button">
      <i :class="`item-icon ${fileType.class} material-icons`">
        {{ fileType.icon }}
      </i>

      <span class="item-wrapper flex flex-middle expand">
        <span class="folder-name truncate">
          {{ file.name }}
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
  </div>
</template>

<script>
// import RenameNode from "./node_actions/RenameNode.vue";
export default {
  props: ["file", "currentNode", "nodeData"],
  components: {  },
  computed: {
    fileType() {
      const result = { class: this.file.type, icon: "" };
      switch (this.file.type) {
        case "query":
          result.icon = "code";
          return result;
        case "design":
          result.icon = "device_hub";
          return result;
        default:
          return result;
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.extra-padding {
  padding: 0 1.1rem !important;
}
</style>

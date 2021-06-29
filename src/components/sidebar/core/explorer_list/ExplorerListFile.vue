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
    </a>
  </div>
</template>

<script>
export default {
  props: ["file"],
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

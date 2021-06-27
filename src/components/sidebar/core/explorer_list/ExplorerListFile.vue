<template>
  <div class="list-item extra-padding">
    <a class="list-item-btn " role="button">
      <i class="item-icon query material-icons">code</i>

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
  props: ["file"]
};
</script>

<style lang="scss" scoped>
.extra-padding {
  padding: 0 1.1rem !important;
}
</style>

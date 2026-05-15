<template>
  <div class="carousel-slide">
    <slot />
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "CarouselSlide",
  inject: {
    registerSlide: { default: () => () => undefined },
    unregisterSlide: { default: () => () => undefined },
  },
  mounted() {
    this.registerSlide();
  },
  beforeDestroy() {
    this.unregisterSlide();
  },
});
</script>

<style scoped>
.carousel-slide {
  flex: 0 0 100%;
  min-width: 0;
}
</style>

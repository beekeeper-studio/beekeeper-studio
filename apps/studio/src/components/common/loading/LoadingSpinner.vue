<template>
  <div
    class="spinner"
    :style="{ '--size': `${size}px`}"
  >
    <div />
    <div />
    <div />
  </div>	
</template>

<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
	props: {
    size: {
      type: Number,
      default: 15
    }
  }
})
</script>

<style lang="scss" scoped>
@import '../../../shared/assets/styles/_variables';

.spinner {
  display: inline-block;
  position: relative;
  height: calc(var(--size) + 8px);
  width: calc(var(--size) + 8px);
  padding-right: ($gutter-h * 1.5);
  padding-left: $gutter-h;
  max-width: $gutter-w * 2.8;
  min-width: $gutter-w * 2.6;

  div {
    box-sizing: border-box;
    display: block;
    position: absolute;
    width: var(--size);
    height: var(--size);
    margin: 4px;
    border: 4px solid $theme-primary;
    border-radius: 50%;
    animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    border-color: $theme-primary transparent transparent transparent;

    &:nth-child(1) {
      animation-delay: -0.45s;
    }

    &:nth-child(2) {
      animation-delay: -0.3s;
    }

    &:nth-child(3) {
      animation-delay: -0.15s;
    }
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

</style>
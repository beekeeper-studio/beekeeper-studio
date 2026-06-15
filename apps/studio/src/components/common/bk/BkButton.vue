<template>
  <div
    class="bk-button"
    role="button"
    :tabindex="tabindex"
    v-bind="$attrs"
    v-on="$listeners"
    @pointerdown="onPointerDown"
    @keydown="onKeyDown"
  >
    <span
      ref="ripples"
      class="bk-ripples"
    />
    <slot />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { spawnRipple } from "./ripple";

export default Vue.extend({
  name: "BkButton",
  inheritAttrs: false,
  computed: {
    disabled(): boolean {
      const d = this.$attrs.disabled;
      return d !== undefined && d !== false && (d as unknown) !== "false";
    },
    tabindex(): number {
      return this.disabled ? -1 : 0;
    },
  },
  methods: {
    onPointerDown(event: PointerEvent) {
      // Only the primary (left) button triggers a ripple.
      if (event.button !== 0 || this.disabled) return;
      const effect = getComputedStyle(this.$el)
        .getPropertyValue("--trigger-effect")
        .trim();
      if (effect === "ripple" || effect === "unbounded-ripple") {
        spawnRipple(
          this.$refs.ripples as HTMLElement,
          this.$el as HTMLElement,
          event,
          effect === "unbounded-ripple"
        );
      }
    },
    onKeyDown(event: KeyboardEvent) {
      if (this.disabled) return;
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        (this.$el as HTMLElement).click();
      }
    },
  },
});
</script>

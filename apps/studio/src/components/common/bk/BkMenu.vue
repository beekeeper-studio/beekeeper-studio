<template>
  <span
    ref="anchor"
    class="bk-menu-anchor"
  >
    <portal to="menus">
      <div
        v-show="open"
        ref="menu"
        class="bk-menu"
        :style="menuStyle"
        @click="onMenuClick"
      >
        <slot />
      </div>
    </portal>
  </span>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "BkMenu",
  inheritAttrs: false,
  data() {
    return {
      open: false,
      menuStyle: {} as Record<string, string | number>,
      trigger: null as HTMLElement | null,
    };
  },
  mounted() {
    // The anchor lives inside the triggering button's DOM; find it.
    const anchor = this.$refs.anchor as HTMLElement;
    this.trigger = anchor.closest(".bk-button") || anchor.parentElement;
    if (this.trigger) {
      this.trigger.addEventListener("click", this.toggle);
    }
    document.addEventListener("mousedown", this.onDocumentMouseDown, true);
    document.addEventListener("keyup", this.onKeyUp);
  },
  beforeDestroy() {
    if (this.trigger) {
      this.trigger.removeEventListener("click", this.toggle);
      this.trigger.removeAttribute("expanded");
    }
    document.removeEventListener("mousedown", this.onDocumentMouseDown, true);
    document.removeEventListener("keyup", this.onKeyUp);
  },
  methods: {
    readAlign(): string {
      const data: any = this.$vnode.data || {};
      const staticStyle = data.staticStyle || {};
      const style = data.style || {};
      const get = (k: string) => style[k] || staticStyle[k];
      return String(get("--target-align") || get("--align") || "").trim();
    },
    toggle() {
      if (this.open) this.close();
      else this.show();
    },
    show() {
      if (this.trigger && this.trigger.hasAttribute("disabled")) return;
      this.open = true;
      if (this.trigger) this.trigger.setAttribute("expanded", "");
      this.$nextTick(this.position);
    },
    close() {
      if (!this.open) return;
      this.open = false;
      if (this.trigger) this.trigger.removeAttribute("expanded");
      this.$emit("close");
    },
    position() {
      const menu = this.$refs.menu as HTMLElement;
      const trigger = this.trigger;
      if (!menu || !trigger) return;
      const tr = trigger.getBoundingClientRect();
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      const align = this.readAlign();

      let left = tr.left;
      if (align === "right" || align === "end") left = tr.right - mw;
      left = Math.max(4, Math.min(left, window.innerWidth - mw - 4));

      let top = tr.bottom;
      if (top + mh > window.innerHeight && tr.top - mh >= 0) top = tr.top - mh;
      top = Math.max(4, top);

      this.menuStyle = {
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        zIndex: 1000000,
      };
    },
    onMenuClick(event: MouseEvent) {
      const item = (event.target as HTMLElement).closest(".bk-menuitem");
      if (item && !item.hasAttribute("disabled")) {
        this.close();
      }
    },
    onDocumentMouseDown(event: MouseEvent) {
      if (!this.open) return;
      const target = event.target as Node;
      const menu = this.$refs.menu as HTMLElement;
      if (menu && menu.contains(target)) return;
      if (this.trigger && this.trigger.contains(target)) return;
      this.close();
    },
    onKeyUp(event: KeyboardEvent) {
      if (event.key === "Escape" && this.open) this.close();
    },
  },
});
</script>

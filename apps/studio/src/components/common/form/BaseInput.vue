<template>
  <textarea
    v-if="type === 'textarea'"
    v-bind="$attrs"
    v-on="listeners"
    @contextmenu.prevent="showContextMenu($event)"
    :value="value"
    @input="$emit('input', $event.target.value)"
    ref="input"
  />
  <input
    v-else
    v-bind="$attrs"
    v-on="listeners"
    :type="type"
    @contextmenu.prevent="showContextMenu($event)"
    :value="value"
    @input="$emit('input', $event.target.value)"
    ref="input"
  />
</template>

<script lang="ts">
import Vue, { PropType, InputHTMLAttributes } from "vue";

export default Vue.extend({
  name: "BaseInput",

  props: {
    type: String as PropType<InputHTMLAttributes["type"] | "textarea">,
    value: [String, Number, Boolean],
    contextMenu: {
      type: Boolean,
      default: true,
    },
  },

  data() {
    return {
      lastEditable: null as HTMLInputElement | HTMLTextAreaElement | null,
    };
  },

  computed: {
    listeners() {
      const obj = {};
      for (const key in this.$listeners) {
        if (key === "input") continue;
        obj[key] = this.$listeners[key];
      }
      return obj;
    },

    /** Use this from parent components to get a reference to the input element.
     *
     * @example
     *
     * ```html
     * <BaseInput ref="myBaseInput" />
     * ```
     *
     * ```js
     * export default {
     *   mounted() {
     *     this.nextTick(() =>
     *       this.$refs.myBaseInput.input.focus()
     *     );
     *   }
     * }
     * ```
     */
    input() {
      return this.$refs.input as HTMLInputElement | HTMLTextAreaElement;
    },
  },

  methods: {
    showContextMenu(event: MouseEvent) {
      if (!this.contextMenu) {
        return;
      }

      const target = event.target as HTMLElement;

      // Remember what was right-clicked so handlers act on the correct field
      if (this.isEditable(target)) {
        this.lastEditable = target as HTMLInputElement | HTMLTextAreaElement;
        this.lastEditable.focus(); // ensure undo/redo applies here
      } else {
        this.lastEditable = null;
      }

      const selectionDepClass = this.hasSelectedText() ? "" : "disabled";

      this.$bks.openMenu({
        event,
        options: [
          {
            name: "Undo",
            handler: () => {
              const el = this.getActiveEditable();
              if (!el) return;
              // Uses Chromium's native undo stack for inputs/textareas
              document.execCommand("undo");
            },
            shortcut: this.ctrlOrCmd("z"),
            write: true,
          },
          {
            name: "Redo",
            handler: () => {
              const el = this.getActiveEditable();
              if (!el) return;
              document.execCommand("redo");
            },
            shortcut: this.ctrlOrCmd("shift+z"),
            write: true,
          },
          { type: "divider" },
          {
            name: "Cut",
            handler: () => document.execCommand("cut"),
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("x"),
            write: true,
          },
          {
            name: "Copy",
            handler: () => document.execCommand("copy"),
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd("c"),
          },
          {
            name: "Paste",
            handler: () => document.execCommand("paste"),
            shortcut: this.ctrlOrCmd("v"),
            write: true,
          },
          { type: "divider" },
          {
            name: "Select All",
            handler: () => document.execCommand("selectAll"),
            shortcut: this.ctrlOrCmd("a"),
          },
        ],
      });
    },

    getActiveEditable() {
      // Prefer the last right-clicked field; fall back to the currently focused one
      const active =
        this.lastEditable || (document.activeElement as HTMLElement | null);
      if (active && this.isEditable(active)) {
        (active as HTMLElement).focus();
        return active as HTMLInputElement | HTMLTextAreaElement;
      }
      return null;
    },

    isEditable(el: HTMLElement) {
      if (!el) return false;
      if (el instanceof HTMLInputElement) return !el.readOnly && !el.disabled;
      if (el instanceof HTMLTextAreaElement)
        return !el.readOnly && !el.disabled;
      if (el.isContentEditable) return true;
      return false;
    },

    hasSelectedText(el?: HTMLInputElement | HTMLTextAreaElement) {
      const target = el || (this.$el as HTMLInputElement);
      if (!target) return false;

      return (
        typeof target.selectionStart === "number" &&
        typeof target.selectionEnd === "number" &&
        target.selectionStart !== target.selectionEnd
      );
    },
  },
});
</script>

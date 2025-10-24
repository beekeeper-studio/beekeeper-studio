import Vue, { ComponentOptions } from "vue";

export const assignContextMenuToAllInputs: ComponentOptions<Vue> = {
  data() {
    return {
      ctxMenu_lastEditable: null as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null,
    };
  },

  async mounted() {
    await this.$nextTick();
    this.$el.addEventListener("contextmenu", this.ctxMenu_showContextMenu);
  },

  beforeDestroy() {
    this.$el.removeEventListener("contextmenu", this.ctxMenu_showContextMenu);
  },

  methods: {
    ctxMenu_showContextMenu(event: MouseEvent) {
      if (
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      if (event.target.dataset?.disableContextMenu) {
        return;
      }

      event.preventDefault();

      // Remember what was right-clicked so handlers act on the correct field
      if (this.ctxMenu_isEditable(event.target)) {
        this.ctxMenu_lastEditable = event.target;
        this.ctxMenu_lastEditable.focus(); // ensure undo/redo applies here
      } else {
        this.ctxMenu_lastEditable = null;
      }

      const selectionDepClass = this.ctxMenu_hasSelectedText(event.target)
        ? ""
        : "disabled";

      this.$bks.openMenu({
        event,
        options: [
          {
            name: "Undo",
            handler: () => {
              const el = this.ctxMenu_getLastEditable();
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
              const el = this.ctxMenu_getLastEditable();
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

    ctxMenu_isEditable(el: HTMLElement) {
      if (!el) return false;
      if (el instanceof HTMLInputElement) return !el.readOnly && !el.disabled;
      if (el instanceof HTMLTextAreaElement)
        return !el.readOnly && !el.disabled;
      if (el.isContentEditable) return true;
      return false;
    },

    ctxMenu_hasSelectedText(target: HTMLInputElement | HTMLTextAreaElement) {
      return (
        typeof target.selectionStart === "number" &&
        typeof target.selectionEnd === "number" &&
        target.selectionStart !== target.selectionEnd
      );
    },

    ctxMenu_getLastEditable() {
      // Prefer the last right-clicked field; fall back to the currently focused one
      const active =
        this.ctxMenu_lastEditable ||
        (document.activeElement as HTMLElement | null);
      if (active && this.ctxMenu_isEditable(active)) {
        (active as HTMLElement).focus();
        return active as HTMLInputElement | HTMLTextAreaElement;
      }
      return null;
    },
  },
};

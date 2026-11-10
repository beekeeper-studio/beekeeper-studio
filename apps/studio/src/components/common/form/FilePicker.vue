<template>
  <div
    class="input-group"
  >
    <div class="file-picker-input">
      <input
        :id="inputId"
        type="text"
        class="form-control"
        placeholder="No file selected"
        :class="{ clickable: !editable, 'has-clear': showClearButton }"
        :title="value"
        :value="inputValue"
        :disabled="disabled"
        :readonly="!editable"
        @click.prevent.stop="!editable && openFilePickerDialog()"
        @input="$emit('input', $event.target.value)"
      >
      <button
        v-if="showClearButton"
        type="button"
        class="clear"
        title="Clear"
        :disabled="disabled"
        @click.prevent="clear"
      >
        <i class="material-icons">cancel</i>
      </button>
    </div>
    <div
      class="input-group-append"
      :class="{ 'not-last': hasOtherActions || showCreateButton }"
      @click.prevent.stop="openFilePickerDialog"
    >
      <a
        type="button"
        class="btn btn-flat"
        :class="{disabled}"
      >{{ buttonText }}</a>
    </div>
    <div
      v-if="showCreateButton"
      class="input-group-append"
    >
      <a
        type="button"
        class="btn btn-flat"
        :class="{disabled}"
        @click="openFilePickerDialog({ save: true, create: true })"
      >
        Create
      </a>
    </div>
    <slot name="actions" />
  </div>
</template>

<script>

/* options and all for the native file picker can be found here https://www.electronjs.org/docs/latest/api/dialog */
export default {
  props: {
    value: {
      required: true,
    },
    defaultPath: {
      type: String,
      required: false,
      default: ''
    },
    // NOTE: this is now deprecated on Linux as of Electron 41, as GTK apparently intends
    // to remove support for it as well:
    // https://github.com/electron/electron/blob/main/docs/breaking-changes.md#deprecated-showhiddenfiles-in-dialogs-on-linux
    showHiddenFiles: {
      type: Boolean,
      required: false,
      default: false
    },
    multiple: {
      type: Boolean,
      required: false,
      default: false
    },
    options: {
      type: Object,
      required: false,
      default: () => ({})
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false
    },
    save: {
      type: Boolean,
      default: false
    },
    buttonText: {
      type: String,
      default: "Choose File"
    },
    inputId: {
      type: String,
      default: "file-picker"
    },
    editable: {
      type: Boolean,
      default: false,
    },
    showCreateButton: {
      type: Boolean,
      default: false,
    },
    // Shows a button that empties the input, for a picker that is locked
    // (not editable) until it is cleared.
    clearable: {
      type: Boolean,
      default: false,
    },
    directory: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    hasOtherActions() {
      return !!this.$slots.actions;
    },
    showClearButton() {
      return this.clearable && !!this.inputValue;
    },
    inputValue() {
      const files = this.value

      if (Array.isArray(files)) {
        if (files.length > 1) {
          return `${files[0]} (${files.length} files)`
        }
        return files[0]
      }

      return files
    }
  },
  methods: {
    clear() {
      if (this.disabled) return
      this.$emit('input', this.multiple ? [] : '')
      this.$emit('clear')
    },
    async openFilePickerDialog(options = {}) {
      if(this.disabled) {
        return
      }

      const dialogConfig = {
        properties: []
      }

      const effectiveDefault = this.defaultPath || (typeof this.value === 'string' ? this.value : '')
      if (effectiveDefault.toString().length > 0) {
        dialogConfig.defaultPath = effectiveDefault
      }

      if (this.directory) {
        dialogConfig.properties.push('openDirectory')
      } else {
        dialogConfig.properties.push('openFile')
      }

      if (this.showHiddenFiles) {
        dialogConfig.properties.push('showHiddenFiles')
      }

      if (this.multiple) {
        dialogConfig.properties.push('multiSelections')
      }

      // NOTE: Electron now defaults to the Downloads directory for these methods
      // Previously the OS would track the last opened directory and auto open there
      // but Electron is now overriding that. If we want that behaviour back,
      // we will have to manually track the last used directory ourselves
      let files
      if (options.save ?? this.save) {
        const file = this.$native.dialog.showSaveDialogSync({
          ...dialogConfig,
          ...this.options
        })
        // undefined when the dialog is cancelled, which must not clear the input
        files = file ? [file] : undefined
      } else {
        files = this.$native.dialog.showOpenDialogSync({
          ...dialogConfig,
          ...this.options
        })

      }
      if (!Array.isArray && files.filePaths) {
        files = files.filePaths
      }

      if (files) {
        if (!Array.isArray(files)) files = [files]

        if (this.multiple) {
          this.$emit('input', files)
        } else {
          this.$emit('input', files[0])
        }
        // `create` comes from the Create button, `choose` from any other pick,
        // so a parent can tell a new file from an existing one.
        this.$emit(options.create ? 'create' : 'choose', this.multiple ? files : files[0])
      }
    }
  }
}
</script>

<style lang="scss" scoped>
// Wraps the input so the clear button can sit inside it, like the clear
// button on filter inputs.
.file-picker-input {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 0%;
  min-width: 0;

  .form-control {
    margin-bottom: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;

    &.has-clear {
      padding-right: 26px;
    }
  }

  .clear {
    position: absolute;
    right: 0;
    display: flex;
    align-items: center;
    background: transparent;
    color: var(--btn-icon-fg);
    outline: none;
    border: 0;
    padding: 0;
    cursor: pointer;

    &:hover {
      color: var(--btn-icon-fg-hover);
    }

    &:disabled {
      cursor: default;
      opacity: 0.5;
    }

    i {
      font-size: 16px;
      width: 26px;
    }
  }
}
</style>

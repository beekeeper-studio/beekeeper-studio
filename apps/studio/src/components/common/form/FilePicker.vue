<template>
  <div
    class="input-group"
  >
    <input
      :id="inputId"
      type="text"
      class="form-control clickable"
      placeholder="No file selected"
      :title="value"
      :value="inputValue"
      :disabled="disabled"
      :readonly="!editable"
      @click.prevent.stop="!editable && openFilePickerDialog()"
      @input="$emit('input', $event.target.value)"
    >
    <div
      class="input-group-append"
      :class="{ 'not-last': hasOtherActions }"
      @click.prevent.stop="openFilePickerDialog"
    >
      <a
        type="button"
        class="btn btn-flat"
        :class="{disabled}"
      >{{ buttonText }}</a>
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
    openFileOrFolder: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    hasOtherActions() {
      return !!this.$slots.actions;
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
    async openFilePickerDialog() {
      if(this.disabled) {
        return
      }

      const dialogConfig = {
        properties: ['openFile']
      }

      if (this.defaultPath.toString().length > 0) {
        dialogConfig.defaultPath = this.defaultPath
      }

      if (this.showHiddenFiles) {
        dialogConfig.properties.push('showHiddenFiles')
      }

      if (this.multiple) {
        dialogConfig.properties.push('multiSelections')
      }

      if (this.openFileOrFolder) {
        // On Windows and Linux an open dialog can not be both a file selector
        // and a directory selector.
        dialogConfig.properties.push('openDirectory')
      }

      let files
      if (this.save) {
        files = [ this.$native.dialog.showSaveDialogSync({
          ...dialogConfig,
          ...this.options
        })]
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
      }
    }
  }
}
</script>

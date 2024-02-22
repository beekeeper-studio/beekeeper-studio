<template>
  <div
    class="input-group"
  >
    <input
      type="text"
      class="form-control clickable"
      placeholder="No file selected"
      :title="value"
      v-model="value"
      :disabled="disabled"
      readonly
      @click.prevent.stop="openFilePickerDialog"
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
    }
  },
  computed: {
    hasOtherActions() {
      return !!this.$slots.actions;
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
        this.$emit('input', files[0])
      }
    }
  }
}
</script>

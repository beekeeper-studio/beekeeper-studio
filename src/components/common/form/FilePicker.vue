<template>
  <div class="input-group" @click.prevent.stop="openFilePickerDialog" >
    <input type="text" class="form-control clickable" placeholder="No file selected" :title="value" :value="value" :disabled="disabled" readonly>
    <div class="input-group-append">
      <a type="buttom" class="btn btn-flat" :class="{disabled}">Choose file</a>
    </div>
  </div>
</template>

<script>
import { remote } from 'electron'


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
  },
  methods: {
    openFilePickerDialog() {
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
        files = [remote.dialog.showSaveDialogSync({
          ...dialogConfig,
          ...this.options
        })]
      } else {
        files = remote.dialog.showOpenDialogSync({
          ...dialogConfig,
          ...this.options
        })

      }
      // Show dialog extending default config with provided custom config

      if (files) {
        this.$emit('input', files[0])
      }
    }
  }
}
</script>

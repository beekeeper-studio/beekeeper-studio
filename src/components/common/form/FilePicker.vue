<template>
  <div class="input-group" @click.prevent.stop="openFilePickerDialog">
    <input type="text" class="form-control clickable" placeholder="No file selected" :title="value" :value="value" readonly>
    <div class="input-group-append">
      <button class="btn btn-small btn-flat">Choose file</button>
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
    }
  },
  methods: {
    openFilePickerDialog() {
      const dialogConfig = {
        properties: ['openFile']
      }

      if (this.defaultPath.toString().length > 0) {
        dialogConfig.defaultPath = this.defaultPath
      }

      if (this.showHiddenFiles) {
        dialogConfig.properties.push('showHiddenFiles')
      }

      // Show dialog extending default config with provided custom config
      const file = remote.dialog.showOpenDialogSync({
        ...dialogConfig,
        ...this.options
      })

      if (file) {
        this.$emit('input', file[0])
      }
    }
  }
}
</script>
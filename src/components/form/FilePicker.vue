<template>
  <div class="input-group" @click.prevent.stop="openFilePickerDialog">
    <input type="text" class="form-control clickable" placeholder="No file selected" :value="value" readonly>
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
      type: String,
      required: true
    },
    defaultPath: {
      type: String,
      required: false,
      default: null
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
        defaultPath: this.defaultPath,
        properties: ['openFile']
      }

      if (this.showHiddenFiles) {
        dialogConfig.properties.push('showHiddenFiles')
      }

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
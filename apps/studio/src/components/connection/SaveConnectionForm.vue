<template>
  <div class="save-connection expand">
    <h3 class="dialog-c-title">Save Connection</h3>
    <div class="form-group">
      <input class="form-control" ref="nameInput" @keydown.enter.prevent.stop="save" type="text" v-model="config.name" placeholder="Connection Name">
    </div>

    <div class="row flex-middle">
      <label class="checkbox-group" for="rememberPassword">
        <input class="form-control" id="rememberPassword" type="checkbox" name="rememberPassword" v-model="config.rememberPassword">
        <span>Save Passwords</span>
        <i class="material-icons" v-tooltip="'Passwords are encrypted when saved'">help_outlined</i>
      </label>
      <span class="expand"></span>
      <ColorPicker :value="config.labelColor" v-model="config.labelColor"></ColorPicker>
    </div>

    <div class="save-actions">
      <button v-if="canCancel" class="btn btn-flat" @click.prevent="$emit('cancel')">Cancel</button>
      <button class="btn btn-primary save" @click.prevent="save">Save</button>
    </div>
  </div>
</template>
<script>
import ColorPicker from '../common/form/ColorPicker';
export default {
  components: { ColorPicker },
  props: ['config', 'canCancel', 'selectInput'],
  mounted(){
    if(this.selectInput) {
      const $input = this.$refs.nameInput
      $input.focus()
      const len = $input.value.length
      $input.setSelectionRange(len, len)
    }
  },
  methods: {
    save() {
      this.$emit('save', this.config)
    }
  }
}
</script>

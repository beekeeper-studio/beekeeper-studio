<template>
  <div class="tabulator-bks-checkbox tabulator-checkbox-editor">
    <input type="checkbox" ref="input" v-model="checked" @keydown="keydown" @blur="submit" /> 
  </div>
</template>
<script lang="ts">
  import Vue from 'vue'
  export default Vue.extend({
    props: ['cell', 'params'],
    data() {
      return {
        checked: false,
        rendered: false,
      }
    },
    methods: {
      keydown(_e: KeyboardEvent) {
        if (_e.key === 'Escape') {
          this.$emit('cancel')
        }
        console.log("keydown", _e.key)
      },
      submit() {
        this.$emit('value', this.checked)
      }
    },
    watch: {
      checked() {
      },
      rendered() {
        if (this.rendered) {
          this.checked = !!this.cell.getValue()
          this.$refs.input.focus()
        }
      }
    }
  })
</script>
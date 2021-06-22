<template>
  <div class="tabulator-bks-checkbox tabulator-checkbox-editor">
    <input type="checkbox" ref="input" :checked="checked" @keydown="keydown" @blur="submit" /> 
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
      click(_e: Event) {
        console.log("click!")
        this.checked = !this.checked
        // this.checked = !this.checked
      },
      submit() {
        console.log("submitting", this.checked)
        this.$emit('value', this.checked)
      }
    },
    watch: {
      checked() {
        console.log('checked changed to ', this.checked)
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
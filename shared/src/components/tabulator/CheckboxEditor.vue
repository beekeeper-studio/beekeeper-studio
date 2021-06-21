<template>
  <div class="tabulator-checkbox-editor">
    <input type="checkbox" ref="input" v-model="checked" @keydown="keydown" @click.prevent.stop="click" @blur="submit" /> 
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
      keydown(e: KeyboardEvent) {
        if (e.key === ' ') {
          console.log("space")
          this.checked = !this.checked
        }
      },
      click(e: Event) {
        console.log("click!")
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
<template>
  <div class="tabulator-bks-checkbox" :class="editable ? 'editable' : 'read-only'" @mousedown.prevent.stop="click">
    <input type="checkbox" :disabled="!editable" @mousedown.prevent.stop="click" :checked="checked" />
  </div>
</template>
<script lang="ts">
  import Vue from 'vue'
  import _ from 'lodash'
  export default Vue.extend({
    props: ['cell', 'params'],
    data() {
      return {
        rendered: false,
        checked: false
      }
    },
    watch: {
      rendered() {
      }
    },
    computed: {
      editable(): boolean {
        return _.isFunction(this.params.editable) ? 
          this.params.editable(this.cell) : 
          this.params.editable
      }
    },
    methods: {
      click() {
        if (!this.editable) {
          return
        }
        this.cell.setValue(!this.cell.getValue())
        this.checked = this.cell.getValue()
      }

    },
    mounted() {
      this.checked = !!this.cell.getValue()
    }
  })
</script>
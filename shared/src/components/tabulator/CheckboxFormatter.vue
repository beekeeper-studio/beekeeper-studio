<template>
  <div class="tabulator-bks-checkbox" @mousedown.prevent.stop="click">
    <input type="checkbox" :disabled="!this.params.editable" @mousedown.prevent.stop="click" :checked="checked" />
  </div>
</template>
<script lang="ts">
  import Vue from 'vue'
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
    },
    methods: {
      click() {
        if (!this.params.editable) return
        this.cell.setValue(!this.cell.getValue())
        this.checked = this.cell.getValue()
      }

    },
    mounted() {
      this.checked = !!this.cell.getValue()
    }
  })
</script>
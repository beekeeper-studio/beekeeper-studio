<template>
  <div >
    <input placeholder="(EMPTY)" ref='input' type="text" v-model="value" @blur.prevent="submit" @change.prevent="submit">
    <button @mousedown.prevent.stop="clear" title="Nullify Value">🗑</button>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['cell'],
  data() {
    return {
      value: null,
      rendered: false
    }
  },
  methods: {
    submit() {
      this.$emit('value', this.value)
    },
    clear() {
      console.log('clear clicked')
      this.$emit('value', null)
    }
  },
  watch: {
    rendered() {
      console.log("rendered changed!", this.rendered)
      if (this.rendered) {
        this.value = this.cell.getValue()
        this.$refs.input.focus()
      }
    }
  },
  mounted() {
    // nothing really happens here, rendered watch is the real hook.

  }
})
</script>
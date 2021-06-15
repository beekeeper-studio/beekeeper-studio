<template>
  <div >
    <input :placeholder="params.placeholder" ref='input' type="text" v-model="value" @blur.prevent="submit" @change.prevent="submit">
    <button @mousedown.prevent.stop="clear" title="Nullify Value">🗑</button>
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
export default Vue.extend({
  props: ['cell', 'params'],
  data() {
    return {
      value: null,
      rendered: false
    }
  },
  methods: {
    submit() {
      // some cases we always want null, never empty string
      if (this.params.allowEmpty === false && _.isEmpty(this.value)) {
        this.$emit('value', null)
      } else {
        this.$emit('value', this.value)
      }

    },
    clear() {
      console.log('clear clicked')
      this.$emit('value', null)
    }
  },
  watch: {
    rendered() {
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
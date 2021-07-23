<template>
  <div>
    <input class="nullible-input" :placeholder="smartPlaceholder" ref='input' type="text" v-model="value" @blur.prevent="submit" @change.prevent="submit" @keydown="keydown">
    <i class="material-icons clear" @mousedown.prevent.stop="clear" title="Nullify Value">cancel</i>
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
      rendered: false,
      everEdited: false
    }
  },
  computed: {
    smartPlaceholder() {
      if (_.isNil(this.value)) {
        return '(NULL)'
      } else if (this.value === '') {
        if (this.params.allowEmpty) {
          return '(EMPTY)'
        } else {
          return '(NULL)'
        }
      }
      return ''
    }
  },
  methods: {
    keydown(e: KeyboardEvent) {
      if (e.key === 'Backspace') {
        if (this.value === '') {
          this.value = null
        }
      } else if (e.key === 'Delete') {
        if (_.isNil(this.value) && this.params.allowEmpty) {
          this.value = ''
        }
      } else if (e.key === 'Enter') {
        this.$emit('value', this.value)
      } else if (e.key === 'Tab') {
        // this.$emit('value', this.value)
      } else if (e.key.startsWith("Arrow")) {
        // this.$emit('value', this.value)
      } else if (e.key === 'Escape') {
        this.$emit('cancel')
      } else {
        this.everEdited = true
      }
    },
    submit() {
      // some cases we always want null, never empty string
      if (this.params.allowEmpty === false && _.isEmpty(this.value)) {
        this.$emit('value', null)
      } else {
        this.$emit('value', this.value)
      }

    },
    clear() {
      this.$emit('value', null)
    }
  },
  watch: {
    rendered() {
      if (this.rendered) {
        this.value = this.cell.getValue()
        this.$nextTick(() => {
          this.$refs.input.focus();
          if (this.params.autoSelect) {

            this.$refs.input.select();
          }
        })
      }
    }
  },
  mounted() {
    // nothing really happens here, rendered watch is the real hook.

  },
  beforeDestroy() {
    // add some logging here if you wanna check there's no memory leak
  }
})
</script>
<style lang="scss" scoped>
  @import '@shared/assets/styles/_variables';
  
  input {
    padding-right: 18px!important;
  }
  .clear {
    position: absolute;
    top: 0;
    bottom: 0;
    right: 2px;
    display: flex;
    align-items: center;
    font-size: 15px;
    width: 18px;
    text-align: center;
    color: $text-lighter;
    &:hover {
      color: $text-dark;
    }
  }
</style>
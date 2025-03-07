<template>
  <div>
    <input
      v-if="!typeEditorActive"
      class="nullible-input"
      :placeholder="smartPlaceholder"
      ref="input"
      type="text"
      v-model="value"
      @blur.prevent="onBlur"
      @change.prevent="submit"
      @keydown="keydown"
    >
    <slot />
    <i
      class="material-icons clear"
      @mousedown.prevent.stop="clear"
      title="Nullify Value"
    >cancel</i>
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import helpers from '@shared/lib/tabulator'
import rawLog from '@bksLogger'
import { hexToUint8Array, friendlyUint8Array } from '@/common/utils';
import { BksField } from "@/lib/db/models";

const log = rawLog.scope('NullableInputEditor')

export default Vue.extend({
  props: ['cell', 'params'],
  data() {
    return {
      value: null,
      rendered: false,
      everEdited: false,
      typeEditorActive: false
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
        // WHY: Without this we re-enter the editor right away
        e.stopImmediatePropagation()
        this.submit()
      } else if (e.key === 'Tab') {
        // FIXME: Tab and enter should both submit AND then move
        // the selected cell, currently only tab does this.

        this.$emit('value', this.value)
      } else if (e.key.startsWith("Arrow")) {
        // this.$emit('value', this.value)
      } else if (e.key === 'Escape') {
        this.$emit('cancel')
      } else {
        this.everEdited = true
      }
    },
    onBlur() {
      log.debug('blur, not submitting')
      this.$emit('cancel')
    },
    submit() {
      log.debug('nullable submitted')
      // some cases we always want null, never empty string
      if (this.params.allowEmpty === false && _.isEmpty(this.value)) {
        this.$emit('value', null)
      } else if (this.params.preserveObject) {
        try {
          this.$emit('value', JSON.parse(this.value))
        } catch (e) {
          const updateAnyway = this.params.onPreserveObjectFail?.(this.value)
          updateAnyway && this.$emit('value', this.value)
        }
      } else {
        let emitValue = this.value
        try {
          emitValue = this.parseValue()
        } catch (e) {
          log.error('Failed to parse value', this.value, e)
          this.$noty.error('Failed to parse value')
        } finally {
          this.$emit('value', emitValue)
        }
      }

    },
    clear() {
      this.typeEditorActive = false
      // nullifyInput is listened to by any slots which will then nullify the value and go through the whole submission process. Not having the below line caused sadness
      this.$emit('nullifyInput')
      this.$emit('value', null)
    },
    parseValue() {
      const typeHint = this.params.typeHint;
      const bksField: BksField = this.params.bksField;
      if (bksField?.bksType === 'BINARY' || ArrayBuffer.isView(this.cell.getValue())) {
        return friendlyUint8Array(hexToUint8Array(this.value));
      }
      if (typeof typeHint !== 'string') {
        return this.value
      }
      const floatTypes = [
        'float', 'double', 'double precision', 'dec', 'numeric', 'fixed'
      ]
      if (typeHint.includes('int') && !typeHint.includes('point') && !isNaN(this.value)) {
        return this.value > Number.MAX_SAFE_INTEGER ? this.value : parseInt(this.value);
      } else if (floatTypes.includes(typeHint)) {
        return parseFloat(this.value);
      } else {
        return this.value;
      }
    }
  },
  watch: {
    rendered() {
      if (this.rendered) {
        const cellValue = this.cell.getValue()
        this.value = _.isNil(cellValue) ? null : helpers.niceString(cellValue)
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
  @import '../../../shared/assets/styles/_variables';

  div {
    position: relative;
    display: flex;
    align-items: center;
  }
  .nullible-input {
    padding-right: 18px!important;
  }
  .clear {
    position: absolute;
    right: 3px;
    font-size: 14px!important;
    width: 16px;
    text-align: center;
    margin-top: -1px;
    cursor: pointer;
  }
</style>

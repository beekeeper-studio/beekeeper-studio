<template>
  <div>
    <input
      class="nullible-input"
      :placeholder="smartPlaceholder"
      ref="input"
      type="text"
      v-model="value"
      @change.prevent="submit"
      @keydown="keydown"
    >
    <div class="icon-wrapper">
      <i
        v-if="isDateTime"
        class="material-icons special-type"
        title="Open date/time picker"
        @mousedown.prevent.stop="toggleTypeEditor"
      >edit_calendar</i>
      <i
        class="material-icons clear"
        @mousedown.prevent.stop="clear"
        title="Nullify Value"
      >cancel</i>
    </div>
    <date-picker-editor
      v-if="isDateTime && this.typeEditorActive"
      :cell="this.cell"
      :data-type="this.params.dataType"
    />
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import DatePickerEditor from './DatePickerEditor.vue'
import helpers from '@shared/lib/tabulator'
export default Vue.extend({
  props: ['cell', 'params'],
  components: { DatePickerEditor },
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
    },
  },
  methods: {
    isDateTime() {
      console.log(`isDateTime ${this.params.dataType}`)
      return helpers.isDateTime(this.params.dataType)
    },
    toggleTypeEditor() {
      this.typeEditorActive = !this.typeEditorActive
    },
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
        this.submit()
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
    submit(e) {
      // if the typeEditor is active and you blur, don't submit anything
      console.log('nullable submit', e, this.value)
      if (e.type === 'blur' && this.typeEditorActive) return false

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
        this.$emit('value', this.value)
      }

      this.typeEditorActive = false

    },
    clear() {
      this.$emit('value', null)
    }
  },
  watch: {
    // have to figure out how to set the typeEditorActive to false on focusOut of the component
    rendered() {
      if (this.rendered) {
        this.value = _.isNil(this.cell.getValue()) ? this.cell.getValue() : helpers.niceString(this.cell.getValue())
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
    console.log(this.params)
  },
  beforeDestroy() {
    // add some logging here if you wanna check there's no memory leak
  }
})
</script>
<style lang="scss" scoped>
  @import '@shared/assets/styles/_variables';

  div {
    position: relative;
    display: flex;
    align-items: center;
  }
  .nullible-input {
    padding-right: 18px!important;
  }
  .clear {
    font-size: 14px!important;
    width: 16px;
  }
  .special-type {
    font-size: 14px!important;
    width: 16px;
  }
  .icon-wrapper{
    position: absolute;
    top: 0;
    bottom: 0;
    right: 3px;
    max-width: 32px;
    margin-top: -1px;
    display: flex;
    flex-wrap: nowrap;
  }
</style>

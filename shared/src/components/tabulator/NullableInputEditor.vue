<template>
  <div>
    <date-picker
      v-if="this.typeEditorActive && this.isDateTime"
      :type="datePickerType"
      :clearable="false"
      :confirm="true"
      :default-value="this.datePickerStarter"
      :open.sync="typeEditorActive"
      ref="datepicker"
      v-model="value"
      prefix-class="bkdates"
      confirm-text="click to confirm new selection"
      @confirm="submit"
    />
    <input
      v-else
      class="nullible-input"
      :placeholder="smartPlaceholder"
      ref="input"
      type="text"
      v-model="value"
      @blur.prevent="submit"
      @change.prevent="submit"
      @keydown="keydown"
    >
    <div class="icon-wrapper">
      <i
        class="material-icons special-type"
        @mousedown.prevent.stop="toggleTypeEditor"
        :title="this.typeEditorTitle"
      >{{ this.typeEditorIcon }}</i>
      <i
        class="material-icons clear"
        @mousedown.prevent.stop="clear"
        title="Nullify Value"
      >cancel</i>
    </div>
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import DatePicker from 'vue2-datepicker'
import helpers from '@shared/lib/tabulator'
export default Vue.extend({
  props: ['cell', 'params'],
  components: { DatePicker },
  data() {
    return {
      value: null,
      rendered: false,
      everEdited: false,
      typeEditorActive: false
    }
  },
  computed: {
    typeEditorTitle() {
      if (this.typeEditorActive) return 'Use standard input'
      if (helpers.isDateTime(this.params.dataType)) return 'Open date/time picker' 
      return ''
    },
    typeEditorIcon() {
      if (this.typeEditorActive) return 'edit'
      if (helpers.isDateTime(this.params.dataType)) return 'edit_calendar' 
      return ''
    },
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
    datePickerType() {
      const dataType = this.params?.dataType?.trim().toLowerCase() ?? ''

      if (dataType === 'date' || dataType === 'daterange') {
        return 'date'
      }

      if (this.isTimeType(dataType)) {
        return 'time'
      }

      return 'datetime'
    },
    datePickerStarter() {
      const dataType = this.params.dataType || ''
      let dataValue = this.value == null ? this.value : helpers.niceString(this.value)
      
      if (this.isTimeType(dataType) && dataValue !== null) {
        dataValue = dataValue.search(/(\+|-)/i) > -1 && !isNaN(dataValue.slice(-1)) ? `${dataValue}:00`: dataValue  
        
        return new Date(`2023-03-31T${dataValue}`)
      }

      return dataValue !== '' ? new Date(dataValue) : dataValue
    },
    isDateTime() {
      return helpers.isDateTime(this.params.dataType)
    }
  },
  methods: {
    isTimeType(dataValue) {
      const times = [
        'time',
        'timetz',
        'time without time zone',
        'time with time zone'
      ]

      return times.includes(dataValue.trim().toLowerCase().replace(/ *\([^)]*\) */g, ""))
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

      this.toggleTypeEditor = false

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
  },
  beforeDestroy() {
    // add some logging here if you wanna check there's no memory leak
    this.typeEditorActive = false
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
  .clear {
    font-size: 14px!important;
    width: 16px;
  }
  .special-type {
    font-size: 14px!important;
    width: 16px;
  }
</style>

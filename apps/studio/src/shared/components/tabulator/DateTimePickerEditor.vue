<template>
  <NullableInputEditor
    ref="nullable"
    :cell="cell"
    :params="params"
    @nullifyInput="nullifyInput"
  >
    <date-picker
      v-if="this.typeEditorActive"
      :type="datePickerType"
      :clearable="false"
      :confirm="true"
      :open.sync="typeEditorActive"
      ref="datepicker"
      v-model="datePickerValue"
      prefix-class="bkdates"
      confirm-text="click to confirm new selection"
      @confirm="submit"
    />
    <i
      class="material-icons special-type"
      @mousedown.prevent.stop="toggleTypeEditor"
      :title="this.typeEditorTitle"
    >{{ this.typeEditorIcon }}</i>
  </NullableInputEditor>
</template>
<script lang="ts">
/*
  https://github.com/mengxiong10/vue2-datepicker. There is an update for vue 3 when we're ready for that https://github.com/mengxiong10/vue-datepicker-next
*/
import _ from 'lodash'
import Vue from 'vue'
import DatePicker from 'vue2-datepicker'
import helpers from '@shared/lib/tabulator'
import NullableInputEditor from './NullableInputEditor.vue'
export default Vue.extend({
  props: ['cell', 'params'],
  components: { DatePicker, NullableInputEditor },
  data() {
    return {
      datePickerValue: null,
      rendered: false,
      typeEditorActive: false
    }
  },
  computed: {
    typeEditorTitle() {
      if (this.typeEditorActive) return 'Use standard input'
      return 'Open date/time picker' 
    },
    typeEditorIcon() {
      if (this.typeEditorActive) return 'edit'
      return 'edit_calendar' 
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
    submit(e) {
      // if the typeEditor is active and you blur, don't submit anything
      if (e.type === 'blur' && this.typeEditorActive) return false

      this.$emit('value', this.datePickerValue)

      this.toggleTypeEditor = false
    },
    nullifyInput() {
      this.toggleTypeEditor = false
      this.$emit('value', null)
    }
  },
  watch: {
    rendered() {
      this.$set(this.$refs.nullable.$data, 'rendered', this.rendered)
    },
    typeEditorActive() {
      if (this.typeEditorActive) {
        const refValue = this.cell.getValue()
        const dataType = this.params.dataType || ''
        let dataValue = refValue == null ? refValue : helpers.niceString(refValue)

        if (this.isTimeType(dataType) && dataValue !== null) {
          dataValue = dataValue.search(/(\+|-)/i) > -1 && !isNaN(dataValue.slice(-1)) ? `${dataValue}:00`: dataValue  
          // because it's a time type, we generally don't care what the date is, we just need to get a date object going to get the time working
          this.datePickerValue = new Date(`2023-03-31T${dataValue}`)
        } else if (dataValue !== null && dataValue !== '') {
          this.datePickerValue = new Date(dataValue)
        } else if (dataValue == null) {
          this.datePickerValue = new Date()
        }
      }
      this.$set(this.$refs.nullable.$data, 'typeEditorActive', this.typeEditorActive)
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

  .special-type {
    font-size: 14px!important;
    width: 16px;
    position: absolute;
    right: 20px;
  }
</style>

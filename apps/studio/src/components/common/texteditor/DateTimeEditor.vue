<template>
  <div>
    <date-picker
      :type="datePickerType"
      ref="datepicker"
      :clearable="false"
      :confirm="true"
      v-model="datePickerValue"
      :default-value="defaultDate"
      prefix-class="bkdates"
      confirm-text="click to confirm new selection"
      @confirm="submit"
      :open.sync="isOpen"
    />
  </div>
</template>

<script lang="ts">
import _ from "lodash";
import DatePicker from 'vue2-datepicker'
import 'vue2-datepicker/index.css'
import helpers from '@shared/lib/tabulator'
// import {
//   setKeybindingsFromVimrc,
//   applyConfig,
//   Register,
// } from "@/lib/editor/vim";
// import { AppEvent } from "@/common/AppEvent";
import rawLog from '@bksLogger'

const log = rawLog.scope('DateTimeEditor')

export default {
  props: {
    cell: {},
    value: {}
  },
  components: { DatePicker },
  data() {
    return {
      dataType: '',
      timeZone: null,
      datePickerValue: null,
      isOpen: true
    };
  },
  computed: {
    defaultDate() {
      return new Date(this.value)
    },
    datePickerType() {
      const dataType = this.dataType?.trim().toLowerCase() ?? ''

      if (dataType === 'date' || dataType === 'daterange') {
        return 'date'
      }

      if (this.isTimeType(dataType)) {
        return 'time'
      }

      return 'datetime'
    }
  },
  watch: {
    cell() {
      console.log('cell is being called')
    }
  },
  methods: {
    submit(e) {
      console.log(e, this.datePickerValue)
      console.log('---')
      // if the typeEditor is active and you blur, don't submit anything
      if (e.type === 'blur') return false

      console.log('~~~~')
      console.log(this.datePickerValue)

      this.$emit('input', this.datePickerValue)
      this.isOpen = false
    },
    isTimeType(dataValue) {
      const times = [
        'time',
        'timetz',
        'time without time zone',
        'time with time zone'
      ]

      return times.includes(dataValue.trim().toLowerCase().replace(/ *\([^)]*\) */g, ""))
    },
    initialize() {
      const { dataType } = this.cell.getColumn().getDefinition()
      const refValue = this.value
      let dataValue = refValue == null ? refValue : helpers.niceString(refValue)
      this.dataType = dataType
      if (this.isTimeType(this.value)) {
        dataValue = dataValue.search(/(\+|-)/i) > -1 && !isNaN(dataValue.slice(-1)) ? `${dataValue}:00`: dataValue  
        // because it's a time type, we generally don't care what the date is, we just need to get a date object going to get the time working
        this.datePickerValue = new Date(`2023-03-31T${dataValue}`)
      } else {
        this.datePickerValue = new Date(dataValue)
      }
    },
  },
  async mounted() {
    this.initialize()
    // this.$emit('input', newValue)
    // await this.initialize({
    //   userKeymap: this.$store.getters['settings/userKeymap'],
    // });
    // window.addEventListener('focus', this.focusEditor);
    // window.addEventListener('blur', this.handleBlur);
    // this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    // window.removeEventListener('focus', this.focusEditor);
    // window.removeEventListener('blur', this.handleBlur);
    // this.destroyEditor();
    // this.unregisterHandlers(this.rootBindings);
  },
};
</script>

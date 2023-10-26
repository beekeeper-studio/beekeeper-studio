<template>
  <div>
    <date-picker
      v-if="this.isDateTime"
      ref="input"
      :type="this.datePickerType"
      :range="this.isDateRange"
      v-model="value"
      :default-value="this.datePickerStarter"
      prefix-class="bkdates"
      :confirm="true"
      confirm-text="click to confirm new selection"
      @confirm="submit"
    />
    <input
      v-else
      :class="[{'date-thing': this.isDateTime}, 'nullible-input']"
      :placeholder="smartPlaceholder"
      ref="input"
      type="text"
      v-model="value"
      @blur.prevent="submit"
      @change.prevent="submit"
      @keydown="keydown"
    >
    <!-- <i
      class="material-icons clear"
      @mousedown.prevent.stop="clear"
      title="Nullify Value"
    >cancel</i> -->
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
    },
    isDateRange() {
      const dataType = this.params?.dataType?.trim().toLowerCase() ?? ''

      return dataType === 'daterange'
    },
    datePickerType() {
      const dataType = this.params?.dataType?.trim().toLowerCase() ?? ''
      console.log(`~~~ datePickerType ${dataType} ~~~`)

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

      // TODO: also, figure out how date range works (saving it isn't working out super great)
      // TODO: figure out how to keep the timezone (maybe there has to be an option to do input or datepicker)

      return dataValue !== '' ? new Date(dataValue) : dataValue
    },
    isDateTime() {
      return this.params.dataType?.search(/(date|time)/i) > -1
      /*
        [
          'date',
          'datetime',
          'time',
          'timestamp',
          'timetz',
          'timestamptz',
          'timestamp without time zone',
          'timestamp with time zone',
          'time without time zone',
          'time with time zone',
          'daterange',
          'datetime2',
          'datetimeoffset',
          'smalldatetime'
        ]
      */
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
    submit() {
      // some cases we always want null, never empty string
      console.log('submit called!')
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

    },
    clear() {
      this.$emit('value', null)
    }
  },
  watch: {
    rendered() {
      if (this.rendered) {
        this.value = this.cell.getValue() === null ? null : helpers.niceString(this.cell.getValue())
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
    top: 0;
    bottom: 0;
    right: 3px;
    display: flex;
    align-items: center;
    font-size: 14px!important;
    width: 16px;
    text-align: center;
    margin-top: -1px;
  }
</style>

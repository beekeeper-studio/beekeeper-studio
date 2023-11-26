<template>
  <portal to="modals">
    <modal
      :name="modalName"
      class="beekeeper-modal vue-dialog"
      @closed="onClose"
      @open="onOpen"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          Edit {{ dataType }} column
        </div>
        <date-picker
          :type="datePickerType"
          :clearable="false"
          :confirm="true"
          :open="true"
          v-model="value"
          prefix-class="bkdates"
          confirm-text="click to confirm new selection"
          @confirm="submit"
        />
        <div class="vue-dialog-buttons">
          <button
            class="btn btn-flat"
            type="button"
            @click.prevent="closeModal"
          >
            Cancel
          </button>
        </div>
      </div>
    </modal>
  </portal>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import DatePicker from 'vue2-datepicker'
import helpers from '@shared/lib/tabulator'
export default Vue.extend({
  props: ['cell', 'dataType', 'active'],
  components: { DatePicker },
  data() {
    return {
      value: null,
      modalName: ''
    }
  },
  computed: {
    datePickerType() {
      const dataType = this.dataType?.trim().toLowerCase() ?? ''

      console.log('datePickerType: ', this.dataType)

      if (dataType === 'date' || dataType === 'daterange') {
        console.log('picker date')
        return 'date'
      }

      if (this.isTimeType(dataType)) {
        console.log('picker time')
        return 'time'
      }
      
      console.log('picker datetime')
      return 'datetime'
    }
  },
  methods: {
    closeModal() {
      this.$modal.hide(this.modalName)
    },
    onClose() {
      console.log('closing time')
    },
    onOpen() {
      console.log('time to open')
    },
    isTimeType(dataValue) {
      const times = [
        'time',
        'timetz',
        'time without time zone',
        'time with time zone'
      ]
      
      return times.includes(dataValue.trim().toLowerCase().replace(/ *\([^)]*\) */g, ''))
    },
    submit(e) {
      console.log('Submit', e)
      this.$emit('value', e)
      this.$modal.hide(this.modalName)
    },
  },
  mounted() {
    // nothing really happens here, rendered watch is the real hook.
    console.log('~~~', this.dataType, this.cell.getValue(), this.active)
    const dataType = this.dataType || ''
    const val = this.cell.getValue()
    let dataValue = val == null ? val : helpers.niceString(val)
    
    if (this.isTimeType(dataType) && dataValue !== null) {
      dataValue = dataValue.search(/(\+|-)/i) > -1 && !isNaN(dataValue.slice(-1)) ? `${dataValue}:00`: dataValue  
      this.value = new Date(`2023-03-31T${dataValue}`)
    } else if (dataValue !== '') {
      this.value = new Date(dataValue)
    }
    this.$nextTick(() => {
      this.$modal.show(this.modalName)
    })
  },
  beforeDestroy() {
    // add some logging here if you wanna check there's no memory leak

    console.log(`it's gone forever`)
  }
})
</script>
<style lang="scss" scoped>
  .special-type {
    font-size: 14px!important;
    width: 16px;
  }
</style>

<template>
  <div>
    <date-picker
      v-if="this.isDateTime"
      ref="input"
      type="datetime"
      v-model="value"
      prefix-class="bk"
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
    isDateTime() {
      console.log('isDateTime', this.params.dataType?.search(/(date|time)/i) > -1)
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
    },
    getDateTimeOptions() {
      return 'goobers'
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
        this.value = helpers.niceString(this.cell.getValue())
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

  .date-thing {
    background-color: red !important;
  }
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

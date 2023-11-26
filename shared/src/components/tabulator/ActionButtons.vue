<template>
  <span>
    <slot
      v-if="editorType === 'datepicker'"
      name="datePicker"
    />
  </span>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import helpers from '@shared/lib/tabulator'
export default Vue.extend({
  props: {
    cell: Object,
    dataType: String
  },
  components: {  },
  data() {
    return {
      editorType: null,
      typeEditorActive: false
    }
  },
  computed: {
    
  },
  methods: {
    isDateTime() {
      console.log('I am here now...', this.dataType)
      return helpers.isDateTime(this.dataType)
    },
    toggleTypeEditor() {
      console.log('see it!')
      this.typeEditorActive = !this.typeEditorActive
    },
    clear() {
      this.$emit('value', null)
    }
  },
  watch: {
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
    if (this.isDateTime()) {
      this.editorType = 'datepicker'
    }
    // nothing really happens here, rendered watch is the real hook.
  },
  beforeDestroy() {
    // add some logging here if you wanna check there's no memory leak
  }
})
</script>
<style lang="scss" scoped>
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

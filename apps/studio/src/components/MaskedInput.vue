<template>
    <input
      :type="computedType"
      :value="displayedValue"
      @input="handleInput"
      :readonly="privacyMode"
      class="form-control"
    >
  </template>
  
  <script>
  export default {
    name: 'MaskedInput',
    props: {
      value: {
        type: [String, Number],
        default: ''
      },
      privacyMode: {
        type: Boolean,
        default: false
      },
      type: {
        type: String,
        default: 'text'
      },
      mask: {
        type: String,
        default: '******'
      }
    },
    computed: {
      computedType() {
        return this.privacyMode ? 'text' : this.type;
      },
      displayedValue() {
        return this.privacyMode ? this.mask : this.value;
      }
    },
    methods: {
      handleInput(event) {
        if (!this.privacyMode) {
          this.$emit('input', event.target.value);
        }
      }
    }
  }
  </script>
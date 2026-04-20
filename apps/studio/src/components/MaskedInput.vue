<template>
    <input
      v-bind="$attrs"
      v-tooltip="privacyMode ? 'Privacy Mode is enabled, disable it in the View menu to see this data' : null"
      :type="computedType"
      :value="displayedValue"
      @input="handleInput"
      :readonly="privacyMode"
      class="form-control"
    >
  </template>

  <script>
  import { mapGetters } from 'vuex'

  export default {
    name: 'MaskedInput',
    props: {
      value: {
        type: [String, Number],
        default: ''
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
      ...mapGetters('settings', ['privacyMode']),
      computedType() {
        // Keep password type as-is so we don't lose its semantics
        if (this.type === 'password') {
          return 'password';
        }
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

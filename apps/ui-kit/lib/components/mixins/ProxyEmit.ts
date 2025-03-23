// This is used for listening events in DataEditor component.
// This is a replacement for v-on="$listeners" and the reason is that
// v-on="$listeners" will only listen to custom events (non native events) that
// we explicitly defined in the component with v-on or @.
export default {
  props: {
    proxyEmit: Boolean,
    default: false,
  },
  beforeMount() {
    if (!this.proxyEmit) return
    const emit = this.$emit
    this.$emit = function (name, ...args) {
      this.$parent.$emit(name, ...args)
      emit.call(this, name, ...args)
    }
  }
}

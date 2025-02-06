// This is a replacement for v-on="$listeners" and the reason is that
// v-on="$listeners" will only listen to custom events (non native events) that
// we explicitly defined in the component with v-on or @.
// This is used for listening events in DataEditor component.
export default {
  beforeCreate() {
    if (!Boolean(this.$attrs.proxyEmit)) return

    const emit = this.$emit
    this.$emit = function (name, ...args) {
      this.$parent.$emit(name, ...args)
      emit.call(this, name, ...args)
    }
  }
}

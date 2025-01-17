// This is a replacement for v-on="$listeners" and the reason is that
// v-on="$listeners" will only listen to custom events (non native events) that
// we explicitly defined in the component with v-on or @.
export default {
  beforeCreate() {
    if (!this.$attrs.proxyEmit) return

    const emit = this.$emit
    this.$emit = function (name, ...args) {
      this.$attrs.proxyEmit(name, ...args)
      emit.call(this, name, ...args)
    }
  }
}

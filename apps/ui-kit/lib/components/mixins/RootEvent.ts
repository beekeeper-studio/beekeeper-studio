import Vue from "vue";

export const RootEventMixin = Vue.extend({
  methods: {
    trigger(event: string, ...args: any) {
      this.$root.$emit(event, ...args)
    },
  },
  mounted() {
    this.rootBindings?.forEach(({ event, handler }) => {
      this.$root.$on(event, handler);
    });
  },
  beforeDestroy() {
    this.rootBindings?.forEach(({ event, handler }) => {
      this.$root.$off(event, handler);
    });
  },
});

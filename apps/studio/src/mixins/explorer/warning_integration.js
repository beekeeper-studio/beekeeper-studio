export default {
  data() {
    return {
      showWarning: false
    };
  },

  methods: {
    toggleWarning() {
      this.showWarning = !this.showWarning;
    }
  }
};

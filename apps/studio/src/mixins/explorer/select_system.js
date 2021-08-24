export default {
  methods: {
    // INFO all methods under here should be shared with main level
    async setDir(node) {
      await this.$store.dispatch("setSelectDirectory", node);
    },

    async unselectDir(node) {
      await this.$store.dispatch("removeSelectDirectory", node);
    },

    async selectQuery(node) {
      await this.$store.dispatch("setSelectNode", node);
    },

    async setParentNode() {
      await this.$store.dispatch("setParentNode", this.node || null);
    }
  }
};

export default {
  data() {
    return {
      state: {
        renameTrigger: false,
        creationTrigger: false
      },
      // nodeData is not really describing the variable good //TODO Rename it properly
      nodeData: {
        placeholder: "",
        actionType: ""
      }
    };
  },

  computed: {
    currentNode() {
      return this.$store.state.explorer.selectState.node;
    },

    currentDir() {
      return this.$store.getters.currentDirectory;
    },

    currentParentNode() {
      return this.$store.getters.currentParentNode;
    }
  },

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
    },

    close() {
      this.nodeData = {
        placeholder: "",
        type: ""
      };
      this.state.creationTrigger = false;
    }
  }
};

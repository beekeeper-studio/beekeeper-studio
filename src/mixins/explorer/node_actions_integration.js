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
    close() {
      this.nodeData = {
        placeholder: "",
        type: ""
      };
      this.state.creationTrigger = false;
      this.state.renameTrigger = false;
    }
  }
};

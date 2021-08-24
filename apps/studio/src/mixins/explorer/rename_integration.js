export default {
  data() {
    return {
      state: {
        renameTrigger: false
      },
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
    currentParentNode() {
      return this.$store.getters.currentParentNode;
    }
  },

  methods: {
    defaultRenameClose() {
      this.state.renameTrigger = false;
    }
  }
};

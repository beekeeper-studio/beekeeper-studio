export default {
  data() {
    return {
      selected: {
        dir: null,
        node: null
      }
    };
  },

  computed: {
    currentNode() {
      return this.selected.node || this.$store.getters.currentWorkspace;
    },
    currentDir() {
      return this.selected.dir || this.$store.getters.currentWorkspace;
    }
  },

  methods: {
    selectQuery(query) {
      this.selected.node = query;
    }
  }
};

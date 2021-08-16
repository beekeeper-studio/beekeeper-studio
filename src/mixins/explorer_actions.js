export default {
  data() {
    return {
      selected: {
        dir: [],
        node: null
      }
    };
  },

  computed: {
    currentNode() {
      return this.selected.node || this.$store.getters.currentWorkspace;
    },
    currentDir() {
      return (
        this.selected.dir[this.selected.dir.length - 1] ||
        this.$store.getters.currentWorkspace
      );
    },

    currentLength() {
      return this.selected.dir.length;
    }
  },

  methods: {
    selectQuery(query) {
      this.selected.node = query;
    },

    setDir(node) {
      this.selected.dir.push(node);
      this.selected.node = node;
    },

    unselectDir(node) {
      const index = this.selected.dir.indexOf(node);
      if (index > -1) {
        this.selected.dir.splice(index, 1);
      }
    }
  }
};

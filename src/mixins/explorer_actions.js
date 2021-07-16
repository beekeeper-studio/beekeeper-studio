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
      return this.selected.node;
    },
    currentDir() {
      return this.selected.dir;
    }
  },

  methods: {
    selectFile(file) {
      this.selected.node = file;
    }
  }
};

class TreeNode {
  constructor(node, type = "dir") {
    this.node = node;
    this.type = type;
    this.children = [];
  }
}

class TreeFunctions {
  constructor(store) {
    this.store = store;
  }
}

function createTree(workspace, directories, queries, options = {}) {
  const root = new TreeNode(workspace);
  const stack = [root];

  while (stack.length) {
    const currentNode = stack.pop();
    if (currentNode) {
      queries.forEach(file => {
        if (file.directory_id === currentNode.node.id) {
          const fileNode = new TreeNode(file, "query");
          currentNode.children.push(fileNode);
        }
      });

      directories.forEach(dir => {
        if (dir.parent_id === currentNode.node.id) {
          const dirNode = new TreeNode(dir);
          currentNode.children.push(dirNode);
          stack.push(dirNode);
        }
      });
    }
  }

  return root;
}

function isExisting(type, title, node) {
  let arr = [];
  if (type === "file") {
    arr = this.$store.getters.allQueries;
  } else if (type === "dir") {
    const result = node.children.filter(el => {
      if (el.title == title) return true;
    });
    if (result.length > 0) return true;
    return false;
  }
  const result = arr.filter(el => {
    if (el.title == title && node.title !== title) return true;
  });
  if (result.length > 0) return true;
  return false;
}

function filterExistingOne(arr) {}

export default {
  // TODO bring functions under $explorer
  install(Vue, options) {
    Vue.prototype.$createTree = createTree;
    Vue.prototype.$isExisting = isExisting;
  }
};

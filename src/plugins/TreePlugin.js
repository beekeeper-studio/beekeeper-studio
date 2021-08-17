class TreeNode {
  constructor(node, type = "dir", usage = "directory") {
    this.node = node;
    this.type = type;
    this.usage = usage;
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
          const fileNode = new TreeNode(file, "file", "query");
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

function isExisting(title, node, type) {
  const result = node.children.filter(el => {
    if (el.node.title == title && el.type === type) return el;
  });

  if (result.length > 0) return true;
  return false;
}

export default {
  // TODO bring functions under $explorer
  install(Vue, options) {
    Vue.prototype.$createTree = createTree;
    Vue.prototype.$isExisting = isExisting;
  }
};

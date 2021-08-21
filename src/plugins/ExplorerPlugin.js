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

function isFileOrDirExisting(title, node, type) {
  const result = node.children.filter(el => {
    if (el.node.title == title && el.type === type) return el;
  });

  if (result.length > 0) return true;
  return false;
}

function isWorkspaceExisting(title, store) {
  const workspaces = store.getters.allWorkspaces;

  const result = workspaces.filter(el => {
    if (el.title == title) return el;
  });

  if (result.length > 0) return true;
  return false;
}

function isExisting(type, title, node) {
  let result = null;
  const store = this.$store;

  switch (type) {
    case "file":
      result = isFileOrDirExisting(title, node, type);
      break;
    case "dir":
      result = isFileOrDirExisting(title, node, type);
      break;
    case "workspace":
      result = isWorkspaceExisting(title, store);
      break;
  }

  return result;
}

export default {
  // TODO bring functions under $explorer
  install(Vue, options) {
    Vue.prototype.$createTree = createTree;
    Vue.prototype.$isExisting = isExisting;
  }
};

const fs = require("fs");

const options = {};

class TreeNode {
  constructor(path) {
    this.path = path;
    this.children = [];
  }
}

export function buildTree(rootPath) {
  const root = new TreeNode(rootPath);
  const stack = [root];

  while (stack.length) {
    const currentNode = stack.pop();

    if (currentNode) {
      const children = fs.readdirSync(currentNode.path);

      children.forEach(file => {
        const childPath = `${currentNode.path}/${file}`;
        const childNode = new TreeNode(childPath);

        currentNode.children.push(childNode);

        if (fs.statSync(childNode.path).isDirectory()) {
          stack.push(childNode);
        }
      });
    }
  }

  return root;
}

function updateTree(path) {}

function deleteTreeNode(path) {}

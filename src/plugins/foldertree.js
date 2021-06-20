const fs = require("fs");
const path = require("path");

const defaultOptions = { include: ["*"] };
class TreeNode {
  constructor(path) {
    this.path = path;
    this.children = [];
    this.type = "";
  }
}

export function buildTree(rootPath, options = defaultOptions) {
  const finalOptions = { ...defaultOptions, ...options };
  const rootNode = new TreeNode(rootPath);
  rootNode.type = ".dir";
  const stack = [rootNode];
  while (stack.length) {
    const currentNode = stack.pop();

    if (currentNode) {
      const children = fs.readdirSync(currentNode.path);

      children.forEach(file => {
        const childPath = `${currentNode.path}/${file}`;
        const childNode = new TreeNode(childPath);

        if (finalOptions.include[0] === "*") {
          childNode.type = path.extname(file).toLowerCase();
          currentNode.children.push(childNode);
        } else {
          for (let extension of finalOptions.include) {
            if (path.extname(file).toLowerCase() === extension) {
              childNode.type = extension;
              currentNode.children.push(childNode);
            }
          }
        }

        if (fs.statSync(childNode.path).isDirectory()) {
          childNode.type = ".dir";
          stack.push(childNode);
        }
      });
    }
  }

  return rootNode;
}

export function updateTree(path) {}

export function deleteTreeNode(path) {}

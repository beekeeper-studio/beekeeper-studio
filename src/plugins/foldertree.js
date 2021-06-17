const fs = require("fs");
const path = require("path");

const defaultOptions = { include: ["*"], somethingelse: true };
class TreeNode {
  constructor(path) {
    this.path = path;
    this.children = [];
  }
}

export function buildTree(rootPath, options = defaultOptions) {
  const finalOptions = { ...defaultOptions, ...options };
  const root = new TreeNode(rootPath);
  const stack = [root];
  console.log(finalOptions);
  while (stack.length) {
    const currentNode = stack.pop();

    if (currentNode) {
      const children = fs.readdirSync(currentNode.path);

      children.forEach(file => {
        const childPath = `${currentNode.path}/${file}`;
        const childNode = new TreeNode(childPath);

        if (finalOptions.include[0] === "*") {
          currentNode.children.push(childNode);
        } else {
          for (let extension of finalOptions.include) {
            if (path.extname(file).toLowerCase() === extension) {
              currentNode.children.push(childNode);
            }
          }
        }

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

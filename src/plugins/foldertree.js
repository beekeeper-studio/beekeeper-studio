const fs = require("fs");
const path = require("path");

const defaultOptions = { include: [".query", ".design"] };
class TreeNode {
  constructor(path) {
    this.path = path;
    this.children = [];
    this.type = "";
    this.name = "";
  }
}

function buildTree(rootPath, options = defaultOptions) {
  const finalOptions = { ...defaultOptions, ...options };
  const rootNode = new TreeNode(rootPath);
  rootNode.type = ".dir";
  rootNode.name = extractName(rootNode.path);
  const stack = [rootNode];
  while (stack.length) {
    const currentNode = stack.pop();

    if (currentNode) {
      const children = fs.readdirSync(currentNode.path);
      children.forEach(file => {
        const childPath = `${currentNode.path}\\${file}`;
        const childNode = new TreeNode(childPath);

        if (finalOptions.include[0] === "*") {
          const extension = path.extname(file).toLowerCase();
          childNode.type = extension;
          childNode.name = extractName(childPath, extension);
          currentNode.children.push(childNode);
        } else {
          for (const extension of finalOptions.include) {
            const fileExtension = path.extname(file).toLowerCase();
            // "" means it is a directory
            if (fileExtension === extension || fileExtension === "") {
              childNode.type = extension;
              childNode.name = extractName(childNode.path);
              currentNode.children.push(childNode);
              break;
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

function updateTree(pathValue) {}

function deleteTreeNode(pathValue) {}

function extractName(pathValue) {
  const pathArr = pathValue.split("\\");
  const segment = pathArr[pathArr.length - 1];
  // const segment = pathArr[pathArr.length - 1].replace(extension, "");
  return segment;
}

module.exports = {
  buildTree,
  updateTree,
  deleteTreeNode
};

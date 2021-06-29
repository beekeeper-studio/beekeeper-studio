const fs = require("fs");
const path = require("path");

const defaultOptions = { include: ["query", "design"] };
class TreeNode {
  constructor(path) {
    this.path = path;
    this.type = "";
    this.name = "";
    this.children = [];
  }
}

function buildTree(rootPath, options = defaultOptions) {
  const finalOptions = { ...defaultOptions, ...options };
  const rootNode = new TreeNode(rootPath);
  rootNode.type = "dir";
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
            const fileExtension = path
              .extname(file)
              .toLowerCase()
              .slice(1);
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
          childNode.type = "dir";
          stack.push(childNode);
        }
      });
    }
  }

  return rootNode;
}

function updateTree(pathValue) {}

function deleteNode(pathValue) {}

function addNode(currentNode, node, type) {
  return new Promise((resolve, reject) => {
    switch (type) {
      case "dir":
        createDir(node).then(() => {
          currentNode.children.push(node);
          resolve();
        });

        break;

      case "file":
        createFile(node).then(() => {
          currentNode.children.push(node);
        });
        resolve();
        break;
    }
  });
}

function createFile(node) {
  return new Promise((resolve, reject) => {
    fs.writeFile(node.path, "", err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function createDir(node) {
  return new Promise((resolve, reject) => {
    fs.mkdir(node.path, err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function extractName(pathValue) {
  const pathArr = pathValue.split("\\");
  const segment = pathArr[pathArr.length - 1];
  return segment;
}

function nodeExist(node, name) {
  const exists = node.children.filter(element => {
    if (element.name === name) return element;
  });

  if (exists.length > 0) return true;
  return false;
}

module.exports = {
  buildTree,
  updateTree,
  deleteNode,
  addNode,
  TreeNode,
  nodeExist
};

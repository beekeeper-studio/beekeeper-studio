const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /import .+ from ['"](.+)['"]/g;
  let match;
  while (match = regex.exec(content)) {
    if (path.extname(match[1]) !== '.vue') {
      throw new Error(`Missing .vue extension in import statement in file ${filePath}`);
    }
  }
}

function traverseDirectory(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const filePath = path.join(directory, file);
    if (fs.statSync(filePath).isDirectory()) {
      traverseDirectory(filePath);
    } else if (path.extname(filePath) === '.js' || path.extname(filePath) === '.vue') {
      checkFile(filePath);
    }
  }
}

traverseDirectory('./src');
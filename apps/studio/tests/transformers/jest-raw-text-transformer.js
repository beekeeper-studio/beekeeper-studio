const fs = require("fs");

module.exports = {
  process: (src, filename) => ({
    code: `module.exports = ${JSON.stringify(
      fs.readFileSync(filename, "utf8")
    )};`,
  }),
};

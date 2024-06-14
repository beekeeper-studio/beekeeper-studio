const fs = require('fs');
const yaml = require('js-yaml');

module.exports = async(a, b, outputFile, {core}) => {
  const intelContent = a
  const armContent = b

  core.info("Intel content", a)
  core.info("ARM content", b)

  const mergeFiles = () => {
    const intelObject = yaml.load(intelContent);
    const armObject = yaml.load(armContent);

    const mergedObject = {
      ...intelObject,
    };

    mergedObject.files = [
      ...intelObject.files,
      ...armObject.files,
    ];

    const dumpOptions = {
      // avoids moving the sha512 checksum into its own line
      lineWidth: -1,
    };

    const mergedString = yaml.dump(mergedObject, dumpOptions);
    return mergedString;
  };

  const merge = mergeFiles();
  fs.writeFileSync(outputFile, merge);
}

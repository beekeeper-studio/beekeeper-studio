const cp = require('child_process')

function isEmpty(value) {
  return !value || !value.length
}

exports.default = async function (configuration) {

  const certificate = process.env.KV_WIN_CERTIFICATE;
  const keyvaultUrl = process.env.KEYVAULT_URL;

  // this way we don't have to sign EVERY build
  if(isEmpty(certificate) || isEmpty(keyvaultUrl)) {
    console.warn(`build/sign.js: Cannot sign exe, no KV_WIN_CERTIFICATE/KEYVAULT_URL provided for ${configuration.path}`);
    return null;
  }

  const timeserver = "http://timestamp.digicert.com"

  // Updated to use Azure managed identity authentication via azure/login action
  // This uses the token obtained from the azure/login step in the GitHub workflow
  // The -kvm flag enables managed identity authentication (uses Azure CLI credentials)
  const command = [
    'azuresigntool.exe sign -fd sha384',
    '-kvu', keyvaultUrl,
    '-kvm',  // Use managed identity / Azure CLI authentication
    '-kvc', certificate,
    "-tr", timeserver,
    '-td', 'sha384',
    '--max-degree-of-parallelism', '1',
    '-v'
  ]

  // throws an error if non-0 exit code, that's what we want.
  cp.execSync(
    `${command.join(" ")} "${configuration.path}"`,
    {
      stdio: "inherit"
    }
  );
};

const cp = require('child_process')

function isEmpty(value) {
  return !value || !value.length
}

exports.default = async function (configuration) {

  const certificate = process.env.KV_WIN_CERTIFICATE;
  const auth_raw = process.env.KEYVAULT_AUTH;
  // this way we don't have to sign EVERY build
  if(isEmpty(certificate) || isEmpty(auth_raw)) {
    console.warn(`build/sign.js: Cannot sign exe, no KV_WIN_CERTIFICATE/KEYVAULT_AUTH provided for ${configuration.path}`);
    return null;
  }

  const keyvault = JSON.parse(auth_raw)
  const timeserver = "http://timestamp.digicert.com"

  // This took me 2 weeks to figure out.
  // Hi there Matthew in 2026, hope this still works.
  const command = [
    'azuresigntool.exe sign -fd sha384',
    '-kvu', keyvault.url,
    '-kvi', keyvault.id,
    '-kvt', keyvault.tenant,
    '-kvs', keyvault.secret,
    '-kvc', certificate,
    "-tr", timeserver,
    '-td', 'sha384',
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
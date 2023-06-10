const cp = require('child_process')
exports.default = async function (configuration) {
  const keyvault = JSON.parse(process.env.KEYVAULT_AUTH)
  const certificate = process.env.KV_WIN_CERTIFICATE
  const timeserver = "http://timestamp.digicert.com"

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

  cp.execSync(
    `${command.join(" ")} ${configuration.path}`,
    {
      stdio: "inherit"
    }
  );
};
const cp = require('child_process')

function isEmpty(value) {
  return !value || !value.length
}

exports.default = async function (configuration) {

  // jsign --keystore: the KMS keyRing resource path
  // (projects/<project>/locations/<loc>/keyRings/<ring>)
  const keyring = process.env.GCP_KMS_KEYRING;
  // jsign --alias: the KMS key name, optionally with a /cryptoKeyVersions/<n> suffix
  const key = process.env.GCP_KMS_KEY;
  // jsign --certfile: KMS holds only the private key, so the public EV
  // certificate chain (PEM/P7B) must be supplied separately
  const certFile = process.env.WIN_CERT_FILE;
  const jsignJar = process.env.JSIGN_JAR || 'jsign.jar';

  // this way we don't have to sign EVERY build
  if (isEmpty(keyring) || isEmpty(key) || isEmpty(certFile)) {
    console.warn(`build/sign.js: Cannot sign exe, no GCP_KMS_KEYRING/GCP_KMS_KEY/WIN_CERT_FILE provided for ${configuration.path}`);
    return null;
  }

  // Sectigo's RFC3161 timestamp server with SHA-256, per their code signing docs.
  const timeserver = "http://timestamp.sectigo.com"

  // Mint a fresh GCP OAuth access token at sign time so it can't expire
  // mid-build. gcloud is provisioned by the setup-gcloud step in CI.
  const token = cp.execSync('gcloud auth print-access-token', {
    encoding: 'utf8'
  }).trim();

  // jsign signs via Google Cloud KMS (GOOGLECLOUD storetype). The private key
  // never leaves KMS; only the public certificate chain is read from --certfile.
  const command = [
    'java', '-jar', `"${jsignJar}"`,
    '--storetype', 'GOOGLECLOUD',
    '--storepass', `"${token}"`,
    '--keystore', keyring,
    '--alias', key,
    '--certfile', `"${certFile}"`,
    '--tsaurl', timeserver,
    '--tsmode', 'RFC3161',
    '--alg', 'SHA-256',
  ]

  // throws an error if non-0 exit code, that's what we want.
  cp.execSync(
    `${command.join(" ")} "${configuration.path}"`,
    {
      stdio: "inherit"
    }
  );
};

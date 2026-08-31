// Create the Kerberos principal as a user in the $external database. MongoDB maps an
// incoming GSSAPI principal (testuser@BKS.TEST) to a user of the same name in $external.
// Granted root so the integration test can list databases and read server status.
// Run via the localhost exception while no users exist yet (see entrypoint.sh).
const external = db.getSiblingDB("$external");
const principal = "testuser@BKS.TEST";

try {
  external.runCommand({
    createUser: principal,
    roles: [{ role: "root", db: "admin" }],
  });
  print(`Created $external user ${principal}`);
} catch (e) {
  // Idempotent on container restarts where the user already exists.
  print(`createUser(${principal}) failed (may already exist): ${e}`);
}

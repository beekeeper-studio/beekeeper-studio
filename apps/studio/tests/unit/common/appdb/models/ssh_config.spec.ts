import { Column, getMetadataArgsStorage } from "typeorm";
import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { SshConfig } from "@/common/appdb/models/SshConfig";
import { ConnectionSshConfig } from "@/common/appdb/models/ConnectionSshConfig";
import { SavedConnection } from "@/common/appdb/models/saved_connection";
import { AppDbHandlers } from "@/handlers/appDbHandlers";
import { EncryptTransformer } from "@/common/appdb/transformers/Transformers";
import { loadEncryptionKey } from "@/common/encryption_key";
import { SshMode } from "@/common/interfaces/IConnection";
import migration from "@/migration/20260519_ssh_config";

// Same key/transformer SshConfig uses, so encrypted secrets round-trip after
// the migration copies them byte-for-byte into ssh_config.
const encrypt = new EncryptTransformer(loadEncryptionKey());

type LegacyFields = Partial<{
  name: string;
  sshEnabled: boolean;
  sshHost: Nullable<string>;
  sshPort: Nullable<number>;
  sshMode: SshMode;
  sshUsername: Nullable<string>;
  sshKeyfile: Nullable<string>;
  sshPassword: Nullable<string>;
  sshKeyfilePassword: Nullable<string>;
  sshBastionHost: Nullable<string>;
  sshBastionHostPort: Nullable<number>;
  sshBastionMode: SshMode;
  sshBastionUsername: Nullable<string>;
  sshBastionKeyfile: Nullable<string>;
  sshBastionPassword: Nullable<string>;
  sshBastionKeyfilePassword: Nullable<string>;
}>;

function attachLegacySshColumns(): void {
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshHost");
  Column({ type: "integer", nullable: true })(SavedConnection.prototype, "sshPort");
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshMode");;
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshUsername");
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshKeyfile");
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshBastionHost");
  Column({ type: "integer", nullable: true })(SavedConnection.prototype, "sshBastionHostPort");;
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshBastionMode");;
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshBastionUsername");
  Column({ type: "varchar", nullable: true })(SavedConnection.prototype, "sshBastionKeyfile");;

  Column({ type: "varchar", nullable: true, transformer: [encrypt] })(SavedConnection.prototype, "sshPassword");
  Column({ type: "varchar", nullable: true, transformer: [encrypt] })(SavedConnection.prototype, "sshKeyfilePassword");;
  Column({ type: "varchar", nullable: true, transformer: [encrypt] })(SavedConnection.prototype, "sshBastionPassword");;
  Column({ type: "varchar", nullable: true, transformer: [encrypt] })(SavedConnection.prototype, "sshBastionKeyfilePassword");;
}

async function buildConnection(fields: LegacyFields): Promise<SavedConnection> {
  const c = new SavedConnection();
  c.connectionType = "mysql";
  c.host = "localhost";
  c.port = 3306;
  c.sshEnabled = true;
  Object.assign(c, fields);
  await c.save();
  return c;
}

async function runMigration() {
  const runner = TestOrmConnection.connection.connection.createQueryRunner();
  try {
    await migration.run(runner);
  } finally {
    await runner.release();
  }
}

describe("ssh_config migration: legacy column backfill", () => {
  beforeAll(() => {
    attachLegacySshColumns();
  });

  beforeEach(async () => {
    await TestOrmConnection.connect();
  });

  afterEach(async () => {
    await TestOrmConnection.disconnect();
  });

  it("migrates ssh host in all three modes", async () => {
    const auto = await buildConnection({
      name: "ssh-auto",
      sshHost: "hostname",
      sshPort: 123,
      sshMode: "agent" as const,
      sshUsername: "sshuser",
    });
    const keyfile = await buildConnection({
      name: "ssh-keyfile",
      sshHost: "host",
      sshPort: 123,
      sshMode: "keyfile" as const,
      sshUsername: "sshuser",
      sshKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshKeyfilePassword: "keyfile-secret",
    });
    const userpass = await buildConnection({
      name: "userpass",
      sshHost: "host",
      sshPort: 123,
      sshMode: "userpass" as const,
      sshUsername: "sshuser",
      sshPassword: "ssh-secret",
    });

    await runMigration();

    const autoJoin = await ConnectionSshConfig.findBy({
      connectionId: auto.id,
    });
    const keyfileJoin = await ConnectionSshConfig.findBy({
      connectionId: keyfile.id,
    });
    const userpassJoin = await ConnectionSshConfig.findBy({
      connectionId: userpass.id,
    });

    expect(autoJoin[0].sshConfig).toMatchObject({
      host: "hostname",
      port: 123,
      mode: "agent",
      username: "sshuser",
      keyfile: null,
      keyfilePassword: null,
      password: null,
    });
    expect(keyfileJoin[0].sshConfig).toMatchObject({
      host: "host",
      port: 123,
      mode: "keyfile",
      username: "sshuser",
      keyfile: "/Users/azmy60/.ssh/pc_key.pub",
      keyfilePassword: "keyfile-secret",
      password: null,
    });
    expect(userpassJoin[0].sshConfig).toMatchObject({
      host: "host",
      port: 123,
      mode: "userpass",
      username: "sshuser",
      keyfile: null,
      keyfilePassword: null,
      password: "ssh-secret",
    });
  });

  it("migrates bastion host in all three modes", async () => {
    const auto = await buildConnection({
      name: "bastion-auto",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "agent" as const,
      sshBastionUsername: "bastionuser",
    });
    const keyfile = await buildConnection({
      name: "bastion-keyfile",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "keyfile" as const,
      sshBastionUsername: "bastionuser",
      sshBastionKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshBastionKeyfilePassword: "bastion-keyfile-secret",
    });
    const userpass = await buildConnection({
      name: "bastion-userpass",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "userpass" as const,
      sshBastionUsername: "bastionuser",
      sshBastionPassword: "bastion-secret",
    });

    await runMigration();

    const autoJoin = await ConnectionSshConfig.findBy({
      connectionId: auto.id,
    });
    const keyfileJoin = await ConnectionSshConfig.findBy({
      connectionId: keyfile.id,
    });
    const userpassJoin = await ConnectionSshConfig.findBy({
      connectionId: userpass.id,
    });

    expect(autoJoin[0].sshConfig).toMatchObject({
      host: "bastionhost",
      port: 123,
      mode: "agent",
      username: "bastionuser",
      keyfile: null,
      keyfilePassword: null,
      password: null,
    });
    expect(keyfileJoin[0].sshConfig).toMatchObject({
      host: "bastionhost",
      port: 123,
      mode: "keyfile",
      username: "bastionuser",
      keyfile: "/Users/azmy60/.ssh/pc_key.pub",
      keyfilePassword: "bastion-keyfile-secret",
      password: null,
    });
    expect(userpassJoin[0].sshConfig).toMatchObject({
      host: "bastionhost",
      port: 123,
      mode: "userpass",
      username: "bastionuser",
      keyfile: null,
      keyfilePassword: null,
      password: "bastion-secret",
    });
  });

  it("migrates all six legacy rows in a single pass", async () => {
    await buildConnection({
      name: "ssh-auto",
      sshHost: "hostname",
      sshPort: 123,
      sshMode: "agent",
      sshUsername: "sshuser",
    });
    await buildConnection({
      name: "ssh-keyfile",
      sshHost: "host",
      sshPort: 123,
      sshMode: "keyfile",
      sshUsername: "sshuser",
      sshKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshKeyfilePassword: "k1",
    });
    await buildConnection({
      name: "ssh-userpass",
      sshHost: "host",
      sshPort: 123,
      sshMode: "userpass",
      sshUsername: "sshuser",
      sshPassword: "p1",
    });
    await buildConnection({
      name: "bastion-auto",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "agent",
      sshBastionUsername: "bastionuser",
    });
    await buildConnection({
      name: "bastion-keyfile",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "keyfile",
      sshBastionUsername: "bastionuser",
      sshBastionKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshBastionKeyfilePassword: "k2",
    });
    await buildConnection({
      name: "bastion-userpass",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "userpass",
      sshBastionUsername: "bastionuser",
      sshBastionPassword: "p2",
    });

    await runMigration();

    await expect(ConnectionSshConfig.count()).resolves.toBe(6);
    await expect(SshConfig.count()).resolves.toBe(6);
  });

  it("is idempotent — re-running does not duplicate configs", async () => {
    await buildConnection({
      name: "ssh-auto",
      sshHost: "hostname",
      sshPort: 123,
      sshMode: "agent",
      sshUsername: "sshuser",
    });

    await runMigration();
    await runMigration();

    expect(await ConnectionSshConfig.count()).toBe(1);
    expect(await SshConfig.count()).toBe(1);
  });

  it("skips connections where ssh is disabled", async () => {
    await buildConnection({
      name: "no-ssh",
      sshEnabled: false,
      sshHost: "should-not-migrate",
      sshMode: "agent",
    });

    await runMigration();

    expect(await ConnectionSshConfig.count()).toBe(0);
    expect(await SshConfig.count()).toBe(0);
  });

  it("creates bastion at position 0 and host at position 1 when both are set", async () => {
    const conn = await buildConnection({
      name: "both",
      sshHost: "host",
      sshPort: 22,
      sshMode: "agent",
      sshUsername: "sshuser",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 2222,
      sshBastionMode: "agent",
      sshBastionUsername: "bastionuser",
    });

    await runMigration();

    const links = await ConnectionSshConfig.findBy({ connectionId: conn.id });

    links.sort((a, b) => a.position - b.position);

    expect(links).toHaveLength(2);
    expect(links[0].sshConfig.host).toBe("bastionhost");
    expect(links[0].sshConfig.port).toBe(2222);
    expect(links[1].sshConfig.host).toBe("host");
    expect(links[1].sshConfig.port).toBe(22);
  });

  it("migrates both a userpass bastion and a keyfile host on the same connection", async () => {
    const conn = await buildConnection({
      name: "both-with-creds",
      sshHost: "host",
      sshPort: 22,
      sshMode: "keyfile",
      sshUsername: "sshuser",
      sshKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshKeyfilePassword: "host-keyfile-secret",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 2222,
      sshBastionMode: "userpass",
      sshBastionUsername: "bastionuser",
      sshBastionPassword: "bastion-secret",
    });

    await runMigration();

    const links = await ConnectionSshConfig.findBy({ connectionId: conn.id });
    links.sort((a, b) => a.position - b.position);

    expect(links).toHaveLength(2);
    expect(links[0].position).toBe(0);
    expect(links[1].position).toBe(1);
    expect(links[0].sshConfig).toMatchObject({
      host: "bastionhost",
      port: 2222,
      mode: "userpass",
      username: "bastionuser",
      password: "bastion-secret",
      keyfile: null,
      keyfilePassword: null,
    });
    expect(links[1].sshConfig).toMatchObject({
      host: "host",
      port: 22,
      mode: "keyfile",
      username: "sshuser",
      keyfile: "/Users/azmy60/.ssh/pc_key.pub",
      keyfilePassword: "host-keyfile-secret",
      password: null,
    });
  });
});

describe("SshConfig orphan cleanup", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
    await runMigration();
  });

  afterEach(async () => {
    await TestOrmConnection.disconnect();
  });

  it("deletes an orphaned sshConfig when it is removed from the connection", async () => {
    const ssh = new SshConfig();
    ssh.withProps({
      host: "bastion.example.com",
      port: 22,
      mode: "userpass",
      username: "tunnel-user",
      password: "s3cr3t",
    });
    await ssh.save();

    const conn = await buildConnection({ name: "Test Connection" });

    const link = new ConnectionSshConfig();
    link.withProps({ connectionId: conn.id, sshConfigId: ssh.id });
    await link.save();

    await expect(SavedConnection.count()).resolves.toBe(1);
    await expect(SshConfig.count()).resolves.toBe(1);
    await expect(ConnectionSshConfig.count()).resolves.toBe(1);

    await AppDbHandlers["appdb/saved/remove"]({ obj: { conn } });

    await expect(SavedConnection.count()).resolves.toBe(0);
    await expect(SshConfig.count()).resolves.toBe(0);
    await expect(ConnectionSshConfig.count()).resolves.toBe(0);
  });
});

describe("sshStoreKeyfilePassword flag", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
  });

  afterEach(async () => {
    await TestOrmConnection.disconnect();
  });

  it("clears keyfilePassword on sshConfigs when set to false on save", async () => {
    const ssh = new SshConfig();
    ssh.withProps({
      host: "h",
      port: 22,
      mode: "keyfile",
      username: "u",
      keyfile: "/path/to/key",
      keyfilePassword: "secret",
    });
    await ssh.save();

    const conn = await buildConnection({ name: "store-flag" });

    const link = new ConnectionSshConfig();
    link.withProps({ connectionId: conn.id, sshConfigId: ssh.id });
    await link.save();

    const reloaded = await SavedConnection.findOneBy({ id: conn.id });
    expect(reloaded.sshConfigs[0].sshConfig.keyfilePassword).toBe("secret");

    reloaded.sshStoreKeyfilePassword = false;
    await reloaded.save();

    const final = await SshConfig.findOneBy({ id: ssh.id });
    expect(final.keyfilePassword).toBeNull();
  });
});

import { TestOrmConnection } from "@tests/lib/TestOrmConnection";
import { SshConfig } from "@/common/appdb/models/SshConfig";
import { ConnectionSshConfig } from "@/common/appdb/models/ConnectionSshConfig";
import { SavedConnection } from "@/common/appdb/models/saved_connection";

type LegacyFields = Partial<{
  name: string;
  sshEnabled: boolean;
  sshHost: Nullable<string>;
  sshPort: Nullable<number>;
  sshMode: SavedConnection["sshMode"];
  sshUsername: Nullable<string>;
  sshKeyfile: Nullable<string>;
  sshPassword: Nullable<string>;
  sshKeyfilePassword: Nullable<string>;
  sshBastionHost: Nullable<string>;
  sshBastionHostPort: Nullable<number>;
  sshBastionMode: SavedConnection["sshBastionMode"];
  sshBastionUsername: Nullable<string>;
  sshBastionKeyfile: Nullable<string>;
  sshBastionPassword: Nullable<string>;
  sshBastionKeyfilePassword: Nullable<string>;
}>;

async function buildLegacyConnection(
  fields: LegacyFields
): Promise<SavedConnection> {
  const c = new SavedConnection();
  c.connectionType = "mysql";
  c.host = "localhost";
  c.port = 3306;
  c.sshEnabled = true;
  Object.assign(c, fields);
  await c.save();
  return c;
}

describe("SshConfig.migrateLegacyColumns", () => {
  beforeEach(async () => {
    await TestOrmConnection.connect();
  });

  afterEach(async () => {
    await TestOrmConnection.disconnect();
  });

  it("migrates ssh host in all three modes", async () => {
    const auto = await buildLegacyConnection({
      name: "ssh-auto",
      sshHost: "hostname",
      sshPort: 123,
      sshMode: "agent" as const,
      sshUsername: "sshuser",
    });
    const keyfile = await buildLegacyConnection({
      name: "ssh-keyfile",
      sshHost: "host",
      sshPort: 123,
      sshMode: "keyfile" as const,
      sshUsername: "sshuser",
      sshKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshKeyfilePassword: "keyfile-secret",
    });
    const userpass = await buildLegacyConnection({
      name: "userpass",
      sshHost: "host",
      sshPort: 123,
      sshMode: "userpass" as const,
      sshUsername: "sshuser",
      sshPassword: "ssh-secret",
    });

    await SshConfig.migrateLegacyColumns();

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
    const auto = await buildLegacyConnection({
      name: "bastion-auto",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "agent" as const,
      sshBastionUsername: "bastionuser",
    });
    const keyfile = await buildLegacyConnection({
      name: "bastion-keyfile",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "keyfile" as const,
      sshBastionUsername: "bastionuser",
      sshBastionKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshBastionKeyfilePassword: "bastion-keyfile-secret",
    });
    const userpass = await buildLegacyConnection({
      name: "bastion-userpass",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "userpass" as const,
      sshBastionUsername: "bastionuser",
      sshBastionPassword: "bastion-secret",
    });

    await SshConfig.migrateLegacyColumns();

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
    await buildLegacyConnection({
      name: "ssh-auto",
      sshHost: "hostname",
      sshPort: 123,
      sshMode: "agent",
      sshUsername: "sshuser",
    });
    await buildLegacyConnection({
      name: "ssh-keyfile",
      sshHost: "host",
      sshPort: 123,
      sshMode: "keyfile",
      sshUsername: "sshuser",
      sshKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshKeyfilePassword: "k1",
    });
    await buildLegacyConnection({
      name: "ssh-userpass",
      sshHost: "host",
      sshPort: 123,
      sshMode: "userpass",
      sshUsername: "sshuser",
      sshPassword: "p1",
    });
    await buildLegacyConnection({
      name: "bastion-auto",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "agent",
      sshBastionUsername: "bastionuser",
    });
    await buildLegacyConnection({
      name: "bastion-keyfile",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "keyfile",
      sshBastionUsername: "bastionuser",
      sshBastionKeyfile: "/Users/azmy60/.ssh/pc_key.pub",
      sshBastionKeyfilePassword: "k2",
    });
    await buildLegacyConnection({
      name: "bastion-userpass",
      sshBastionHost: "bastionhost",
      sshBastionHostPort: 123,
      sshBastionMode: "userpass",
      sshBastionUsername: "bastionuser",
      sshBastionPassword: "p2",
    });

    await SshConfig.migrateLegacyColumns();

    await expect(ConnectionSshConfig.count()).resolves.toBe(6);
    await expect(SshConfig.count()).resolves.toBe(6);
  });

  it("is idempotent — re-running does not duplicate configs", async () => {
    await buildLegacyConnection({
      name: "ssh-auto",
      sshHost: "hostname",
      sshPort: 123,
      sshMode: "agent",
      sshUsername: "sshuser",
    });

    await SshConfig.migrateLegacyColumns();
    await SshConfig.migrateLegacyColumns();

    expect(await ConnectionSshConfig.count()).toBe(1);
    expect(await SshConfig.count()).toBe(1);
  });

  it("skips connections where ssh is disabled", async () => {
    const c = new SavedConnection();
    c.connectionType = "mysql";
    c.host = "localhost";
    c.port = 3306;
    c.name = "no-ssh";
    c.sshEnabled = false;
    c.sshHost = "should-not-migrate";
    c.sshMode = "agent";
    await c.save();

    await SshConfig.migrateLegacyColumns();

    expect(await ConnectionSshConfig.count()).toBe(0);
    expect(await SshConfig.count()).toBe(0);
  });

  it("creates bastion at position 0 and host at position 1 when both are set", async () => {
    const conn = await buildLegacyConnection({
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

    await SshConfig.migrateLegacyColumns();

    const links = await ConnectionSshConfig.findBy({ connectionId: conn.id });

    links.sort((a, b) => a.position - b.position);

    expect(links).toHaveLength(2);
    expect(links[0].sshConfig.host).toBe("bastionhost");
    expect(links[0].sshConfig.port).toBe(2222);
    expect(links[1].sshConfig.host).toBe("host");
    expect(links[1].sshConfig.port).toBe(22);
  });

  it("migrates both a userpass bastion and a keyfile host on the same connection", async () => {
    const conn = await buildLegacyConnection({
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

    await SshConfig.migrateLegacyColumns();

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

import { HanaClient } from "@commercial/backend/lib/db/clients/hana";
import { HanaChangeBuilder } from "@shared/lib/sql/change_builder/HanaChangeBuilder";
import { HanaAuthType, IDbConnectionServerConfig } from "@/lib/db/types";
import { IDbConnectionServer } from "@/lib/db/backendTypes";

function buildClient(configOverrides: Partial<IDbConnectionServerConfig> = {}): HanaClient {
  const config = {
    client: 'hana',
    host: 'myhost',
    port: 30015,
    user: 'SYSTEM',
    password: 'secret',
    ssh: null,
    ssl: false,
    sslRejectUnauthorized: true,
    readOnlyMode: false,
    ...configOverrides,
  } as IDbConnectionServerConfig;
  const server = { config } as IDbConnectionServer;
  return new HanaClient(server, { database: 'HXE', connected: false, connecting: false, namespace: null });
}

describe("HanaClient (offline)", () => {
  describe("identifier wrapping", () => {
    it("double-quotes identifiers and escapes embedded quotes", () => {
      const client = buildClient();
      expect(client.wrapIdentifier('people')).toBe('"people"');
      expect(client.wrapIdentifier('we"ird')).toBe('"we""ird"');
    });
  });

  describe("selectTopSql", () => {
    it("generates LIMIT/OFFSET pagination", async () => {
      const client = buildClient();
      const sql = await client.selectTopSql('people', 20, 10, [], [], 'BKTEST');
      expect(sql).toContain('LIMIT 10 OFFSET 20');
      expect(sql).toContain('"BKTEST"."people"');
    });

    it("adds a LIMIT when only an offset is given", async () => {
      const client = buildClient();
      const sql = await client.selectTopSql('people', 5, null, [], [], 'BKTEST');
      expect(sql).toMatch(/LIMIT \d+ OFFSET 5/);
    });

    it("renders order by, filters and selected columns", async () => {
      const client = buildClient();
      const sql = await client.selectTopSql(
        'people', 0, 10,
        [{ field: 'name', dir: 'DESC' }],
        [{ field: 'city', type: '=', value: "O'Brien" }],
        'BKTEST',
        ['name', 'city']
      );
      expect(sql).toContain('"name", "city"');
      expect(sql).toContain('ORDER BY "name" DESC');
      expect(sql).toContain(`WHERE "city" = 'O''Brien'`);
    });

    it("passes * through unquoted", async () => {
      const client = buildClient();
      const sql = await client.selectTopSql('people', 0, 10, [], [], 'BKTEST', ['*']);
      expect(sql).toContain('SELECT *');
    });

    it("rejects filter operators outside the allow-list", async () => {
      const client = buildClient();
      await expect(client.selectTopSql(
        'people', 0, 10, [],
        [{ field: 'city', type: '= 1 OR 1' as any, value: 'x' }],
        'BKTEST'
      )).rejects.toThrow(/Unsupported filter type/);
    });

    it("rejects non-numeric limits", async () => {
      const client = buildClient();
      await expect(client.getQuerySelectTop('people', '1; DROP TABLE x' as any, 'BKTEST'))
        .rejects.toThrow(/non-negative number/);
    });
  });

  describe("configDatabase", () => {
    it("maps password auth and plain connections", () => {
      const client = buildClient();
      const config = (client as any).configDatabase((client as any).server, (client as any).database);
      expect(config).toMatchObject({
        host: 'myhost',
        port: 30015,
        uid: 'SYSTEM',
        pwd: 'secret',
        encrypt: 'false',
        databaseName: 'HXE',
      });
    });

    it("puts JWT and SAML tokens in the password field with an empty uid", () => {
      const client = buildClient({
        hanaOptions: { authMethod: HanaAuthType.Jwt, token: 'my-token' },
      });
      const config = (client as any).configDatabase((client as any).server, (client as any).database);
      expect(config.uid).toBe('');
      expect(config.pwd).toBe('my-token');
    });

    it("maps X.509 auth and forces encryption", () => {
      const client = buildClient({
        hanaOptions: {
          authMethod: HanaAuthType.X509,
          x509CertPath: '/certs/client.pem',
          x509CertPassword: 'keypass',
        },
      });
      const config = (client as any).configDatabase((client as any).server, (client as any).database);
      expect(config.authenticationX509).toBe('/certs/client.pem');
      expect(config.authenticationX509Password).toBe('keypass');
      expect(config.uid).toBeUndefined();
      expect(config.encrypt).toBe('true');
    });

    it("maps the common SSL options to driver properties", () => {
      const client = buildClient({
        ssl: true,
        sslRejectUnauthorized: false,
        sslCaFile: '/certs/ca.pem',
      });
      const config = (client as any).configDatabase((client as any).server, (client as any).database);
      expect(config.encrypt).toBe('true');
      expect(config.sslValidateCertificate).toBe('false');
      expect(config.sslTrustStore).toBe('/certs/ca.pem');
    });

    it("uses the SSH tunnel address when SSH is configured", () => {
      const client = buildClient({
        ssh: {} as any,
        localHost: '127.0.0.1',
        localPort: 12345,
      });
      const config = (client as any).configDatabase((client as any).server, (client as any).database);
      expect(config.host).toBe('127.0.0.1');
      expect(config.port).toBe(12345);
    });
  });
});

describe("HanaChangeBuilder", () => {
  const builder = new HanaChangeBuilder('people', 'BKTEST');

  it("generates HANA ADD column syntax", () => {
    const sql = builder.addColumn({ columnName: 'age', dataType: 'INTEGER', nullable: true });
    expect(sql).toBe('ADD ("age" INTEGER NULL)');
  });

  it("generates HANA ALTER column type syntax", () => {
    expect(builder.alterType('age', 'BIGINT')).toBe('ALTER ("age" BIGINT)');
  });

  it("rejects nullability and default alters (stage one)", () => {
    expect(() => builder.alterNullable('age', false)).toThrow();
    expect(() => builder.alterDefault('age', "'n/a'")).toThrow();
  });

  it("renames columns through a standalone statement", () => {
    expect(builder.renameColumn('name', 'full_name'))
      .toBe('RENAME COLUMN "BKTEST"."people"."name" TO "full_name"');
  });

  it("escapes comments", () => {
    expect(builder.setComment('name', "it's a name"))
      .toBe(`COMMENT ON COLUMN "BKTEST"."people"."name" IS 'it''s a name'`);
  });
});

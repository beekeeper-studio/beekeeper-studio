import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
// Mock oracledb before any imports that use it
const { mockInitOracleClient, mockCreatePool, mockGetStandaloneConnection } = vi.hoisted(() => ({
  mockInitOracleClient: vi.fn(),
  mockCreatePool: vi.fn(),
  mockGetStandaloneConnection: vi.fn(),
}));

vi.mock('oracledb', () => {
  return {
    __esModule: true,
    default: {
      CLOB: 2017,
      BLOB: 2019,
      SYSDBA: 2,
      SYSOPER: 4,
      thin: true,
      fetchAsString: [],
      fetchAsBuffer: [],
      initOracleClient: mockInitOracleClient,
      createPool: mockCreatePool,
      getConnection: mockGetStandaloneConnection,
    },
  };
});

import fs from 'fs';
import oracledb from 'oracledb';
import { OracleClient, _resetOracleStateForTesting, splitOracleConnectionString } from '@commercial/backend/lib/db/clients/oracle';

function buildServer(overrides: Record<string, any> = {}) {
  return {
    config: {
      host: 'localhost',
      port: 1521,
      user: 'testuser',
      password: 'testpass',
      serviceName: 'ORCL',
      ssl: false,
      instantClientLocation: '/fake/client/path',
      oracleConfigLocation: '/fake/config/path',
      options: {},
      ...overrides,
    },
  } as any;
}

function buildDatabase() {
  return { database: 'testdb', connecting: false, connected: false } as any;
}

describe('OracleClient connection error handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetOracleStateForTesting();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject with a clear error when instantClientLocation does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('Oracle Instant Client directory does not exist');
    expect(mockInitOracleClient).not.toHaveBeenCalled();
  });

  it('should reject with a clear error when oracleConfigLocation does not exist', async () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      return !String(p).includes('config');
    });

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('Oracle configuration directory does not exist');
    expect(mockInitOracleClient).not.toHaveBeenCalled();
  });

  it('should return the real error when initOracleClient throws', async () => {
    mockInitOracleClient.mockImplementation(() => {
      throw new Error('DPI-1047: Cannot locate a 64-bit Oracle Client library');
    });

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('Failed to initialize Oracle client: DPI-1047');
    expect(mockInitOracleClient).toHaveBeenCalledTimes(1);
    expect(mockInitOracleClient).toHaveBeenCalledWith({
      libDir: '/fake/client/path',
      configDir: '/fake/config/path',
    });
  });

  it('should not call initOracleClient again after a failed first attempt', async () => {
    // First connect: initOracleClient throws
    mockInitOracleClient.mockImplementation(() => {
      throw new Error('ORA-28759: failure to open file');
    });

    const client1 = new OracleClient(buildServer(), buildDatabase());
    await expect(client1.connect()).rejects.toThrow('ORA-28759');
    expect(mockInitOracleClient).toHaveBeenCalledTimes(1);

    // Second connect: same process, oracleInitialized is now true
    mockInitOracleClient.mockClear();
    mockCreatePool.mockRejectedValue(new Error('ORA-28759: failure to open file'));

    const client2 = new OracleClient(buildServer(), buildDatabase());
    await expect(client2.connect()).rejects.toThrow('ORA-28759');
    expect(mockInitOracleClient).not.toHaveBeenCalled();
  });

  it('should return the real error when createPool throws', async () => {
    mockInitOracleClient.mockImplementation(() => {});
    mockCreatePool.mockRejectedValue(new Error('ORA-12154: TNS:could not resolve the connect identifier specified'));

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('ORA-12154');
  });

  it('should tell user to restart when config directory changes after init', async () => {
    // First connect succeeds
    mockInitOracleClient.mockImplementation(() => {});
    mockCreatePool.mockResolvedValue({});

    const client1 = new OracleClient(buildServer(), buildDatabase());
    client1.driverExecuteSimple = vi.fn().mockResolvedValue([{ BANNER: 'Oracle 19c' }]);
    await client1.connect();

    // Second connect with different config dir
    const client2 = new OracleClient(
      buildServer({ oracleConfigLocation: '/different/config/path' }),
      buildDatabase()
    );
    await expect(client2.connect()).rejects.toThrow('Please restart Beekeeper Studio');
  });

  it('should return the real error when createPool rejects in thin mode', async () => {
    mockCreatePool.mockRejectedValue(new Error('NJS-510: connections to this database server version are not supported'));

    const server = buildServer({
      instantClientLocation: null,
      options: {
        connectionMethod: 'connectionString',
        connectionString: 'bad_connection_string',
      },
    });
    const client = new OracleClient(server, buildDatabase());
    await expect(client.connect()).rejects.toThrow('NJS-510');
  });
});

describe('OracleClient role (privilege)', () => {
  const mockGetConnection = vi.fn()

  beforeEach(() => {
    vi.resetAllMocks();
    _resetOracleStateForTesting();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mockCreatePool.mockResolvedValue({ getConnection: mockGetConnection });
  });

  afterEach(() => {
    (oracledb as any).thin = true;
    vi.restoreAllMocks();
  });

  async function connect(overrides: Record<string, any>) {
    const client = new OracleClient(buildServer(overrides), buildDatabase());
    client['driverExecuteSimple'] = vi.fn().mockResolvedValue([{ BANNER: 'Oracle 19c' }]);
    await client.connect();
    return client;
  }

  it('does not set a privilege by default', async () => {
    const client = await connect({ instantClientLocation: null });
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig).not.toHaveProperty('privilege');
    expect(poolConfig.user).toBe('testuser');

    await client.getPoolConnection();
    expect(mockGetConnection).toHaveBeenCalledWith();
  });

  it('passes the privilege to the pool in thin mode', async () => {
    const client = await connect({
      instantClientLocation: null,
      options: { privilege: 'SYSDBA' },
    });
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig.privilege).toBe(oracledb.SYSDBA);
    expect(poolConfig.user).toBe('testuser');
    expect(poolConfig.password).toBe('testpass');

    await client.getPoolConnection();
    expect(mockGetConnection).toHaveBeenCalledWith();
  });

  it('uses a heterogeneous pool for SYSDBA in thick mode', async () => {
    (oracledb as any).thin = false;
    const client = await connect({ options: { privilege: 'SYSDBA' } });
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig.homogeneous).toBe(false);
    expect(poolConfig.poolMin).toBe(0);
    expect(poolConfig).not.toHaveProperty('user');
    expect(poolConfig).not.toHaveProperty('password');
    expect(poolConfig).not.toHaveProperty('privilege');

    await client.getPoolConnection();
    expect(mockGetConnection).toHaveBeenCalledWith({
      user: 'testuser',
      password: 'testpass',
      privilege: oracledb.SYSDBA,
    });
  });

  it('uses standalone connections for SYSOPER in thick mode', async () => {
    (oracledb as any).thin = false;
    const client = await connect({ options: { privilege: 'SYSOPER' } });
    expect(mockCreatePool).not.toHaveBeenCalled();

    await client.getPoolConnection();
    expect(mockGetStandaloneConnection).toHaveBeenCalledWith({
      user: 'testuser',
      password: 'testpass',
      connectString: 'localhost:1521/ORCL',
      privilege: oracledb.SYSOPER,
    });
  });

  it('applies the privilege to connection string connections', async () => {
    await connect({
      instantClientLocation: null,
      options: {
        connectionMethod: 'connectionString',
        connectionString: 'localhost/ORCL',
        privilege: 'SYSDBA',
      },
    });
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig.connectString).toBe('localhost/ORCL');
    expect(poolConfig.privilege).toBe(oracledb.SYSDBA);
  });

  it('rejects an unknown role', async () => {
    const client = new OracleClient(
      buildServer({ instantClientLocation: null, options: { privilege: 'SYSFOO' } }),
      buildDatabase()
    );
    await expect(client.connect()).rejects.toThrow('Unknown Oracle role: SYSFOO');
    expect(mockCreatePool).not.toHaveBeenCalled();
  });
});

describe('OracleClient.parseForeignKeys', () => {
  it('reads the upper-case column names Oracle returns', () => {
    const client = new OracleClient(buildServer(), buildDatabase());
    const keys = client['parseForeignKeys']([
      {
        CONSTRAINT_NAME: 'ORDERS_CUSTOMER_FK',
        FROM_SCHEMA: 'SHOP',
        FROM_TABLE: 'ORDERS',
        FROM_COLUMN: 'CUSTOMER_ID',
        TO_SCHEMA: 'SHOP',
        TO_TABLE: 'CUSTOMERS',
        TO_COLUMN: 'ID',
        ORDINAL_POSITION: 1,
        ON_DELETE: 'CASCADE',
      },
    ]);

    expect(keys).toEqual([
      {
        constraintName: 'ORDERS_CUSTOMER_FK',
        fromSchema: 'SHOP',
        fromTable: 'ORDERS',
        fromColumn: 'CUSTOMER_ID',
        toSchema: 'SHOP',
        toTable: 'CUSTOMERS',
        toColumn: 'ID',
        onUpdate: undefined,
        onDelete: 'CASCADE',
        isComposite: false,
      },
    ]);
  });
});

describe('OracleClient connect string', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetOracleStateForTesting();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mockCreatePool.mockResolvedValue({ getConnection: vi.fn() });
  });

  afterEach(() => {
    (oracledb as any).thin = true;
    vi.restoreAllMocks();
  });

  async function connect(overrides: Record<string, any>) {
    const client = new OracleClient(buildServer({ instantClientLocation: null, ...overrides }), buildDatabase());
    client['driverExecuteSimple'] = vi.fn().mockResolvedValue([{ BANNER: 'Oracle 19c' }]);
    await client.connect();
    return client;
  }

  it('builds host:port/service in manual mode', async () => {
    await connect({});
    expect(mockCreatePool.mock.calls[0][0].connectString).toBe('localhost:1521/ORCL');
  });

  // A blank Service Name used to be interpolated as-is, so the listener was asked for a
  // service literally called "null" (NJS-518: Service "null" is not registered).
  it.each([null, undefined, '', '   '])('leaves the service off the connect string when Service Name is %j', async (serviceName) => {
    await connect({ serviceName });
    expect(mockCreatePool.mock.calls[0][0].connectString).toBe('localhost:1521');
  });

  it('trims the service name', async () => {
    await connect({ serviceName: ' ORCL ', ssl: true });
    expect(mockCreatePool.mock.calls[0][0].connectString).toBe('tcps://localhost:1521/ORCL');
  });
});

describe('OracleClient connection string credentials', () => {
  const connectionString = (value: string) => ({ connectionMethod: 'connectionString', connectionString: value });

  beforeEach(() => {
    vi.resetAllMocks();
    _resetOracleStateForTesting();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mockCreatePool.mockResolvedValue({ getConnection: vi.fn() });
  });

  afterEach(() => {
    (oracledb as any).thin = true;
    vi.restoreAllMocks();
  });

  function build(overrides: Record<string, any>) {
    const client = new OracleClient(buildServer({ instantClientLocation: null, ...overrides }), buildDatabase());
    client['driverExecuteSimple'] = vi.fn().mockResolvedValue([{ BANNER: 'Oracle 19c' }]);
    return client;
  }

  it('passes the User and Password fields through', async () => {
    await build({ options: connectionString('dbhost:1521/ORCL') }).connect();
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig).toMatchObject({ user: 'testuser', password: 'testpass', connectString: 'dbhost:1521/ORCL' });
    expect(poolConfig).not.toHaveProperty('externalAuth');
  });

  // node-oracledb does not read credentials out of the connect string, so the SQL*Plus
  // form failed with NJS-101: no credentials specified.
  it('reads user/password@ off the front of the connection string when the fields are blank', async () => {
    const client = build({ user: null, password: null, options: connectionString(' scott/"t1g@r"@dbhost:1521/ORCL\n') });
    await client.connect();
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig).toMatchObject({ user: 'scott', password: 't1g@r', connectString: 'dbhost:1521/ORCL' });
    expect(await client.defaultSchema()).toBe('SCOTT');
  });

  it('prefers the User and Password fields over credentials in the connection string', async () => {
    await build({ options: connectionString('scott/tiger@dbhost:1521/ORCL') }).connect();
    expect(mockCreatePool.mock.calls[0][0]).toMatchObject({
      user: 'testuser', password: 'testpass', connectString: 'dbhost:1521/ORCL',
    });
  });

  it('does not mistake a descriptor or URL for credentials', async () => {
    const descriptor = '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=dbhost)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=a/b@c)))';
    await build({ options: connectionString(descriptor) }).connect();
    expect(mockCreatePool.mock.calls[0][0].connectString).toBe(descriptor);

    for (const untouched of [
      'tcps://dbhost:1521/ORCL',
      'dbhost/ORCL',
      'dbhost/ORCL?wallet_location=/home/me@work/wallet',
    ]) {
      mockCreatePool.mockClear();
      await build({ options: connectionString(untouched) }).connect();
      expect(mockCreatePool.mock.calls[0][0].connectString).toBe(untouched);
    }
  });

  // The form labels both fields optional: blank means wallet / OS (external) authentication,
  // which only the Instant Client supports.
  it('uses external authentication in thick mode when no credentials are given', async () => {
    mockInitOracleClient.mockImplementation(() => { (oracledb as any).thin = false; });
    const client = build({
      user: null, password: null, instantClientLocation: '/fake/client/path', options: connectionString('MYALIAS'),
    });
    await client.connect();
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig.externalAuth).toBe(true);
    expect(poolConfig).not.toHaveProperty('user');
    expect(poolConfig).not.toHaveProperty('password');
    expect(poolConfig.connectString).toBe('MYALIAS');
  });

  it('explains what is missing in thin mode instead of failing in the driver', async () => {
    const client = build({ user: null, password: null, options: connectionString('MYALIAS') });
    await expect(client.connect()).rejects.toThrow(/User and Password are required.*Instant Client/s);
    expect(mockCreatePool).not.toHaveBeenCalled();
  });

  it('asks the database for the default schema when no user was entered', async () => {
    mockInitOracleClient.mockImplementation(() => { (oracledb as any).thin = false; });
    const client = build({
      user: null, password: null, instantClientLocation: '/fake/client/path', options: connectionString('MYALIAS'),
    });
    await client.connect();
    (client['driverExecuteSimple'] as Mock).mockResolvedValue([{ CURRENT_SCHEMA: 'OPS$ALICE' }]);
    expect(await client.defaultSchema()).toBe('OPS$ALICE');
  });

  it('upper-cases the entered user for the default schema', async () => {
    const client = build({});
    expect(await client.defaultSchema()).toBe('TESTUSER');
  });
});

describe('splitOracleConnectionString', () => {
  it('splits at the first @ after the password, so an @ later in the string is left alone', () => {
    expect(splitOracleConnectionString('scott/tiger@(DESCRIPTION=(CONNECT_DATA=(SERVICE_NAME=a@b)))')).toEqual({
      user: 'scott', password: 'tiger', connectString: '(DESCRIPTION=(CONNECT_DATA=(SERVICE_NAME=a@b)))',
    })
    expect(splitOracleConnectionString('scott/tiger@host/svc?wallet_location=/home/me@work/w')).toEqual({
      user: 'scott', password: 'tiger', connectString: 'host/svc?wallet_location=/home/me@work/w',
    })
  })

  it('unquotes a quoted password, which may hold @ and /', () => {
    expect(splitOracleConnectionString('scott/"p@ss"@host/svc')).toEqual({ user: 'scott', password: 'p@ss', connectString: 'host/svc' })
    expect(splitOracleConnectionString('scott/"p/ss"@host/svc')).toEqual({ user: 'scott', password: 'p/ss', connectString: 'host/svc' })
  })

  it('reads /@alias as external authentication', () => {
    expect(splitOracleConnectionString('/@mydb')).toEqual({ connectString: 'mydb', externalAuth: true })
    expect(splitOracleConnectionString(' /@host:1521/svc ')).toEqual({ connectString: 'host:1521/svc', externalAuth: true })
  })

  it('leaves aliases, Easy Connect and descriptors alone', () => {
    for (const s of ['MYALIAS', 'host:1521/svc', 'host/svc', 'tcps://host:1522/svc?wallet_location=/a@b', 'host/svc?wallet_location=/home/me@work/w']) {
      expect(splitOracleConnectionString(s)).toEqual({ connectString: s })
    }
  })
})

describe('OracleClient connection string credentials - sources', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    _resetOracleStateForTesting();
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    mockCreatePool.mockResolvedValue({ getConnection: vi.fn() });
  });

  afterEach(() => {
    (oracledb as any).thin = true;
    vi.restoreAllMocks();
  });

  function build(overrides: Record<string, any>, connectionString: string) {
    const client = new OracleClient(buildServer({
      instantClientLocation: null, ...overrides, options: { connectionMethod: 'connectionString', connectionString },
    }), buildDatabase());
    client['driverExecuteSimple'] = vi.fn().mockResolvedValue([{ BANNER: 'Oracle 19c' }]);
    return client;
  }

  it('never pairs the User field with a password from the connection string', async () => {
    await build({ user: 'alice', password: null }, 'scott/tiger@dbhost/ORCL').connect();
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig.user).toBe('alice');
    expect(poolConfig).not.toHaveProperty('password');
    expect(poolConfig.connectString).toBe('dbhost/ORCL');
  });

  it('uses external authentication for /@alias in thick mode', async () => {
    mockInitOracleClient.mockImplementation(() => { (oracledb as any).thin = false; });
    await build({ user: null, password: null, instantClientLocation: '/fake/client/path' }, '/@mydb').connect();
    const poolConfig = mockCreatePool.mock.calls[0][0];
    expect(poolConfig).toMatchObject({ externalAuth: true, connectString: 'mydb' });
    expect(poolConfig).not.toHaveProperty('user');
  });
});

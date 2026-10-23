import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
// Mock oracledb before any imports that use it
const { mockInitOracleClient, mockCreatePool } = vi.hoisted(() => ({
  mockInitOracleClient: vi.fn(),
  mockCreatePool: vi.fn(),
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
    },
  };
});

import fs from 'fs';
import oracledb from 'oracledb';
import { OracleClient, _resetOracleStateForTesting } from '@commercial/backend/lib/db/clients/oracle';

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

  it('uses a heterogeneous pool and passes credentials per connection in thick mode', async () => {
    (oracledb as any).thin = false;
    const client = await connect({ options: { privilege: 'SYSOPER' } });
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

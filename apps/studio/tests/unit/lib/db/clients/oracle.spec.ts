// Mock oracledb before any imports that use it
const mockInitOracleClient = jest.fn();
const mockCreatePool = jest.fn();

jest.mock('oracledb', () => {
  return {
    __esModule: true,
    default: {
      CLOB: 2017,
      BLOB: 2019,
      fetchAsString: [],
      fetchAsBuffer: [],
      initOracleClient: mockInitOracleClient,
      createPool: mockCreatePool,
    },
  };
});

import fs from 'fs';
import { OracleClient } from '@commercial/backend/lib/db/clients/oracle';

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

// IMPORTANT: oracleInitialized is a module-level flag that persists across
// tests and can only transition false→true. Tests are ordered deliberately
// to work with this constraint.
describe('OracleClient connection error handling', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default: all paths exist
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // === Path validation tests (run first while oracleInitialized is false) ===

  it('should reject with a clear error when instantClientLocation does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('Oracle Instant Client directory does not exist');
    expect(mockInitOracleClient).not.toHaveBeenCalled();
  });

  it('should reject with a clear error when oracleConfigLocation does not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((p: fs.PathLike) => {
      return !String(p).includes('config');
    });

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('Oracle configuration directory does not exist');
    expect(mockInitOracleClient).not.toHaveBeenCalled();
  });

  // === initOracleClient error handling (oracleInitialized is still false) ===

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

  // === Post-init tests (oracleInitialized is now true) ===

  it('should not call initOracleClient again after a failed first attempt', async () => {
    mockCreatePool.mockRejectedValue(new Error('ORA-28759: failure to open file'));

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('ORA-28759');
    expect(mockInitOracleClient).not.toHaveBeenCalled();
  });

  it('should return the real error when createPool throws', async () => {
    mockCreatePool.mockRejectedValue(new Error('ORA-12154: TNS:could not resolve the connect identifier specified'));

    const client = new OracleClient(buildServer(), buildDatabase());
    await expect(client.connect()).rejects.toThrow('ORA-12154');
  });

  it('should tell user to restart when config directory changes after init', async () => {
    mockCreatePool.mockRejectedValue(new Error('pool error'));

    const client = new OracleClient(
      buildServer({ oracleConfigLocation: '/different/config/path' }),
      buildDatabase()
    );
    await expect(client.connect()).rejects.toThrow('Please restart Beekeeper Studio');
    expect(mockCreatePool).not.toHaveBeenCalled();
  });

  // === Thin mode (no instantClientLocation) ===

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

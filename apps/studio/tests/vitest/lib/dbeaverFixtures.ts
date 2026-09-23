import path from 'path'

// Real DBeaver CE output; see tests/fixtures/dbeaver/README.md
export const DBEAVER_FIXTURES = path.resolve(__dirname, '../../fixtures/dbeaver')
export const DBEAVER_WORKSPACE = path.join(DBEAVER_FIXTURES, 'workspace6')
export const DBEAVER_PROJECT = path.join(DBEAVER_WORKSPACE, 'General')
export const DBEAVER_CONFIG_DIR = path.join(DBEAVER_PROJECT, '.dbeaver')
export const DBEAVER_EXPORT = path.join(DBEAVER_FIXTURES, 'General.dbp')

export const FIXTURE_CONNECTION_COUNT = 41
export const UNSUPPORTED_FIXTURE_CONNECTIONS = ['DB2 Legacy', 'H2 Embedded']

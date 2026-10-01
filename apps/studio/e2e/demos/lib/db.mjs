// Postgres helpers for demo data, via the psql CLI.
import { execFileSync } from 'node:child_process'

export function pgFromEnv(defaults = {}) {
  return {
    host: process.env.PGHOST || defaults.host || '127.0.0.1',
    port: process.env.PGPORT || defaults.port || '5432',
    user: process.env.PGUSER || defaults.user || 'postgres',
    password: process.env.PGPASSWORD || defaults.password || '',
  }
}

export function psql(pg, database, args) {
  return execFileSync('psql', ['-h', pg.host, '-p', String(pg.port), '-U', pg.user, '-d', database, '-q', '-v', 'ON_ERROR_STOP=1', ...args], {
    env: { ...process.env, PGPASSWORD: pg.password, PGOPTIONS: '--client-min-messages=warning' },
    stdio: ['ignore', 'pipe', 'inherit'],
  }).toString()
}

// Create each database if needed, then run the seed file against it, so every
// take starts from identical data.
export function reseed(pg, { databases, seedFile, maintenanceDb = 'postgres' }) {
  for (const db of databases) {
    const exists = psql(pg, maintenanceDb, ['-tAc', `SELECT 1 FROM pg_database WHERE datname = '${db}'`]).trim()
    if (!exists) psql(pg, maintenanceDb, ['-c', `CREATE DATABASE "${db}"`])
    psql(pg, db, ['-f', seedFile])
  }
}

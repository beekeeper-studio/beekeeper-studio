import { describe, it, expect } from 'vitest'
import { isAuthError } from '@/common/utils'

describe('isAuthError', () => {
  it('returns false for null or undefined', () => {
    expect(isAuthError(null)).toBe(false)
    expect(isAuthError(undefined)).toBe(false)
  })

  it('detects PostgreSQL password and authentication failures', () => {
    expect(isAuthError(new Error('password authentication failed for user "postgres"'))).toBe(true)
    expect(isAuthError(new Error('FATAL:  password authentication failed for user "read_user"'))).toBe(true)
    expect(isAuthError(new Error('error: PAM authentication failed for user "databricks"'))).toBe(true)
    expect(isAuthError(new Error('error: OAuth authentication failed: expired token'))).toBe(true)
    expect(isAuthError(new Error('server closed the connection unexpectedly (28P01)'))).toBe(true)
    expect(isAuthError(new Error('invalid authorization specification (28000)'))).toBe(true)
  })

  it('detects MySQL and MariaDB access denied errors', () => {
    expect(isAuthError(new Error("Access denied for user 'root'@'localhost' (using password: YES)"))).toBe(true)
  })

  it('detects SQL Server login failures', () => {
    expect(isAuthError(new Error("Login failed for user 'sa'."))).toBe(true)
    expect(isAuthError(new Error("Login failed for user 'DOMAIN\\user'."))).toBe(true)
  })

  it('detects Oracle logon denied errors', () => {
    expect(isAuthError(new Error('ORA-01017: invalid username/password; logon denied'))).toBe(true)
  })

  it('detects short-lived token and JWT expirations', () => {
    expect(isAuthError(new Error('Token has expired'))).toBe(true)
    expect(isAuthError(new Error('The access token expired at 2026-11-23T14:00:00Z'))).toBe(true)
    expect(isAuthError(new Error('jwt expired'))).toBe(true)
    expect(isAuthError(new Error('Authentication failed: expired token'))).toBe(true)
  })

  it('detects generic credentials and authentication errors', () => {
    expect(isAuthError(new Error('Invalid password'))).toBe(true)
    expect(isAuthError(new Error('Invalid credentials provided'))).toBe(true)
    expect(isAuthError(new Error('Incorrect username or password'))).toBe(true)
    expect(isAuthError(new Error('Database Connection Error: Authentication failed.'))).toBe(true)
  })

  it('returns false for non-authentication errors', () => {
    expect(isAuthError(new Error('connect ECONNREFUSED 127.0.0.1:5432'))).toBe(false)
    expect(isAuthError(new Error('ETIMEDOUT: connection timed out'))).toBe(false)
    expect(isAuthError(new Error('database "mydb" does not exist'))).toBe(false)
    expect(isAuthError(new Error('syntax error at or near "SELCT"'))).toBe(false)
    expect(isAuthError(new Error('relation "users" does not exist'))).toBe(false)
  })
})

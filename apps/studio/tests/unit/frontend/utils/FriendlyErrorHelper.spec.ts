import { FriendlyErrorHelper } from '@/frontend/utils/FriendlyErrorHelper'
import { ConnectionType } from '@/lib/db/types'

describe('FriendlyErrorHelper', () => {
  describe('getHelpText', () => {
    it('returns null if error is undefined', () => {
      const result = FriendlyErrorHelper.getHelpText('sqlserver', undefined)
      expect(result).toBeNull()
    })

    it('returns null if error is null', () => {
      const result = FriendlyErrorHelper.getHelpText('sqlserver', null)
      expect(result).toBeNull()
    })

    it('returns null if error has no message', () => {
      const error = new Error()
      error.message = ''
      const result = FriendlyErrorHelper.getHelpText('sqlserver', error)
      expect(result).toBeNull()
    })

    it('returns null if no matching pattern for the connection type', () => {
      const error = new Error('Some error message')
      const result = FriendlyErrorHelper.getHelpText('mysql', error)
      expect(result).toBeNull()
    })

    it('returns null if no matching pattern for the error message', () => {
      const error = new Error('Some error message')
      const result = FriendlyErrorHelper.getHelpText('sqlserver', error)
      expect(result).toBeNull()
    })

    it('returns help text for SQL Server self-signed certificate error', () => {
      const error = new Error('Connection error: self signed certificate')
      const result = FriendlyErrorHelper.getHelpText('sqlserver', error)
      expect(result).not.toBeNull()
      expect(result.help).toBe("You might need to check 'Trust Server Certificate'")
      expect(result.link).toBeUndefined()
    })

    it('returns help text and link for SQL Server login failed error', () => {
      const error = new Error('Error: Login failed for user <token-identified principal>')
      const result = FriendlyErrorHelper.getHelpText('sqlserver', error)
      expect(result).not.toBeNull()
      expect(result.help).toBe('Probably your EntraID user is not linked to your database user.')
      expect(result.link).toBe('https://learn.microsoft.com/en-us/answers/questions/133709/login-failed-for-user')
    })

    it('matches case-insensitive error patterns', () => {
      const error = new Error('ERROR: LOGIN FAILED FOR USER <TOKEN-IDENTIFIED PRINCIPAL>')
      const result = FriendlyErrorHelper.getHelpText('sqlserver', error)
      expect(result).not.toBeNull()
      expect(result.help).toBe('Probably your EntraID user is not linked to your database user.')
      expect(result.link).toBe('https://learn.microsoft.com/en-us/answers/questions/133709/login-failed-for-user')
    })

    it('matches partial error messages', () => {
      const error = new Error('Failed to connect: self signed certificate detected in the connection')
      const result = FriendlyErrorHelper.getHelpText('sqlserver', error)
      expect(result).not.toBeNull()
      expect(result.help).toBe("You might need to check 'Trust Server Certificate'")
      expect(result.link).toBeUndefined()
    })
    
    it('handles errors with message property other than string', () => {
      // In rare cases, an error object might have a non-string message property
      const customError = { message: { toString: () => 'self signed certificate' } } as unknown as Error
      const result = FriendlyErrorHelper.getHelpText('sqlserver', customError)
      expect(result).toBeNull() // Since we're expecting a string message, this should return null
    })
    
    it('returns the first matching pattern when multiple patterns match', () => {
      // Let's create a complex error message that could match multiple patterns
      const error = new Error('Login failed for user <token-identified principal> due to self signed certificate')
      const result = FriendlyErrorHelper.getHelpText('sqlserver', error)
      expect(result).not.toBeNull()
      // It should match the first pattern in the errorMappings array for sqlserver
      expect(result.help).toBe('Probably your EntraID user is not linked to your database user.')
      expect(result.link).toBe('https://learn.microsoft.com/en-us/answers/questions/133709/login-failed-for-user')
    })
  })
})
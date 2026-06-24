import { ConnectionType } from "@/lib/db/types"

interface HelpInfo {
  help: string
  link?: string
  pattern?: string
}
const errorMappings = {
  'sqlserver': [
    {
      pattern: "login failed for user <token-identified principal>",
      help: "Probably your EntraID user is not linked to your database user.",
      link: "https://learn.microsoft.com/en-us/answers/questions/133709/login-failed-for-user"
    },
    {
      pattern: 'self signed certificate',
      help: "You might need to check 'Trust Server Certificate'"
    },
    {
      // Integrated auth: the ODBC driver (and unixODBC on Linux/macOS) is missing.
      pattern: 'odbc driver',
      help: "Integrated authentication needs the Microsoft ODBC Driver 18 for SQL Server installed (plus unixODBC on Linux/macOS).",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/"
    },
    {
      // Integrated auth: the native driver module failed to load.
      pattern: 'msnodesqlv8',
      help: "The native driver for integrated authentication could not load. On Linux/macOS install unixODBC and the Microsoft ODBC Driver 18 for SQL Server.",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/"
    },
    {
      // Integrated auth: SSPI/Kerberos handshake failed or timed out.
      pattern: 'sspi',
      help: "Integrated (Kerberos/NTLM) authentication failed. Check for a valid Kerberos ticket (kinit) and that the server's SPN is registered. Connect by hostname/FQDN so Kerberos can match the SPN.",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/"
    },
    {
      pattern: 'kerberos',
      help: "Kerberos authentication failed. Check for a valid ticket (kinit), a registered server SPN, and a client clock in sync with the KDC.",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/"
    }
  ],
  'oracle': [
    {
      pattern: 'thin mode',
      help: "You likely need to enable 'thick mode' which supports all connection types. Please provide the path to the Oracle Instant client to Beekeeper Studio in the box above",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/oracle-database/"
    }
  ]
}


export const FriendlyErrorHelper = {
  getHelpText(connectionType: ConnectionType, error: Error): HelpInfo | null {
    if (!error?.message) return null

    // Check if message is a string
    if (typeof error.message !== 'string') return null

    const lowerMessage = error.message.toLowerCase()
    const options = errorMappings[connectionType] || []
    const result = options.find((candidate) => {
      return lowerMessage.includes(candidate.pattern)
    })
    return result || null
  }
}

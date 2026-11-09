import { ConnectionType } from "@/lib/db/types"

interface HelpInfo {
  // Optional: an entry may carry only a link, when the message already states the remedy
  // and this side is just adding somewhere to read more.
  help?: string
  link?: string
  pattern?: string
}

const SQL_SERVER_DOCS = 'https://docs.beekeeperstudio.io/user_guide/connecting/sql-server/'
const errorMappings = {
  // Errors are rebuilt as `new Error(message)` when they cross the utility-process boundary
  // (see UtilityConnection.ts), so only the top-level message reaches this side -- the nested
  // originalError / precedingErrors and the error code are already gone. Failures that need
  // those, or need the driver config, are classified in the client itself and arrive with the
  // remedy already in the message; sqlserver.ts does that for certificate and SQL Server
  // Browser failures. Add a pattern here when the top-level text alone identifies the fault.
  'sqlserver': [
    {
      pattern: "login failed for user <token-identified principal>",
      help: "Probably your EntraID user is not linked to your database user.",
      link: "https://learn.microsoft.com/en-us/answers/questions/133709/login-failed-for-user"
    },
    {
      // Certificate and SQL Server Browser failures are already annotated with the remedy by
      // sqlserver.ts, so these add the docs link and no help text -- a second copy of the
      // advice would render right after the first in ErrorAlert. Keyed on the wording those
      // hints guarantee; sqlserverConfig.spec.ts asserts the two stay in step.
      pattern: 'self-signed certificate',
      link: `${SQL_SERVER_DOCS}#certificates`
    },
    {
      pattern: 'sql server browser',
      link: `${SQL_SERVER_DOCS}#named-instances-and-the-sql-server-browser`
    },
    {
      // Integrated auth: the ODBC driver (and unixODBC on Linux/macOS) is missing.
      pattern: 'odbc driver',
      help: "Integrated authentication needs the Microsoft ODBC Driver 18 for SQL Server installed (plus unixODBC on Linux/macOS).",
      link: SQL_SERVER_DOCS
    },
    {
      // Integrated auth: the native driver module failed to load.
      pattern: 'msnodesqlv8',
      help: "The native driver for integrated authentication could not load. On Linux/macOS install unixODBC and the Microsoft ODBC Driver 18 for SQL Server.",
      link: SQL_SERVER_DOCS
    },
    {
      // Integrated auth: SSPI/Kerberos handshake failed or timed out.
      pattern: 'sspi',
      help: "Integrated (Kerberos/NTLM) authentication failed. Check for a valid Kerberos ticket (kinit) and that the server's SPN is registered. Connect by hostname/FQDN so Kerberos can match the SPN.",
      link: SQL_SERVER_DOCS
    },
    {
      pattern: 'kerberos',
      help: "Kerberos authentication failed. Check for a valid ticket (kinit), a registered server SPN, and a client clock in sync with the KDC.",
      link: SQL_SERVER_DOCS
    }
  ],
  'oracle': [
    {
      pattern: 'thin mode',
      help: "You likely need to enable 'thick mode' which supports all connection types. Please provide the path to the Oracle Instant client to Beekeeper Studio in the box above",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/oracle-database/"
    }
  ],
  'mongodb': [
    {
      // GSSAPI auth: the native kerberos module failed to load.
      pattern: 'kerberos',
      help: "Kerberos (GSSAPI) authentication needs the krb5 client libraries installed on this machine. Also check for a valid ticket (kinit), a registered server SPN (mongodb/<fqdn>), and a client clock in sync with the KDC. Connect by FQDN so the SPN matches.",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/mongodb/"
    },
    {
      // GSSAPI auth: the negotiation itself failed.
      pattern: 'gssapi',
      help: "Kerberos (GSSAPI) authentication failed. Check for a valid ticket (kinit), a registered server SPN (mongodb/<fqdn>), and connect by FQDN so the SPN matches.",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/mongodb/"
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

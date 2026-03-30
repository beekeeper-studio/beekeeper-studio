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
    }
  ],
  'oracle': [
    {
      pattern: 'thin mode',
      help: "You likely need to enable 'thick mode' which supports all connection types. Please provide the path to the Oracle Instant client to Beekeeper Studio in the box above",
      link: "https://docs.beekeeperstudio.io/user_guide/connecting/oracle-database/"
    },
    {
      pattern: 'please restart beekeeper studio',
      help: "In thick mode, Oracle locks the configuration directory when the client first connects. To use a different configuration directory, restart the app.",
    },
    {
      pattern: 'directory does not exist',
      help: "Double-check the path in your Global Oracle Configuration settings above.",
    },
    {
      pattern: 'failed to initialize oracle client',
      help: "The Oracle Instant Client could not be loaded. Verify the Instant Client path is correct and the required libraries are present.",
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

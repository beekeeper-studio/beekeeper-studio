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

export interface WelcomeTip {
  title: string
  body: string
  /** Where "Learn more" goes. */
  href: string
}

const docs = (path: string) => `https://docs.beekeeperstudio.io/${path}/`

/**
 * Features worth pointing at from the connection screen, shown one at a time.
 *
 * Paid-edition features are in here on purpose: for community users the card
 * doubles as the upsell the connection screen used to carry outright.
 */
export const WelcomeTips: WelcomeTip[] = [
  {
    title: "Query run history",
    body: "Every query you run is saved. Open the history tab to find the one that worked three days ago.",
    href: docs("user_guide/sql_editor/editor"),
  },
  {
    title: "Read only mode",
    body: "Flip a connection to read only before you point it at production.",
    href: docs("user_guide/connecting/connecting"),
  },
  {
    title: "Pinned connections and tables",
    body: "Pin the handful you open daily so they stay at the top of the sidebar.",
    href: docs("getting-started-guide"),
  },
  {
    title: "Sort and filter table data",
    body: "Filter a table in the grid instead of writing a WHERE clause for the third time.",
    href: docs("user_guide/editing-data"),
  },
  {
    title: "Query magics",
    body: "Rename a column in your query to format the results: links, charts, images, and more.",
    href: docs("user_guide/query-magics"),
  },
  {
    title: "AI shell",
    body: "Let an LLM explore the database and write SQL. Bring your own API key, then open a new tab to start.",
    href: docs("user_guide/sql-ai-shell"),
  },
  {
    title: "JSON sidebar",
    body: "Read a wide row as formatted JSON beside the grid instead of squinting at a cell.",
    href: docs("user_guide/json-sidebar"),
  },
  {
    title: "Backup and restore",
    body: "Dump a database and bring it back without leaving the app.",
    href: docs("user_guide/backup-restore"),
  },
]

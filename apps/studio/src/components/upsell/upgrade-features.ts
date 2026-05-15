// Shared feature catalogue for the upgrade modal / in-tab upgrade content.

export interface Testimonial { quote: string; author: string }
export interface Pill { icon: string; label: string; tooltip?: string }
export interface Feature {
  id: string
  icon: string
  color: string
  title: string
  triggerTitle?: string
  short: string
  bullets?: string[]
  pills?: Pill[]
  testimonial?: Testimonial
}

export const FEATURES: Feature[] = [
  {
    id: 'overview',
    icon: 'workspace_premium',
    color: 'var(--theme-primary)',
    title: 'Why Upgrade',
    triggerTitle: 'Beekeeper Studio Ultimate',
    short: 'Unlock a suite of intuitive powertools that are super fun to use and will save you a bunch of time and effort. Did we mention every purchase comes with a *lifetime usage* license?',
    testimonial: {
      quote: 'By far the most user-friendly DB GUI out there. Our whole team bought a license.',
      author: 'Matt K · MinnHealth'
    }
  },
  {
    id: 'workspaces',
    icon: 'cloud',
    color: 'var(--theme-secondary)',
    title: 'Cloud Workspaces',
    triggerTitle: 'Cloud Workspaces',
    short: 'Sync connections & saved queries across devices. Share a Team folder with the rest of your team.',
    bullets: ['Personal & Team folders', 'Sync across all your machines', 'Encrypted at rest & in transit'],
    testimonial: {
      quote: "Cloud workspaces let me save connections per team — almost no competitor has it.",
      author: 'Craig'
    }
  },
  {
    id: 'enterprise',
    icon: 'verified_user',
    color: 'var(--brand-success)',
    title: 'Enterprise connectivity',
    triggerTitle: 'Enterprise Connectivity',
    short: 'Passwordless cloud auth — AWS IAM, Azure Entra ID, AWS/Azure CLI — plus paid-edition databases including MongoDB, Oracle, Cassandra, ClickHouse, DuckDB, DynamoDB, Snowflake, Trino, and more.',
    bullets: [
      'AWS IAM & Azure Entra ID web SSO',
      'AWS CLI & Azure CLI generated credentials',
      'Oracle, Cassandra, ClickHouse, DuckDB, Firebird, LibSQL, ScyllaDB'
    ],
    testimonial: {
      quote: 'Beekeeper handles everything in one clean workspace.',
      author: 'Saqib Hussain, Devinspect'
    }
  },
  {
    id: 'ai',
    icon: 'auto_awesome',
    color: 'var(--brand-pink)',
    title: 'SQL AI Shell',
    triggerTitle: 'SQL AI Shell',
    short: 'Explore data with the AI agent you already use. Bring your own model — no usage fees, no middlemen, runs on your machine.',
    testimonial: {
      quote: 'The AI feature is highly beneficial.',
      author: 'Özer Özdaş, Nuvo Code'
    }
  },
  {
    id: 'json',
    icon: 'data_object',
    color: 'var(--brand-secondary)',
    title: 'JSON Sidebar',
    triggerTitle: 'JSON Sidebar',
    short: 'View any row as structured JSON, expand foreign keys inline, and follow relationships across tables without leaving the row.',
    bullets: ['Nested FK expansion', 'Regex search across rows', 'Auto-formats JSON stored as text'],
    testimonial: {
      quote: 'JSON view solved my biggest problem of rows being hard to read.',
      author: 'Pixeluted, Pixeluted LLC'
    }
  },
  {
    id: 'editable',
    icon: 'edit_note',
    color: 'var(--theme-primary)',
    title: 'Editable query results',
    triggerTitle: 'Editable Query Results',
    short: "Fix a value straight from a SELECT — Beekeeper checks the SQL and maps each column back to its source table, so edits land in the right place.",
    bullets: ['Stage & review before commit', 'Works with manual commit mode', 'Same controls as table edits'],
    testimonial: {
      quote: 'Hands down one of the best SQL clients I’ve used.',
      author: 'Caio Mendes'
    }
  },
  {
    id: 'io',
    icon: 'sync_alt',
    color: 'var(--brand-warning)',
    title: 'Import, export, backup',
    triggerTitle: 'Import, Export & Backup',
    short: 'Multi-table export, streamed query exports for giant results, CSV import with smart column mapping, and native backup & restore.',
    bullets: ['Multi-table export', 'Stream query results to file', 'CSV import & native backup'],
    testimonial: {
      quote: 'Imports and exports work flawlessly. No fuss at all.',
      author: 'Nahabi Wandera, The TG Foundry'
    }
  },
  {
    id: 'organize',
    icon: 'folder',
    color: 'var(--brand-purple)',
    title: 'Stay organized',
    triggerTitle: 'Folders & Organization',
    short: 'Folders & subfolders for connections and saved queries, drag-and-drop reordering, and pinned items that stick across restarts.',
    bullets: ['Nested folders', 'Drag-and-drop reordering', 'Persistent pinned items'],
    testimonial: {
      quote: 'Beekeeper Studio just works — fast, focused, no fuss.',
      author: 'Porya Ras, Careberry'
    }
  },
  {
    id: 'erd',
    icon: 'schema',
    color: 'var(--brand-info)',
    title: 'ER Diagrams',
    triggerTitle: 'Entity Relationship Diagrams',
    short: 'Visualize your schema as an interactive diagram. See how tables connect — even across schemas — then export the layout as an image.',
    bullets: ['Cross-schema relationships', 'Open from sidebar or Tools menu', 'Export or copy as image'],
    testimonial: {
      quote: 'I can finally see how the whole schema fits together at a glance.',
      author: 'Joe S, DBA'
    }
  }
]

// Keyword map: lets existing call sites (which only pass a string) still
// surface the most relevant feature. Order matters — first match wins.
const MESSAGE_FEATURE_MATCHERS: { match: RegExp; feature: string }[] = [
  { match: /authentication/i, feature: 'enterprise' },
  { match: /folder|organize/i, feature: 'organize' },
  { match: /edit query result/i, feature: 'editable' },
  { match: /workspace|cloud/i, feature: 'workspaces' },
  { match: /export|import|backup/i, feature: 'io' },
  { match: /ai|llm/i, feature: 'ai' },
  { match: /json/i, feature: 'json' },
  { match: /erd|diagram|entity relationship/i, feature: 'erd' }
]

export function inferFeature(message?: string | null): string | null {
  if (!message) return null
  for (const m of MESSAGE_FEATURE_MATCHERS) {
    if (m.match.test(message)) return m.feature
  }
  return null
}

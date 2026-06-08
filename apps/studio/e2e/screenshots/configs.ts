// Per-database configs for the screenshot capture spec (capture.spec.ts).
// Ports/credentials match the services in the repo-root docker-compose.yml.
export interface ScreenshotDbConfig {
  name: string;          // short slug used in screenshot filenames, e.g. "postgres"
  connectionType: string; // value/label for the "Connection Type" dropdown
  port: string;
  user: string;
  password: string;
  defaultDatabase: string;
  sampleTable: string;   // a seeded table to open / inspect
  query: string;         // a query to run in the editor view
}

export const DB_CONFIGS: Record<string, ScreenshotDbConfig> = {
  postgres: {
    name: "postgres",
    connectionType: "Postgres",
    port: "5434",
    user: "postgres",
    password: "example",
    defaultDatabase: "saklia",
    sampleTable: "film",
    query: "SELECT film_id, title, release_year, rating, length\nFROM film\nORDER BY title\nLIMIT 50;",
  },
  mysql: {
    name: "mysql",
    connectionType: "MySQL",
    port: "3308",
    user: "root",
    password: "example",
    defaultDatabase: "employees",
    sampleTable: "employees",
    query: "SELECT emp_no, first_name, last_name, gender, hire_date\nFROM employees\nORDER BY emp_no\nLIMIT 50;",
  },
};

// Comma-separated list of which DBs to capture, e.g. SCREENSHOT_DBS=postgres,mysql
export function selectedDbs(): ScreenshotDbConfig[] {
  const raw = process.env.SCREENSHOT_DBS;
  const keys = raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(DB_CONFIGS);
  return keys.map((k) => {
    const cfg = DB_CONFIGS[k];
    if (!cfg) throw new Error(`Unknown SCREENSHOT_DBS entry: ${k}`);
    return cfg;
  });
}

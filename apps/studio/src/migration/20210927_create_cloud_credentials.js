
export default {
  name: 'add-app-id',
  async run(runner) {
    const queries = [`
        CREATE TABLE IF NOT EXISTS cloud_credential (
          "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
          "appId" varchar(255),
          "email" varchar(255),
          "token" varchar(255),
          "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
          "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
          "version" integer NOT NULL DEFAULT 0
        )
      `,
      "CREATE UNIQUE INDEX cloud_credentials_email on cloud_credential(email)"
    ]
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        await runner.query(query)
      }
  }
}


export default {
  name: '20200101_initialize',
  queries: [
  `CREATE TABLE IF NOT EXISTS "used_query" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "version" integer NOT NULL, "text" text NOT NULL, "database" varchar NOT NULL, "connectionHash" varchar NOT NULL, "status" varchar NOT NULL, "numberOfRecords" bigint);`,
  `CREATE INDEX IF NOT EXISTS "IDX_a250dbe3d8c76ad21fb9213b6d" ON "used_query" ("connectionHash") ;`,
  `CREATE TABLE IF NOT EXISTS "favorite_query" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "version" integer NOT NULL, "title" varchar NOT NULL, "text" text NOT NULL, "database" varchar NOT NULL, "connectionHash" varchar NOT NULL);`,
  `CREATE INDEX IF NOT EXISTS "IDX_d04f9dff09d102a8457af8c330" ON "favorite_query" ("connectionHash") ;`,
  `CREATE TABLE IF NOT EXISTS "saved_connection" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "version" integer NOT NULL, "connectionType" varchar NOT NULL, "host" varchar, "port" integer, "username" varchar, "defaultDatabase" varchar, "path" varchar, "uri" varchar, "uniqueHash" varchar(500) NOT NULL, "name" varchar NOT NULL, "password" varchar, "sshEnabled" boolean NOT NULL DEFAULT (0), "sshHost" varchar, "sshPort" integer, "sshMode" varchar(8) NOT NULL DEFAULT ('keyfile'), "sshKeyfile" varchar, "sshUsername" varchar, "rememberPassword" boolean NOT NULL DEFAULT (1), "rememberSshPassword" boolean NOT NULL DEFAULT (1), "rememberSshKeyfilePassword" boolean NOT NULL DEFAULT (1), "sshKeyfilePassword" varchar, "sshPassword" varchar);`,
  `CREATE TABLE IF NOT EXISTS "used_connection" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "version" integer NOT NULL, "connectionType" varchar NOT NULL, "host" varchar, "port" integer, "username" varchar, "defaultDatabase" varchar, "path" varchar, "uri" varchar, "uniqueHash" varchar(500) NOT NULL, "sshEnabled" boolean NOT NULL DEFAULT (0), "sshHost" varchar, "sshPort" integer, "sshMode" varchar(8) NOT NULL DEFAULT ('keyfile'), "sshKeyfile" varchar, "sshUsername" varchar);`
  ],
  async run(runner) {
    for(let i = 0; i < this.queries.length; i++) {
      await runner.query(this.queries[i])
    }
  },

}


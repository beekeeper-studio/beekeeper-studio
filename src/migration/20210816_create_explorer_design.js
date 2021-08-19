export default {
  name: "20210816_create_explorer_design.js",
  queries: [
    `CREATE TABLE IF NOT EXISTS "directory" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, 
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')), 
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), 
        "version" integer NOT NULL, 
        "title" text NOT NULL, 
        "database" varchar NOT NULL, 
        "deepth" integer NOT NULL, 
        "workspace_id" integer, 
        "parent_id" integer, 
        "isWorkspace" integer,
        "showColumns" integer NOT NULL DEFAULT 0, 
        foreign key (workspace_id) references directory(id) ON DELETE CASCADE, 
        foreign key (parent_id) references directory(id) ON DELETE CASCADE
      );`,
    `ALTER TABLE favorite_query ADD COLUMN directory_id integer NOT NULL REFERENCES directory(id) ON DELELTE CASCADE;`
  ],

  async run(runner) {
    for (let i = 0; i < this.queries.length; i++) {
      await runner.query(this.queries[i]);
    }
  }
};

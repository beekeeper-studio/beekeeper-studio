import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { PostgresBackupClient } from "@/lib/db/backup-clients/postgresql";

describe("PostgresBackupClient", () => {
  const originalPlatformInfo = window.platformInfo;

  beforeEach(() => {
    (window as any).platformInfo = {
      isWindows: false,
      downloadsDirectory: "/home/user/Downloads",
    };
  });

  afterEach(() => {
    (window as any).platformInfo = originalPlatformInfo;
  });

  it("defaults format to Custom ('c') so default backup writes a single file", () => {
    const client = new PostgresBackupClient();
    client.database = "sakila";
    client.connConfig = {
      host: "localhost",
      port: 5432,
      username: "postgres",
    } as any;

    // Trigger default initialization in settingsSections just like BackupSettings.vue
    const sections = client.settingsSections;
    expect(sections.length).toBeGreaterThan(0);

    expect(client.config.format).toBe("c");
    expect(client.outputFilePath).toMatch(/^\/home\/user\/Downloads\/.+\.dump$/);

    const command = client.buildCommand();
    expect(command.options).toContain("--format=c");
    expect(command.options).toContain(`--file=${client.outputFilePath}`);
  });

  it("shows empty-directory guidance only when Directory format ('d') is selected", () => {
    const client = new PostgresBackupClient();
    const sections = client.settingsSections;
    const pgDumpOptions = sections.find((s) => s.header === "pg_dump Options");
    const dirNotice = pgDumpOptions.controls.find(
      (c) =>
        c.controlType === "info" &&
        c.settingDesc.includes("empty or new Output Directory"),
    );

    expect(dirNotice).toBeDefined();
    expect(dirNotice.show({ format: "c" } as any)).toBe(false);
    expect(dirNotice.show({ format: "d" } as any)).toBe(true);
  });
});

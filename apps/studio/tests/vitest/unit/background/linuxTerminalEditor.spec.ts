import { describe, it, expect } from "vitest";
import {
  parseDesktopEntry,
  buildEditorCommand,
  terminalCommand,
} from "@/background/lib/linuxTerminalEditor";

describe("parseDesktopEntry", () => {
  it("reads Exec and Terminal from the main group", () => {
    const entry = parseDesktopEntry(
      "[Desktop Entry]\nName=Vim\nExec=vim %F\nTerminal=true\nType=Application\n"
    );
    expect(entry).toEqual({ exec: "vim %F", terminal: true });
  });

  it("treats a missing or false Terminal as a GUI app", () => {
    expect(parseDesktopEntry("[Desktop Entry]\nExec=gedit %U\n").terminal).toBe(false);
    expect(parseDesktopEntry("[Desktop Entry]\nExec=gedit\nTerminal=false\n").terminal).toBe(false);
  });

  it("ignores keys in other groups such as actions", () => {
    const entry = parseDesktopEntry(
      "[Desktop Entry]\nExec=nvim %F\nTerminal=true\n\n[Desktop Action new]\nExec=other\nTerminal=false\n"
    );
    expect(entry).toEqual({ exec: "nvim %F", terminal: true });
  });

  it("ignores comments and blank lines", () => {
    expect(parseDesktopEntry("# c\n\n[Desktop Entry]\n# Exec=no\nExec=hx %F\nTerminal=True\n"))
      .toEqual({ exec: "hx %F", terminal: true });
  });
});

describe("buildEditorCommand", () => {
  const file = "/home/u/.config/beekeeper-studio/user.config.ini";

  it("puts the file in place of %F / %f / %U / %u", () => {
    expect(buildEditorCommand("vim %F", file)).toEqual(["vim", file]);
    expect(buildEditorCommand("nano %f", file)).toEqual(["nano", file]);
    expect(buildEditorCommand("hx %U", file)).toEqual(["hx", file]);
  });

  it("appends the file when there is no file field code", () => {
    expect(buildEditorCommand("micro", file)).toEqual(["micro", file]);
  });

  it("drops other field codes and keeps flags", () => {
    expect(buildEditorCommand("nvim -p %i %c %F", file)).toEqual(["nvim", "-p", file]);
  });

  it("keeps quoted arguments together", () => {
    expect(buildEditorCommand('"/opt/my editor/bin/ed" --flag %f', file))
      .toEqual(["/opt/my editor/bin/ed", "--flag", file]);
  });

  it("does not split a file path with spaces", () => {
    expect(buildEditorCommand("vim %F", "/tmp/my dir/a.ini")).toEqual(["vim", "/tmp/my dir/a.ini"]);
  });
});

describe("terminalCommand", () => {
  const cmd = ["vim", "/tmp/a.ini"];
  const has = (...names: string[]) => (name: string) => names.includes(name);

  it("prefers xdg-terminal-exec", () => {
    expect(terminalCommand(cmd, { TERMINAL: "kitty" }, has("xdg-terminal-exec", "ghostty")))
      .toEqual(["xdg-terminal-exec", "vim", "/tmp/a.ini"]);
  });

  it("uses $TERMINAL next, with the right argument style", () => {
    expect(terminalCommand(cmd, { TERMINAL: "ghostty" }, has())).toEqual(["ghostty", "-e", ...cmd]);
    expect(terminalCommand(cmd, { TERMINAL: "/usr/bin/kitty" }, has())).toEqual(["/usr/bin/kitty", ...cmd]);
    expect(terminalCommand(cmd, { TERMINAL: "my-term" }, has())).toEqual(["my-term", "-e", ...cmd]);
  });

  it("falls back to a known terminal on the PATH", () => {
    expect(terminalCommand(cmd, {}, has("ghostty", "xterm"))).toEqual(["ghostty", "-e", ...cmd]);
    expect(terminalCommand(cmd, {}, has("gnome-terminal"))).toEqual(["gnome-terminal", "--", ...cmd]);
    expect(terminalCommand(cmd, {}, has("xterm"))).toEqual(["xterm", "-e", ...cmd]);
  });

  it("returns null when no terminal is found", () => {
    expect(terminalCommand(cmd, {}, has())).toBeNull();
  });
});

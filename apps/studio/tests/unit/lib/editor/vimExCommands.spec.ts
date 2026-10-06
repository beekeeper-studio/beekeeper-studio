import { AppEvent } from "@/common/AppEvent";
import { vimExCommands, DEFAULT_VIM_MAPPINGS } from "@/lib/editor/vimExCommands";

function commandsByPrefix(trigger: jest.Mock) {
  const { exCommands } = vimExCommands(trigger as any);
  return Object.fromEntries(exCommands.map((c) => [c.prefix, c]));
}

describe("vim ex commands", () => {
  let trigger: jest.Mock;

  beforeEach(() => {
    trigger = jest.fn();
  });

  // https://github.com/beekeeper-studio/beekeeper-studio/issues/1930
  // Ex commands are registered on a global vim singleton, so a handler that
  // captured a tab would act on whichever tab mounted last. These broadcast
  // instead, leaving the active tab to decide.
  it("broadcasts rather than capturing a tab", () => {
    const commands = commandsByPrefix(trigger);

    commands["w"].handler();
    expect(trigger).toHaveBeenCalledWith(AppEvent.vimWrite);

    commands["q"].handler();
    expect(trigger).toHaveBeenCalledWith(AppEvent.closeTab);

    commands["qa"].handler();
    expect(trigger).toHaveBeenCalledWith(AppEvent.closeAllTabs);
  });

  it("treats :x and :wq the same", () => {
    const commands = commandsByPrefix(trigger);

    commands["x"].handler();
    commands["wq"].handler();

    expect(trigger.mock.calls).toEqual([
      [AppEvent.vimWriteQuit],
      [AppEvent.vimWriteQuit],
    ]);
  });

  it("passes a name through to :tabnew, and copes without one", () => {
    const commands = commandsByPrefix(trigger);

    commands["tabnew"].handler({}, { args: ["reports"] });
    expect(trigger).toHaveBeenCalledWith(AppEvent.newTab, "", "reports");

    commands["tabnew"].handler({}, {});
    expect(trigger).toHaveBeenCalledWith(AppEvent.newTab);

    commands["tabnew"].handler({}, { args: [] });
    expect(trigger).toHaveBeenCalledTimes(3);
  });

  it("builds an identical table every time, so tabs cannot clobber each other", () => {
    const a = vimExCommands(trigger as any).exCommands.map((c) => [c.name, c.prefix]);
    const b = vimExCommands(jest.fn() as any).exCommands.map((c) => [c.name, c.prefix]);

    expect(a).toEqual(b);
  });
});

describe("default vim mappings", () => {
  // https://github.com/beekeeper-studio/beekeeper-studio/issues/3446
  it("routes ctrl-p to quick search through an ex command", () => {
    const mapping = DEFAULT_VIM_MAPPINGS.find((m) => m.lhs === "<C-p>");

    expect(mapping).toBeDefined();
    expect(mapping.mode).toEqual("normal");

    const trigger = jest.fn();
    const commands = commandsByPrefix(trigger);
    const exName = mapping.rhs.replace(/^:/, "").replace(/<CR>$/, "");

    expect(commands[exName]).toBeDefined();
    commands[exName].handler();
    expect(trigger).toHaveBeenCalledWith(AppEvent.quickSearch);
  });

  it("does not unmap anything", () => {
    // Removing a built-in shrinks codemirror's keymap below the length it
    // recorded at startup, which breaks mapclear and noremap lookups.
    expect(DEFAULT_VIM_MAPPINGS.every((m) => !("type" in m))).toBe(true);
  });
});

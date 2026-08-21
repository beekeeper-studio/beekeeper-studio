import { Command, EditorView, KeyBinding, keymap } from "@codemirror/view";
import {
  EditorSelection,
  Extension,
  Prec,
  SelectionRange,
  StateEffect,
  StateField,
} from "@codemirror/state";
import {
  cursorCharLeft,
  cursorCharRight,
  cursorGroupBackward,
  cursorGroupForward,
  cursorLineBoundaryBackward,
  cursorLineBoundaryForward,
  cursorLineDown,
  cursorLineUp,
  cursorPageDown,
  deleteCharBackward,
  deleteCharForward,
  selectCharLeft,
  selectCharRight,
  selectGroupBackward,
  selectGroupForward,
  selectLineBoundaryBackward,
  selectLineBoundaryForward,
  selectLineDown,
  selectLineUp,
  selectPageDown,
  splitLine,
  transposeChars,
} from "@codemirror/commands";
import { moveCompletionSelection } from "@codemirror/autocomplete";
import { writeClipboard } from "../../../utils/clipboard";

/**
 * The small set of emacs bindings that macOS gives every text field (the Cocoa
 * standard key bindings) and that GNOME gives every GTK app when its key theme
 * is set to Emacs. Not full emacs: no C-x chords, no M-x, no isearch.
 *
 * macOS already ships most of this: `standardKeymap` folds `emacsStyleKeymap`
 * in behind a `mac:` gate, so there the additions are really the kill ring,
 * the Alt word motions, and C-w/M-w/C-y/C-u.
 */

/** Emacs traditionally keeps a much longer ring; this is only ever yanked from
 *  the head, so the rest is just history that costs nothing to hold. */
const MAX_KILL_RING = 60;

type KillRingState = {
  ring: readonly string[];
  /** Whether the next kill continues the current run rather than starting a
   *  new entry. Consecutive kills accumulate, so C-k C-k C-k then C-y brings
   *  all three lines back. */
  appending: boolean;
};

const killEffect = StateEffect.define<{ text: string; forward: boolean }>();

const killRing = StateField.define<KillRingState>({
  create: () => ({ ring: [], appending: false }),
  update(value, tr) {
    let killed = false;

    for (const effect of tr.effects) {
      if (!effect.is(killEffect)) continue;
      killed = true;

      const { text, forward } = effect.value;
      const [head, ...rest] = value.ring;

      value =
        value.appending && head !== undefined
          ? {
              // A backwards kill lands in front of what it is joining.
              ring: [forward ? head + text : text + head, ...rest],
              appending: true,
            }
          : {
              ring: [text, ...value.ring].slice(0, MAX_KILL_RING),
              appending: true,
            };
    }

    // Anything that isn't a kill ends the run. Commands that touch neither the
    // doc nor the selection (M-w, recenter) deliberately don't.
    if (!killed && value.appending && (tr.docChanged || tr.selection)) {
      value = { ...value, appending: false };
    }

    return value;
  },
});

type Kill = { from: number; to: number };

function killedText(view: EditorView, ranges: readonly Kill[]): string {
  return ranges.map((r) => view.state.doc.sliceString(r.from, r.to)).join("\n");
}

/** Two cursors on one line produce two kills reaching the same line end, and
 *  codemirror rejects a transaction whose changes overlap. */
function coalesce(ranges: Kill[]): Kill[] {
  const sorted = ranges.filter((r) => r.from < r.to).sort((a, b) => a.from - b.from);

  return sorted.reduce<Kill[]>((merged, range) => {
    const last = merged[merged.length - 1];
    if (last && range.from <= last.to) {
      last.to = Math.max(last.to, range.to);
    } else {
      merged.push({ ...range });
    }
    return merged;
  }, []);
}

function pushKill(view: EditorView, ranges: Kill[], forward: boolean): boolean {
  const changes = coalesce(ranges);
  if (changes.length === 0) return true;

  view.dispatch({
    changes,
    effects: killEffect.of({ text: killedText(view, changes), forward }),
    scrollIntoView: true,
    userEvent: "delete.kill",
  });

  return true;
}

/** GTK's emacs theme maps C-w and M-w straight onto cut and copy, so those two
 *  reach the system clipboard as well as the ring. C-k deliberately doesn't,
 *  matching both emacs and the macOS pasteboard. */
function copyOut(text: string) {
  // A clipboard that refuses shouldn't cost the edit itself.
  void writeClipboard(text).catch(() => undefined);
}

const lineBoundary = (view: EditorView, pos: number, forward: boolean): number =>
  view.moveToLineBoundary(EditorSelection.cursor(pos), forward).head;

const groupBoundary = (view: EditorView, pos: number, forward: boolean): number =>
  view.moveByGroup(EditorSelection.cursor(pos), forward).head;

const selectedRanges = (view: EditorView): SelectionRange[] =>
  view.state.selection.ranges.filter((range) => !range.empty);

const killToLineEnd: Command = (view) =>
  pushKill(
    view,
    view.state.selection.ranges.map((range) => {
      const to = lineBoundary(view, range.head, true);
      // Sitting at the end of a line there is nothing left to kill, so take
      // the line break instead, the way emacs does.
      return to > range.head
        ? { from: range.head, to }
        : { from: range.head, to: Math.min(view.state.doc.length, range.head + 1) };
    }),
    true
  );

const killToLineStart: Command = (view) =>
  pushKill(
    view,
    view.state.selection.ranges.map((range) => {
      const from = lineBoundary(view, range.head, false);
      return from < range.head
        ? { from, to: range.head }
        : { from: Math.max(0, range.head - 1), to: range.head };
    }),
    false
  );

const killGroupForward: Command = (view) =>
  pushKill(
    view,
    view.state.selection.ranges.map((range) =>
      range.empty
        ? { from: range.head, to: groupBoundary(view, range.head, true) }
        : { from: range.from, to: range.to }
    ),
    true
  );

const killGroupBackward: Command = (view) =>
  pushKill(
    view,
    view.state.selection.ranges.map((range) =>
      range.empty
        ? { from: groupBoundary(view, range.head, false), to: range.head }
        : { from: range.from, to: range.to }
    ),
    false
  );

/** GTK binds C-w to cut, Cocoa binds it to delete-word-backward. Both hold if
 *  a selection decides which one you meant. */
const killRegionOrGroupBackward: Command = (view) => {
  const selected = selectedRanges(view);
  if (selected.length === 0) return killGroupBackward(view);

  copyOut(killedText(view, selected));
  return pushKill(
    view,
    selected.map((range) => ({ from: range.from, to: range.to })),
    false
  );
};

const copyRegionAsKill: Command = (view) => {
  const selected = selectedRanges(view);
  if (selected.length === 0) return true;

  const text = killedText(view, selected);
  copyOut(text);
  view.dispatch({ effects: killEffect.of({ text, forward: true }) });

  return true;
};

const yank: Command = (view) => {
  const text = view.state.field(killRing, false)?.ring[0];
  if (!text) return true;

  view.dispatch({
    ...view.state.replaceSelection(text),
    scrollIntoView: true,
    userEvent: "input.paste",
  });

  return true;
};

const recenter: Command = (view) => {
  view.dispatch({
    effects: EditorView.scrollIntoView(view.state.selection.main.head, {
      y: "center",
    }),
  });
  return true;
};

/** The completion popup only claims the arrow keys, so C-n and C-p have to
 *  offer themselves to it before falling back to line motion. */
const throughCompletion = (forward: boolean, fallback: Command): Command => {
  const moveCompletion = moveCompletionSelection(forward);
  return (view) => moveCompletion(view) || fallback(view);
};

/**
 * CodeMirror merges every binding for a key into one ordered list and moves on
 * to the next command when ours returns false. Left alone, a second C-a at the
 * start of a line would fall through to select-all. In this mode the key is
 * ours whether or not the cursor could move.
 */
const claim =
  (command: Command): Command =>
  (view) => {
    command(view);
    return true;
  };

/**
 * The app's own shortcuts are document level v-hotkey listeners, so a bound key
 * has to stop propagating or it fires twice: C-p would move the cursor and open
 * quick search. stopPropagation only fires on events that were prevented, hence
 * both flags.
 */
const bind = (binding: KeyBinding): KeyBinding => ({
  ...binding,
  run: binding.run && claim(binding.run),
  shift: binding.shift && claim(binding.shift),
  preventDefault: true,
  stopPropagation: true,
});

export const minimalEmacsKeybindings: readonly KeyBinding[] = [
  // Motion, shared by Cocoa and GTK's emacs theme.
  bind({ key: "Ctrl-b", run: cursorCharLeft, shift: selectCharLeft }),
  bind({ key: "Ctrl-f", run: cursorCharRight, shift: selectCharRight }),
  bind({
    key: "Ctrl-p",
    run: throughCompletion(false, cursorLineUp),
    shift: selectLineUp,
  }),
  bind({
    key: "Ctrl-n",
    run: throughCompletion(true, cursorLineDown),
    shift: selectLineDown,
  }),
  bind({
    key: "Ctrl-a",
    run: cursorLineBoundaryBackward,
    shift: selectLineBoundaryBackward,
  }),
  bind({
    key: "Ctrl-e",
    run: cursorLineBoundaryForward,
    shift: selectLineBoundaryForward,
  }),

  // Word motion. GTK's emacs theme; on macOS the Cocoa equivalents are ~f/~b.
  bind({ key: "Alt-b", run: cursorGroupBackward, shift: selectGroupBackward }),
  bind({ key: "Alt-f", run: cursorGroupForward, shift: selectGroupForward }),

  bind({ key: "Ctrl-d", run: deleteCharForward }),
  bind({ key: "Ctrl-h", run: deleteCharBackward }),

  // Kill ring.
  bind({ key: "Ctrl-k", run: killToLineEnd }),
  bind({ key: "Ctrl-u", run: killToLineStart }),
  bind({ key: "Alt-d", run: killGroupForward }),
  bind({ key: "Alt-Backspace", run: killGroupBackward }),
  bind({ key: "Ctrl-Alt-h", run: killGroupBackward }),
  bind({ key: "Ctrl-Backspace", run: killGroupBackward }),
  bind({ key: "Ctrl-w", run: killRegionOrGroupBackward }),
  bind({ key: "Alt-w", run: copyRegionAsKill }),
  bind({ key: "Ctrl-y", run: yank }),

  // macOS only. These are in Cocoa's dictionary but not GNOME's key theme, and
  // elsewhere the same keys are paste, new tab, quick search and select editor.
  // Naming only `mac` leaves the binding unregistered on other platforms.
  bind({ mac: "Ctrl-o", run: splitLine }),
  bind({ mac: "Ctrl-t", run: transposeChars }),
  bind({ mac: "Ctrl-v", run: cursorPageDown, shift: selectPageDown }),
  // defaultKeymap gives mac Ctrl-l to selectLine, so this has to outrank it.
  bind({ mac: "Ctrl-l", run: recenter }),
];

export function minimalEmacs(): Extension {
  // Prec.high clears extraKeymap and defaultKeymap while staying under the
  // completion keymap, so Enter, Escape and the arrows still drive the popup.
  return [killRing, Prec.high(keymap.of(minimalEmacsKeybindings))];
}

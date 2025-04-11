<template>
  <textarea
    name="shell"
    class="editor"
    ref="shell"
    id=""
    cols="30"
    rows="10"
  />
</template>

<script lang="ts">
import "@/plugins/CMMongoMode";
import "codemirror/addon/comment/comment";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/search/search";
import "codemirror/addon/search/jump-to-line";
import "codemirror/addon/scroll/annotatescrollbar";
import "codemirror/addon/search/matchesonscrollbar";
import "codemirror/addon/search/matchesonscrollbar.css";
import "codemirror/addon/search/searchcursor";
import "codemirror/addon/fold/foldgutter";
import "codemirror/addon/fold/foldcode";
import "codemirror/addon/fold/brace-fold";
import "codemirror/addon/fold/foldgutter.css";
import "@/plugins/CMMongoHint";
import "@/vendor/show-hint";
import "@/lib/editor/CodeMirrorDefinitions";
import "codemirror/addon/merge/merge";
import CodeMirror from 'codemirror';
import {
  setKeybindingsFromVimrc,
  applyConfig,
  Register,
} from "@/lib/editor/vim";
import { keymapTypes } from "@/lib/db/types";
import { mapGetters, mapState } from 'vuex';
import { plugins } from "@/lib/editor/utils";
import { AppEvent } from '@/common/AppEvent';
import AnsiToHtml from 'ansi-to-html';

const ansiToHtml = new AnsiToHtml();

interface InitializeOptions {
  userKeymap?: typeof keymapTypes[number]['value']
}

export default {
  props: [
    "focus",
    "output",
    "vimConfig" // not sure if we need this
  ],
  data() {
    return {
      shell: null,
      promptSymbol: "mongo> ",
      commandHistory: [],
      historyIndex: -1,
      promptLine: 0, // where current prompt starts
      wasShellFocused: false,
      firstInitialization: true
    }
  },
  computed: {
    ...mapGetters({ 'userKeymap': 'settings/userKeymap' }),
    ...mapState(['connection']),
    prompt() {
      const maxLength = 30;
      if (this.promptSymbol.length <= maxLength) return this.promptSymbol;

      const startLength = Math.floor((maxLength - 3) / 2);
      const endLength = maxLength - 3 - startLength;

      const start = this.promptSymbol.substring(0, startLength);
      const end = this.promptSymbol.substring(this.promptSymbol.length - endLength);

      return `${start}...${end}`
    },
    hintOptions() {
      return {
        promptLine: this.promptLine,
        promptSymbol: this.prompt,
        connection: this.connection
      }
    },
    hint() {
      // @ts-expect-error not fully typed
      return CodeMirror.hint.javascript;
    },
    plugins() {
      return [plugins.autoComplete];
    },
    rootBindings() {
      return [
        { event: AppEvent.switchUserKeymap, handler: this.handleSwitchUserKeymap },
      ]
    },
  },
  watch: {
    hintOptions() {
      this.shell?.setOption('hintOptions', this.hintOptions);
    },
    output(value) {
      const doc = this.shell.getDoc();
      const lastLineNum = this.shell.lastLine();
      let output = value.output;

      if (typeof output === 'string' && /\x1b\[[0-9;]*m/.test(output)) {
        const html = ansiToHtml.toHtml(output);

        const el = document.createElement('pre');
        el.className = 'ansi-output';
        el.innerHTML = html;

        this.shell.addLineWidget(lastLineNum, el, { above: false });
      } else if (typeof output === 'object') {
        try {
          const formattedOutput = JSON.stringify(output, null, 2);
          
          doc.replaceRange(`\n${formattedOutput}`, { line: lastLineNum + 1, ch: 0 });
        } catch (err) {
          // Fallback to basic string version if anything goes wrong
          const output = JSON.stringify(value.output);
          doc.replaceRange(`\n${output}`, { line: lastLineNum + 1, ch: 0 });
        }
      } else {
        // For non-object output, just insert as text
        doc.replaceRange(`\n${output}`, { line: lastLineNum + 1, ch: 0 });
      }

      this.connection.getShellPrompt().then((v) => {
        this.promptSymbol = v;
        this.resetPrompt();
      })
    },
    async focus() {
      if (!this.shell) return;
      if (this.focus) {
        this.shell.focus();
        await this.$nextTick();
        this.shell.refresh();
      } else {
        this.shell.display.input.blur();
      }
    }
  },
  methods: {
    focusShell() {
      if (this.shell && this.wasShellFocused) {
        this.shell.focus();
        this.wasShellFocused = false;
      }
    },
    handleBlur() {
      const activeElement = document.activeElement;
      if (activeElement.tagName === "TEXTAREA" || activeElement.className === "tabulator-tableholder") {
        this.wasShellFocused = true;
      }
    },
    destroyShell() {
      if (this.shell) {
        this.shell
          .getWrapperElement()
          .parentNode.removeChild(this.shell.getWrapperElement());
      }
    },
    async initialize(options: InitializeOptions = {}) {
      await this.$nextTick();

      this.destroyShell();
      await this.$nextTick();
      this.promptLine = 0;

      const indicatorOpen = document.createElement("span");
      indicatorOpen.classList.add("foldgutter", "btn-fab", "open-close");
      indicatorOpen.innerHTML = `<i class="dropdown-icon material-icons">keyboard_arrow_down</i>`;

      const indicatorFolded = document.createElement("span");
      indicatorFolded.classList.add("foldgutter", "btn-fab", "open-close");
      indicatorFolded.innerHTML = `<i class="dropdown-icon material-icons">keyboard_arrow_right</i>`;

      const cm = CodeMirror.fromTextArea(this.$refs.shell, {
        tabSize: 2,
        lineNumbers: false,
        lineWrapping: true,
        theme: "monokai",
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "Shift-Tab": "indentLess",
          [this.cmCtrlOrCmd("F")]: "findPersistent"
        },
        // @ts-expect-error not fully typed
        options: {
          closeOnBlur: false,
        },
        mode: 'mongo',
        hint: this.hint,
        hintOptions: this.hintOptions,
        keyMap: options.userKeymap,
        // Add folding capability with custom indicators
        // @ts-expect-error not fully typed
        foldGutter: {
        // @ts-expect-error not fully typed
          rangeFinder: CodeMirror.fold.brace, // Use brace folding
          gutter: "CodeMirror-foldgutter",
          indicatorOpen: indicatorOpen,
          indicatorFolded: indicatorFolded,
        },
        // @ts-expect-error not fully typed
        gutters: [ { className: "CodeMirror-foldgutter", style: "width: 18px"}],
      });

      cm.getWrapperElement().classList.add("text-editor");
      cm.setValue(this.prompt);
      cm.setCursor({ line: cm.lineCount() - 1, ch: this.prompt.length });

      cm.on("beforeChange", (_cm, change) => {
        // Prevent editing before current prompt
        if (change.from.line < this.promptLine || (change.from.line === this.promptLine && change.from.ch < this.prompt.length)) {
          // Update the change to type in the prompt, and move the cursor there
          change.update({ line: this.shell.lastLine(), ch: Infinity }, { line: this.shell.lastLine(), ch: Infinity });
          this.shell.setCursor({ line: this.shell.lastLine(), ch: Infinity });
        }
      })

      cm.on("keydown", (_cm, event) => {
        if (event.key === "Enter") {
          if (event.shiftKey) {
            // newline
            return;
          }
          event.preventDefault();
          this.executeCommand();
        } else if (event.key === "ArrowUp") {
          if (event.ctrlKey) {
            event.preventDefault();
            this.navigateHistory(-1);
          }
        } else if (event.key === "ArrowDown") {
          if (event.ctrlKey) {
            event.preventDefault();
            this.navigateHistory(1);
          }
        }
      })

      const cmEl = this.$refs.shell.parentNode.querySelector(".CodeMirror");
      if (options.userKeymap === "vim") {
        const codeMirrorVimInstance = cmEl.CodeMirror.constructor.Vim;

        if (!codeMirrorVimInstance) {
          console.error("Could not find code mirror vim instance");
        } else {
          if (this.vimConfig) {
            applyConfig(codeMirrorVimInstance, this.vimConfig);
          }
          await setKeybindingsFromVimrc(codeMirrorVimInstance);

          // cm throws if this is already defined, we don't need to handle that case
          try {
            codeMirrorVimInstance.defineRegister(
              "*",
              new Register(this.$native.clipboard)
            );
          } catch (e) {
            // nothing
          }
        }
      }

      if (this.plugins) {
        this.plugins.forEach((plugin: (cm: CodeMirror.Editor) => void) => {
          plugin(cm);
        });
      }

      if (this.firstInitialization && this.focus) {
        cm.focus();
      }

      this.shell = cm;
      this.firstInitialization = false;

      this.$nextTick(() => {
        this.$emit("initialized");
      })
    },
    async executeCommand() {
      const doc = this.shell.getDoc();
      const lastLineNum = this.shell.lastLine();
      const userCommand = doc.getRange({ line: this.promptLine, ch: this.prompt.length }, { line: lastLineNum, ch: Infinity }).trim();

      if (!userCommand) return;

      this.commandHistory.push(userCommand);
      this.historyIndex = this.commandHistory.length;

      if (userCommand === "clear") {
        this.firstInitialization = true;
        this.initialize({ userKeymap: this.userKeymap });
        this.$emit('clear');
        return;
      }

      this.$emit('submitCommand', userCommand)
    },
    resetPrompt() {
      const doc = this.shell.getDoc();
      doc.replaceRange(`\n${this.prompt}`, { line: this.shell.lineCount(), ch: 0 });

      this.promptLine = this.shell.lastLine();
      this.shell.setCursor({ line: this.promptLine, ch: this.prompt.length });

      this.$nextTick(() => {
        setTimeout(() => this.shell.scrollTo(null, this.shell.getScrollInfo().height), 10);
      });
    },
    navigateHistory(direction) {
      if (this.commandHistory.length === 0) return;
      const doc = this.shell.getDoc();

      this.historyIndex += direction;
      if (this.historyIndex < 0) this.historyIndex = 0;
      if (this.historyIndex >= this.commandHistory.length) {
        doc.replaceRange('', { line: this.promptLine, ch: this.prompt.length }, { line: this.shell.lastLine(), ch: Infinity });
        return;
      }

      doc.replaceRange(this.commandHistory[this.historyIndex], { line: this.promptLine, ch: this.prompt.length }, { line: this.shell.lastLine(), ch: Infinity });
    },
    handleSwitchUserKeymap(value) {
      this.initialize({ userKeymap: value });
    },
  },
  async mounted() {
    this.promptSymbol = await this.connection.getShellPrompt();
    await this.initialize({
      userKeymap: this.userKeymap,
    });

    if (this.focus) {
      this.shell.focus();
    }

    window.addEventListener('focus', this.focusShell);
    window.addEventListener('blur', this.handleBlur);
    this.registerHandlers(this.rootBindings);
  },
  beforeDestroy() {
    window.removeEventListener('focus', this.focusShell);
    window.removeEventListener('blur', this.handleBlur);
    this.destroyShell();
    this.unregisterHandlers(this.rootBindings);
  }
}
</script>

<style lang="scss">
@use 'sass:color';
@import '../../../assets/styles/app/_variables';
 
.cm-s-monokai .cm-prompt {
  color: $theme-primary;
  font-weight: bold;
}

.text-editor {
  .dropdown-icon:hover {
    color: color.adjust($theme-primary, $lightness: 15%);
  }
}

.ansi-output {
  user-select: text !important;
  white-space: pre-wrap;
  color: white;
  padding: 4px;
  margin: 0;
}

</style>

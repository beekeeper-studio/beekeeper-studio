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
import "codemirror/mode/javascript/javascript";
import "codemirror/addon/comment/comment";
import "codemirror/addon/dialog/dialog";
import "codemirror/addon/search/search";
import "codemirror/addon/search/jump-to-line";
import "codemirror/addon/scroll/annotatescrollbar";
import "codemirror/addon/search/matchesonscrollbar";
import "codemirror/addon/search/matchesonscrollbar.css";
import "codemirror/addon/search/searchcursor";
import "@/plugins/CMMongoHint";
import "@/vendor/show-hint";
import "@/lib/editor/CodeMirrorDefinitions";
import "codemirror/addon/merge/merge";
import CodeMirror from 'codemirror';
import { keymapTypes } from "@/lib/db/types";
import { mapState } from 'vuex';
import { plugins } from "@/lib/editor/utils";

interface InitializeOptions {
  userKeymap?: typeof keymapTypes[number]['value']
}

export default {
  props: [
    "output"
  ],
  data() {
    return {
      shell: null,
      promptSymbol: "mongo> ",
      commandBuffer: "",
      commandHistory: [],
      historyIndex: -1,
      promptLine: 0 // where current prompt starts
    }
  },
  computed: {
    ...mapState(['connection']),
    hintOptions() {
      return {
        promptLine: this.promptLine,
        promptSymbol: this.promptSymbol,
        connection: this.connection
      }
    },
    hint() {
      // @ts-expect-error not fully typed
      return CodeMirror.hint.javascript;
    },
    plugins() {
      return [plugins.autoComplete];
    }
  },
  watch: {
    hintOptions() {
      this.shell.setOption('hintOptions', this.hintOptions);
    },
    output(value) {
      const doc = this.shell.getDoc();
      const lastLineNum = this.shell.lastLine();
      let output = value.output;
      if (typeof output === 'object') {
        output = JSON.stringify(output);
      }
      doc.replaceRange(`\n${output}`, { line: lastLineNum + 1, ch: 0 });
      this.connection.getShellPrompt().then((v) => {
        this.promptSymbol = v;
        this.resetPrompt();
      })
    }
  },
  methods: {
    destroyShell() {
      if (this.shell) {
        this.shell
          .getWrapperElement()
          .parentNode.removeChild(this.shell.getWrapperElement());
      }
    },
    async initialize(_options: InitializeOptions = {}) {
      this.destroyShell();

      const cm = CodeMirror.fromTextArea(this.$refs.shell, {
        tabSize: 2,
        lineNumbers: false,
        lineWrapping: true,
        theme: "monokai",
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "Shift-Tab": "indentLess",
        },
        // @ts-expect-error not fully typed
        options: {
          closeOnBlur: false,
        },
        mode: 'javascript',
        hint: this.hint,
        hintOptions: this.hintOptions,
        keyMap: 'default', // figure out vim mode
      });

      cm.getWrapperElement().classList.add("text-editor");
      cm.setValue(this.promptSymbol);
      cm.setCursor({ line: cm.lineCount() - 1, ch: this.promptSymbol.length });

      cm.on("beforeChange", (_cm, change) => {
        // Prevent editing before current prompt
        if (change.from.line < this.promptLine || (change.from.line === this.promptLine && change.from.ch < this.promptSymbol.length)) {
          change.cancel();
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
          event.preventDefault();
          this.navigateHistory(-1);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          this.navigateHistory(1);
        }
      })

      if (this.plugins) {
        this.plugins.forEach((plugin: (cm: CodeMirror.Editor) => void) => {
          plugin(cm);
        });
      }

      this.shell = cm;
    },
    async executeCommand() {
      const doc = this.shell.getDoc();
      const lastLineNum = this.shell.lastLine();
      const userCommand = doc.getRange({ line: this.promptLine, ch: this.promptSymbol.length }, { line: lastLineNum, ch: Infinity }).trim();

      if (!userCommand) return;

      this.commandHistory.push(userCommand);
      this.historyIndex = this.commandHistory.length;

      this.$emit('submitCommand', userCommand)
    },
    resetPrompt() {
      const doc = this.shell.getDoc();
      doc.replaceRange(`\n${this.promptSymbol}`, { line: this.shell.lineCount(), ch: 0 });

      this.promptLine = this.shell.lastLine();
      this.shell.setCursor({ line: this.promptLine, ch: this.promptSymbol.length });

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
        doc.replaceRange('', { line: this.promptLine, ch: this.promptSymbol.length }, { line: this.shell.lastLine(), ch: Infinity });
        return;
      }

      doc.replaceRange(this.commandHistory[this.historyIndex], { line: this.promptLine, ch: this.promptSymbol.length }, { line: this.shell.lastLine(), ch: Infinity });
    }
  },
  async mounted() {
    this.promptSymbol = await this.connection.getShellPrompt();
    this.initialize();
  },
  beforeDestroy() {
    this.destroyShell();
  }
}
</script>

<style>

</style>

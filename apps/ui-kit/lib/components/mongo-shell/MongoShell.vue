<template>
  <div class="BksUiKit BksTextEditor BksMongoShell" ref="shell"></div>
</template>

<script lang="ts">
import { TextEditor } from '../text-editor/v2/TextEditor';
import { monokaiInit } from '@uiw/codemirror-theme-monokai';
import { Annotation, EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap as cmKeymap } from '@codemirror/view';
import props from './props';
import { addOutputEffect, OutputField } from './extensions/ansi-widget';
import { mongoMode } from './extensions/mongo-mode';
import { PromptLineField, PromptSymbolField, setPromptLineEffect, setPromptSymbolEffect } from './state';
import AnsiToHtml from 'ansi-to-html';

const ansiToHtml = new AnsiToHtml();

const SubmitAnnotation = Annotation.define<boolean>();
const BlockedEdit = Annotation.define();

export default {
  props,
  data() {
    return {
      shell: null,
      commandHistory: [],
      historyIndex: -1,
      promptLine: 0
    }
  },
  watch: {
    keymap() {
      if (!this.textEditor) return;
      this.applyKeymap();
    },
    vimOptions() {
      if (!this.textEditor) return;
      this.applyKeymap();
    },
    lineWrapping() {
      if (!this.textEditor) return;
      this.applyLineWrapping();
    },
    promptSymbol(value) {
      if (this.textEditor) {
        this.textEditor.dispatchChange({
          effects: [
            setPromptSymbolEffect.of(value)
          ]
        })
      } else {
        this.initialize();
      }
    },
    output(value) {
      const insertPos = this.textEditor.getLength();
      let output = value.output;

      if (typeof output === 'string' && /\x1b\[[0-9;]*m/.test(output)) {
        const html = ansiToHtml.toHtml(output);
        this.textEditor.dispatchChange({
          changes: { from: insertPos, insert: '\n' },
          effects: addOutputEffect.of({ pos: insertPos + 1, html }),
          scrollIntoView: true
        });
      } else if (typeof output === 'object') {
        let formattedOutput;
        try {
          formattedOutput = JSON.stringify(output, null, 2);
        } catch (err) {
          console.warn('Failed to stringify JSON output for mongo shell: ', err.message);
          formattedOutput = JSON.stringify(value.output);
        }
        this.textEditor.dispatchChange({
          changes: { from: insertPos, insert: `\n${formattedOutput}`},
          scrollIntoView: true
        })
      } else {
        this.textEditor.dispatchChange({
          changes: { from: insertPos, insert: `\n${output}`},
          scrollIntoView: true
        })
      }

      // this will need to update the shell prompt first
      this.resetPrompt();
    }
  },
  computed: {
    vimOptions() {
      return {
        config: this.vimConfig,
        keymaps: this.vimKeymaps,
        clipboard: this.clipboard
      }
    },
    replaceExtensions() {
      // we may want to move these to their own files
      // may have to bind this here
      const protectPrompt = EditorState.transactionFilter.of((tr) => {
        if (!tr.docChanged) return tr;

        let allow = true;
        const promptLine = tr.startState.field(PromptLineField);
        const promptSymbol = tr.startState.field(PromptSymbolField);
        const prompt = this.getPromptText(promptSymbol);
        tr.changes.iterChanges((fromA) => {
          const fromLine = tr.startState.doc.lineAt(fromA);
          const lineNumber = fromLine.number - 1; // 1-based, really?!?!
          const column = fromA - fromLine.from;

          if (
            lineNumber < promptLine ||
            (lineNumber === promptLine && column < prompt.length)
          ) {
            allow = false
          }
        });

        return allow ? tr : [tr.startState.update({ annotations: BlockedEdit.of(true)})];
      })

      const updateListener = EditorView.updateListener.of((update) => {
        for (const tr of update.transactions) {
          if (tr.annotation(BlockedEdit)) {
            const promptLine = update.state.field(PromptLineField);
            update.view.dispatch({
              selection: {
                anchor: update.state.doc.line(promptLine + 1).to
              },
              scrollIntoView: true
            })
          } else if (tr.annotation(SubmitAnnotation)) {
            const doc = update.state.doc;
            const promptLine = update.state.field(PromptLineField);
            const promptSymbol = update.state.field(PromptSymbolField);
            const prompt = this.getPromptText(promptSymbol);
            const promptLineObj = doc.line(promptLine + 1);
            const userCommand = doc.sliceString(
              promptLineObj.from + prompt.length,
              doc.length
            ).trim();

            if (!userCommand) {
              console.warn('Failed to find valid command to run')
              return
            }

            this.commandHistory.push(userCommand);
            this.historyIndex = this.commandHistory.length;

            if (userCommand === 'clear') {
              this.initialize();
              this.$emit('clear');
              return;
            }

            this.$emit('bks-shell-run-command', userCommand);
          }
        }
      })

      return (extensions) => {
        const ext = this.extensions || [];
        return [
          this.buildKeymap(),
          ...ext,
          ...extensions,
          mongoMode(),
          monokaiInit({
            settings: {
              selection: "",
              selectionMatch: "",
            },
          }),
          protectPrompt,
          updateListener,
          OutputField,
          PromptLineField,
          PromptSymbolField
        ]
      }
    }
  },
  methods: {
    applyLineWrapping() {
      this.textEditor.setLineWrapping(this.lineWrapping);
    },
    applyKeymap() {
      this.textEditor.setKeymap(this.keymap, this.vimOptions);
    },
    getPromptText(promptSymbol) {
      if (promptSymbol.length <= this.maxPromptSymbolLength) return promptSymbol;

      const startLength = Math.floor((this.maxPromptSymbolLength - 3) / 2);
      const endLength = this.maxPromptSymbolLength - 3 - startLength;
      const start = promptSymbol.substring(0, startLength);
      const end = promptSymbol.substring(promptSymbol.length - endLength)

      return `${start}...${end}`;
    },
    buildKeymap() {
      const shellKeymapCompartment = new Compartment();
      return shellKeymapCompartment.of(cmKeymap.of([
        {
          key: 'Shift-Enter',
          run: () => false
        },
        {
          key: 'Enter',
          run: (view) => {
            view.dispatch({
              annotations: SubmitAnnotation.of(true)
            })
            return true;
          }
        },
        {
          key: 'Ctrl-ArrowUp',
          run: () => {
            this.navigateHistory(-1);
            return true;
          }
        },
        {
          key: 'Ctrl-ArrowDown',
          run: () => {
            this.navigateHistory(1);
            return true;
          }
        }
      ]));
    },
    resetPrompt() {
      const promptSymbol = this.textEditor.getStateField(PromptSymbolField) as string;
      const promptText = `\n${this.getPromptText(promptSymbol)}`;
      const insertPos = this.textEditor.getLength();

      this.textEditor.dispatchChange({
        changes: { from: insertPos, insert: promptText },
        selection: { anchor: insertPos + promptText.length },
        scrollIntoView: true
      })

      const newPromptLine = this.textEditor.getLineAt(insertPos + promptText.length).number - 1;
      this.textEditor.dispatchChange({
        effects: [
          setPromptLineEffect.of(newPromptLine),
        ],
      })
    },
    navigateHistory(direction: 1 | -1) {
      if (this.commandHistory.length === 0) return;
      const promptSymbol = this.textEditor.getStateField(PromptSymbolField) as string;
      const promptLine = this.textEditor.getStateField(PromptLineField) as number;

      this.historyIndex += direction;
      if (this.historyIndex < 0) this.historyIndex = 0;
      const insertPos = this.textEditor.getLineInfo(promptLine + 1).from + promptSymbol.length;
      const length = this.textEditor.getLength();
      if (this.historyIndex >= this.commandHistory.length) {
        this.textEditor.dispatchChange({
          changes: { from: insertPos, to: length, insert: ''},
        });
        return;
      }

      const cmd = this.commandHistory[this.historyIndex];
      this.textEditor.dispatchChange({
        changes: { from: insertPos, to: length, insert: cmd },
      });
      const newLength = this.textEditor.getLength();
      this.textEditor.dispatchChange({
        selection: { anchor: newLength },
        scrollIntoView: true
      })
    },
    constructTextEditor() {
      return new TextEditor();
    },
    async initialize() {
      if (this.textEditor) {
        this.textEditor.destroy();
        this.textEditor = null;
      }

      await this.$nextTick();

      // destroy shell?
      this.promptLine = 0;

      const textEditor: TextEditor = this.constructTextEditor();

      textEditor.initialize({
        parent: this.$refs.shell,
        focus: true,
        onValueChange: (value) => {

        },
        initialValue: this.getPromptText(this.promptSymbol),
        // languageId: undefined, // We use mongoMode() extension instead
        keybindings: this.keybindings,
        lineNumbers: false,
        lineWrapping: this.lineWrapping,
        keymap: this.keymap,
        replaceExtensions: this.replaceExtensions,
        vimOptions: this.vimOptions,
      })

      this.textEditor = textEditor;

      const length = this.textEditor.getLength();

      // Initialize state fields
      this.textEditor.dispatchChange({
        effects: [
          setPromptLineEffect.of(0),
          setPromptSymbolEffect.of(this.promptSymbol)
        ],
        selection: { anchor: length }
      });

      //extensions
      this.$emit('bks-initialized');
    },
  },
  async mounted() {
    //this.promptSymbol = await this.connection.getShellPrompt();
    //await this.initialize();
  }
}
</script>

<template>
  <div class="BksUiKit BksTextEditor BksSqlTextEditor" ref="shell"></div>
</template>

<script lang="ts">
import { TextEditor } from '../text-editor/v2/TextEditor';
import { monokai } from '@uiw/codemirror-theme-monokai';
import { Annotation, EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import mixin from '../text-editor/v2/mixin';
import props from './props';
import { addOutputEffect } from './extensions/ansi-widget';
import AnsiToHtml from 'ansi-to-html';

const ansiToHtml = new AnsiToHtml();

const SubmitAnnotation = Annotation.define<boolean>();
const BlockedEdit = Annotation.define();

export default {
  mixins: [mixin],
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
    promptSymbol() {
      
    },
    output(value) {
      console.log('Running watcher for output')
      console.log('Current document content:', JSON.stringify(this.textEditor.getValue()))
      console.log('Document length from textEditor.getLength():', this.textEditor.getLength())
      console.log('Document length from view.state.doc.length:', this.textEditor.view.state.doc.length)
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
        console.log('Inserting changes. Pos: ', insertPos, 'output: ', output)
        this.textEditor.dispatchChange({
          changes: { from: insertPos, insert: `\n${output}`},
          scrollIntoView: true
        })
      }

      // this will need to update the shell prompt first
      //this.resetPrompt();
    }
  },
  computed: {
    replaceExtensions() {
      // we may want to move these to their own files
      // may have to bind this here
      const protectPrompt = EditorState.transactionFilter.of((tr) => {
        if (!tr.docChanged) return tr;

        let allow = true;
        tr.changes.iterChanges((fromA) => {
          const fromLine = tr.startState.doc.lineAt(fromA);
          const lineNumber = fromLine.number - 1; // 1-based, really?!?!
          const column = fromA - fromLine.from;

          if (
            lineNumber < this.promtLine ||
            (lineNumber === this.promptLine && column < this.prompt.length)
          ) {
            allow = false
          }
        });

        return allow ? tr : [tr.startState.update({ annotations: BlockedEdit.of(true)})];
      })

      const updateListener = EditorView.updateListener.of((update) => {
        for (const tr of update.transactions) {
          if (tr.annotation(BlockedEdit)) {
            update.view.dispatch({
              selection: {
                anchor: update.state.doc.line(this.promptLine + 1).to
              },
              scrollIntoView: true
            })
          } else if (tr.annotation(SubmitAnnotation)) {
            const doc = update.state.doc;
            const promptLineObj = doc.line(this.promptLine + 1);
            const userCommand = doc.sliceString(
              promptLineObj.from + this.prompt.length,
              doc.length
            ).trim();

            console.log('Submit command: ', userCommand)
            console.log('Document content at submit:', JSON.stringify(update.state.doc.toString()))
            console.log('Document length at submit:', update.state.doc.length)
            if (!userCommand) {
              console.warn('Failed to find valid command to run')
              return
            }

            this.commandHistory.push(userCommand);
            this.historyIndex = this.commandHistory.length;

            if (userCommand === 'clear') {
              // TODO (@day): implement clear
              return;
            }

            this.$emit('bks-shell-run-command', userCommand);
          }
        }
      })

      return (extensions) => {
        return [
          this.buildKeymap(),
          ...extensions,
          monokai,
          protectPrompt,
          updateListener
        ]
      }
    },
    prompt() {
      if (this.promptSymbol.length <= this.maxPromptSymbolLength) return this.promptSymbol;

      const startLength = Math.floor((this.maxPromptSymbolLength - 3) / 2);
      const endLength = this.maxPromptSymbolLength - 3 - startLength;
      const start = this.promptSymbol.substring(0, startLength);
      const end = this.promptSymbol.substring(this.promptSymbol.length - endLength)

      return `${start}...${end}`;
    }
  },
  methods: {
    buildKeymap() {
      const shellKeymapCompartment = new Compartment();
      return shellKeymapCompartment.of(keymap.of([
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
      const promptText = `\n${this.prompt}`;
      const insertPos = this.textEditor.getLength();

      this.textEditor.dispatchChange({
        changes: { from: insertPos, insert: promptText },
        selection: { anchor: insertPos + promptText.length },
        scrollIntoView: true
      })

      this.promptLine = this.textEditor.getLineAt(insertPos + 1) - 1;
    },
    navigateHistory(direction: 1 | -1) {
      console.log('navigateHistory: ', direction)
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
        onValueChange: (value) => {
          
        },
        initialValue: this.prompt,
        languageId: "javascript",
        keybindings: this.keybindings,
        lineNumbers: false,
        lineWrapping: this.lineWrapping,
        keymap: this.keymap,
        replaceExtensions: this.replaceExtensions,
        vimOptions: this.vimOptions,
      })

      this.textEditor = textEditor;

      //extensions

    },
  },
  async mounted() {
    //this.promptSymbol = await this.connection.getShellPrompt();
    await this.initialize();
  }
}
</script>

<style lang="scss" scoped>
</style>

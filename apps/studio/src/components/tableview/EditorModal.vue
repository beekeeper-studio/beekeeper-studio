<template>
  <portal to="modals">
    <modal :name="modalName" class="beekeeper-modal vue-dialog editor-dialog" @closed="onClose" @opened="onOpen">
      <div class="dialog-content">
        <div class="top">
          <div class="dialog-c-title">
            Editing Cell Content as
          </div>

          <select class="form-control language-select" v-model="language">
            <option disabled value="null" v-if="language == null">
              Select a language
            </option>
            <option v-for="(lang, idx) in languages" :key="idx" :value="lang.name">
              {{ lang.label }}
            </option>
          </select>
        </div>

        <div class="codeArea">
          <textarea name="editor" class="editor" ref="editorRef" cols="30" rows="10" />
        </div>
      </div>

      <ErrorAlert :error="error" />

      <div class="vue-dialog-buttons">
        <span class="expand" />
        <button @click.prevent="$modal.hide(modalName)" class="btn btn-sm btn-flat">
          Cancel
        </button>
        <button class="btn btn-sm btn-flat" @click.prevent="copy">
          Copy
        </button>
        <button class="btn btn-sm btn-primary" @click.prevent="save">
          Done
        </button>
      </div>
    </modal>
  </portal>
</template>


<script lang="ts">
import Vue from 'vue'
import CodeMirror from 'codemirror'
import 'codemirror/addon/comment/comment'
import 'codemirror/keymap/vim.js'
import 'codemirror/addon/dialog/dialog'
import 'codemirror/addon/search/search'
import 'codemirror/addon/search/jump-to-line'
import 'codemirror/addon/scroll/annotatescrollbar'
import 'codemirror/addon/search/matchesonscrollbar'
import 'codemirror/addon/search/matchesonscrollbar.css'
import 'codemirror/addon/search/searchcursor'
import { Languages, TextLanguage } from '../../lib/editor/languageData'
import setKeybindingsFromVimrc from '@/lib/readVimrc'
import ErrorAlert from '@/components/common/ErrorAlert.vue'

export default Vue.extend({
  name: "CellEditorModal",
  components: { ErrorAlert },
  props: ["tabid", "content", "cell", "languageprop"],
  // not a thing in Vue2
  // emits: ["updateContent", "updateCell", "updateLanguage"],
  data() {
    return {
      editor: null,
      error: null
    }
  },


  computed: {
    modalName() {
      return this.tabid ? `cell-editor-modal-${this.tabid}` : ""
    },
    userKeymap() {
      const value = this.settings?.keymap?.value;
      return value && this.keymapTypes.map(k => k.value).includes(value) ? value : 'default';
    },
    languages() {
      return Languages
    },
    language: {
      get(): string {
        return this.languageprop
      },
      set(value: string): void {
        this.$emit('updateLanguage', value)

        if (this.editor) {
          const language = this.findLanguage(value)

          if (language) {
            console.log(language.editorMode)
            this.editor.setOption("mode", language.editorMode)
          }
        }
      }
    }
  },

  methods: {
    findLanguage(customValue?: string) {
      this.content = ""
      const result = Languages.find((lang) => lang.name === (customValue ?? this.languageprop))
      return result ?? TextLanguage
    },

    copy() {
      this.$copyText(this.content)
      this.$noty.success("Copied the data to your clipboard!")
    },

    save() {
      this.error = null
      if (this.cell) {
        const language = this.findLanguage()

        if (language && language.isValid(this.content)) {
          this.$modal.hide(this.modalName)
          this.cell.setValue(language.minify(this.content))
          return
        } else {
          this.error = `Invalid ${this.language} content`
          this.$noty.error(this.error)
          return
        }
      }

      this.$noty.error("An unknown issue occured whilst trying to save your data")
    },

    onOpen() {
      const language = this.findLanguage()
      let content = this.content

      if (language) {
        content = language.beautify(content)
      }

      this.editor = CodeMirror.fromTextArea(this.$refs.editorRef, {
        lineNumbers: true,
        mode: language !== null ? language.editorMode : undefined,
        indentWithTabs: false,
        tabSize: 2,
        theme: 'monokai',
        extraKeys: {
          "Ctrl-Space": "autocomplete",
          "Shift-Tab": "indentLess",
          [this.cmCtrlOrCmd('F')]: 'findPersistent',
          [this.cmCtrlOrCmd('R')]: 'replace',
          [this.cmCtrlOrCmd('Shift-R')]: 'replaceAll'
        },
        options: {
          closeOnBlur: false
        },
        keyMap: this.userKeymap
      } as any)

      this.editor.setValue(content)
      this.editor.on("keydown", (_cm, e) => {
        if (this.$store.state.menuActive) {
          e.preventDefault()
        }
      })

      if (this.userKeymap === "vim") {
        const codeMirrorVimInstance = document.querySelector(".CodeMirror").CodeMirror.constructor.Vim
        if (!codeMirrorVimInstance) {
          console.error("Could not find code mirror vim instance");
        } else {
          setKeybindingsFromVimrc(codeMirrorVimInstance);
        }
      }

      this.editor.on("change", (cm) => {
        this.$emit("updateContent", cm.getValue())
      })

      this.editor.focus()

      setTimeout(() => {
        // this fixes the editor not showing because it doesn't think it's dom element is in view.
        // its a hit and miss error
        this.editor.refresh()
      }, 1)
    },

    onClose() {
      this.$emit("updateContent", "")
      this.$emit("updateCell", null)
      this.$emit("updateLanguage", null)
      this.editor = null
    },
  },
});
</script>



<style lang="scss" scoped>
.editor-dialog {
  .top {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 16px;

    padding-bottom: 1.5rem;

    .dialog-c-title {
      padding: 0 !important;
    }

    .language-select {
      width: 150px;

      margin: 0;
    }
  }

  .v--modal {
    display: flex;
    flex-direction: column;

    overflow: hidden;
  }

  .dialog-content {
    display: flex;
    flex-direction: column;

    height: 100%;
    flex: 1 !important;

    overflow: hidden;

    padding-bottom: 1.5rem !important;
  }

  .codeArea {
    flex: 1;
    height: 100%;

    overflow-y: scroll;

    .CodeMirror {
      min-height: 128px;
    }
  }
}
</style>

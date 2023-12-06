<template>
  <portal to="modals">
    <modal :name="modalName" class="beekeeper-modal vue-dialog editor-dialog" @opened="onOpen">
      <div class="dialog-content">
        <div class="top">
          <div class="dialog-c-title">
            Editing Cell Content as
          </div>

          <select class="form-control language-select" v-model="languageName">
            <option disabled value="" v-if="!languageName">
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
import { Languages, LanguageData, getLanguageByName, getLanguageByContent } from '../../lib/editor/languageData'
import setKeybindingsFromVimrc from '@/lib/readVimrc'
import ErrorAlert from '@/components/common/ErrorAlert.vue'
import { uuidv4 } from "@/lib/uuid"

export default Vue.extend({
  name: "CellEditorModal",
  components: { ErrorAlert },
  data() {
    return {
      editor: null,
      error: null,
      language: null,
      languageName: "",
      content: "",
      eventParams: null,
    }
  },


  computed: {
    modalName() {
      return uuidv4()
    },
    userKeymap() {
      const value = this.settings?.keymap?.value;
      return value && this.keymapTypes.map(k => k.value).includes(value) ? value : 'default';
    },
    languages() {
      return Languages
    },
  },

  watch: {
    languageName() {
      const language = getLanguageByName(this.languageName)
      if (language && this.editor) {
        this.editor.setOption("mode", language.editorMode)
        this.language = language
      }
    }
  },

  methods: {
    openModal(content: string, language: LanguageData, eventParams?: any) {
      language = language ? language : getLanguageByContent(content)
      this.language = language
      this.languageName = language.name
      this.content = content
      this.eventParams = eventParams
      this.$modal.show(this.modalName)
    },

    copy() {
      this.$copyText(this.content)
      this.$noty.success("Copied the data to your clipboard!")
    },

    save() {
      this.error = null

      if (this.language && this.language.isValid(this.content)) {
        this.$emit('save', this.content, this.language, this.eventParams)
        this.$modal.hide(this.modalName)
        return
      } else {
        this.error = `Invalid ${this.languageName} content`
        this.$noty.error(this.error)
        return
      }
    },

    onOpen() {
      const language = this.language
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
        this.content = cm.getValue()
      })

      this.editor.focus()

      setTimeout(() => {
        // this fixes the editor not showing because it doesn't think it's dom element is in view.
        // its a hit and miss error
        this.editor.refresh()
      }, 1)
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

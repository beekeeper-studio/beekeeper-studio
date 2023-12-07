<template>
  <portal to="modals">
    <modal :name="modalName" class="beekeeper-modal vue-dialog editor-dialog" @opened="onOpen">
      <div class="dialog-content" tabindex="0" @keydown.stop @keyup.stop @keypress.stop>
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

          <x-button
            class="btn btn-flat"
            title="Actions"
          >
            <i class="material-icons">settings</i>
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
              <x-menuitem @click.prevent="format" v-show="language.name !== 'text'">
                <x-label>Format {{ language?.label }}</x-label>
              </x-menuitem>
              <x-menuitem @click.prevent="minify">
                <x-label>Minify text</x-label>
              </x-menuitem>
              <x-menuitem @click.prevent="toggleWrapText">
                <x-label>{{ wrapText ? 'Unwrap text' : 'Wrap text' }}</x-label>
              </x-menuitem>
            </x-menu>
          </x-button>
        </div>

        <div class="editor-container">
          <textarea name="editor" ref="editorRef" />
        </div>
      </div>
      <div class="bottom">
        <span class="error-message" v-show="error">{{ error }}</span>

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
import { Languages, LanguageData, TextLanguage, getLanguageByName, getLanguageByContent } from '../../lib/editor/languageData'
import setKeybindingsFromVimrc from '@/lib/readVimrc'
import { uuidv4 } from "@/lib/uuid"
import _ from 'lodash'
import { mapGetters } from 'vuex'
import rawlog from 'electron-log'

const log = rawlog.scope('EditorModal')

export default Vue.extend({
  name: "CellEditorModal",
  data() {
    return {
      editor: null,
      error: "",
      language: TextLanguage,
      languageName: "text",
      content: "",
      eventParams: null,
      wrapText: TextLanguage.wrapTextByDefault,
    }
  },

  computed: {
    ...mapGetters({ 'settings': 'settings/settings' }),
    modalName() {
      return uuidv4()
    },
    userKeymap() {
      const value = this.settings?.keymap?.value;
      const keymapTypes = this.$config.defaults.keymapTypes
      return value && keymapTypes.map(k => k.value).includes(value) ? value : 'default';
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
        this.debouncedCheckForErrors();
      }
    },
  },

  methods: {
    openModal(content: any, language: LanguageData, eventParams?: any) {
      if (content === null) {
        content = ""
      }
      if (typeof content !== 'string') {
        content = JSON.stringify(content)
      }
      language = language ? language : getLanguageByContent(content)
      this.language = language
      this.languageName = language.name
      this.content = content
      this.eventParams = eventParams
      this.wrapText = language.wrapTextByDefault ?? false
      this.$modal.show(this.modalName)
    },

    copy() {
      this.$copyText(this.content)
      this.$noty.success("Copied the data to your clipboard!")
    },

    save() {
      this.$emit('save', this.content, this.language, this.eventParams)
      this.$modal.hide(this.modalName)
    },

    onOpen() {
      const language = this.language

      this.editor = CodeMirror.fromTextArea(this.$refs.editorRef, {
        lineNumbers: true,
        lineWrapping: this.wrapText,
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

      this.editor.setValue(this.content)
      this.editor.on("keydown", (_cm, e) => {
        if (this.$store.state.menuActive) {
          e.preventDefault()
        }
      })

      if (this.userKeymap === "vim") {
        const codeMirrorVimInstance = document.querySelector(".CodeMirror").CodeMirror.constructor.Vim
        if (!codeMirrorVimInstance) {
          log.error("Could not find code mirror vim instance");
        } else {
          setKeybindingsFromVimrc(codeMirrorVimInstance);
        }
      }

      this.editor.on("change", (cm) => {
        this.content = cm.getValue()
        this.debouncedCheckForErrors();
      })

      this.editor.focus()

      setTimeout(() => {
        // this fixes the editor not showing because it doesn't think it's dom element is in view.
        // its a hit and miss error
        this.editor.refresh()
      }, 1)

      this.$nextTick(this.resizeHeightToFitContent)
    },
    resizeHeightToFitContent() {
      const wrapperEl = this.editor.getWrapperElement()
      const wrapperStyle = window.getComputedStyle(wrapperEl)

      const minHeight = parseInt(wrapperStyle.minHeight)
      const maxHeight = parseInt(wrapperStyle.maxHeight)

      const sizerEl = wrapperEl.querySelector(".CodeMirror-sizer")

      const targetHeight = _.clamp(sizerEl.offsetHeight, minHeight, maxHeight)

      this.editor.setSize(null, targetHeight)
    },
    debouncedCheckForErrors: _.debounce(function() {
      const isValid = this.language.isValid(this.content)
      this.error = isValid ? "" : `Invalid ${this.language?.label} content`
    }, 50),
    toggleWrapText() {
      this.wrapText = !this.wrapText
      this.editor?.setOption("lineWrapping", this.wrapText)
    },
    format() {
      this.content = this.language.beautify(this.content)
      this.editor.setValue(this.content)
      this.$nextTick(this.resizeHeightToFitContent())
    },
    minify() {
      this.content = this.language.minify(this.content)
      this.editor.setValue(this.content)
    }
  },
});
</script>



<style lang="scss" scoped>
@import '@shared/assets/styles/_variables';

div.vue-dialog div.dialog-content {
  padding: 0;
  .top {
    padding: 1rem 1.2rem 1rem;
  }
}

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

    .wrap-text {
      display: flex;
      margin-left: auto;
      gap: 0.75rem;
      & > input {
        margin: 0;
      }
    }

    .btn.btn-flat {
      margin-left: auto;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
      min-width: auto;
      .material-icons {
        font-size: 16px;
      }
    }
  }

  .bottom {
    display: flex;
    align-items: center;
    padding: 1rem 1.2rem;
    .error-message {
      color: $brand-danger;
    }
    .vue-dialog-buttons {
      padding: 0;
      width: fit-content;
      margin-left: auto;
    }
  }

  .v--modal {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dialog-content {
    flex: 1 !important;
    overflow: hidden;
    padding: 0;
  }

  .editor-container::v-deep {
    & * {
      box-sizing: initial;
    }
    .CodeMirror {
      height: 300px;
      min-height: 300px;
      max-height: 556px;
      resize: vertical;
    }
  }
}
</style>

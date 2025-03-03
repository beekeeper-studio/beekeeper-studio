<template>
  <portal to="modals">
    <modal
      :name="modalName"
      class="beekeeper-modal vue-dialog editor-dialog"
      @opened="onOpen"
      @before-close="onBeforeClose"
    >
      <!-- Trap the key events so it doesn't conflict with the parent elements -->
      <div
        v-kbd-trap="true"
        @click.stop
        tabindex="0"
        @keydown.stop
        @keyup.stop="handleKeyUp"
        @keypress.stop
      >
        <div class="dialog-content">
          <div class="top">
            <div class="dialog-c-title">
              {{ isReadOnly ? "Viewing " : "Editing " }}as
            </div>

            <select
              class="form-control language-select"
              v-model="languageName"
            >
              <option
                disabled
                value=""
                v-if="!languageName"
              >
                Select a language
              </option>
              <option
                v-for="lang in languages"
                :key="lang.name"
                :value="lang.name"
              >
                {{ lang.label }}
              </option>
            </select>

            <x-button
              class="btn btn-flat"
              title="Actions"
            >
              <i class="material-icons">settings</i>
              <i class="material-icons">arrow_drop_down</i>
              <x-menu style="--align: end">
                <x-menuitem
                  @click.prevent="format"
                  v-show="!language.noBeautify"
                >
                  <x-label>Format {{ language.label }}</x-label>
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

          <!-- Prevent tabbing into the next element, caused by v-kbd-trap -->
          <div
            ref="editorContainer"
            class="editor-container"
            @keydown="$event.key === 'Tab' && $event.stopPropagation()"
            @keyup="$event.key === 'Tab' && $event.stopPropagation()"
          >
            <text-editor
              v-model="content"
              :mode="language.editorMode"
              :line-wrapping="wrapText"
              :height="editorHeight"
              :focus="editorFocus"
              @focus="editorFocus = $event"
              :readOnly="isReadOnly"
            />
          </div>
        </div>
        <div class="bottom">
          <span
            class="error-message"
            v-show="error"
          >{{ error }}</span>

          <div class="vue-dialog-buttons">
            <span class="expand" />
            <button
              @click.prevent="$modal.hide(modalName)"
              class="btn btn-sm btn-flat"
            >
              Cancel
            </button>
            <button
              class="btn btn-sm btn-flat"
              @click.prevent="copy"
            >
              Copy
            </button>
            <x-button
              v-if="language.noMinify"
              class="btn btn-primary btn-sm"
              @click.prevent="save"
              :disabled="isReadOnly"
            >
              <x-label>Apply</x-label>
            </x-button>
            <x-buttons v-else>
              <x-button
                class="btn btn-primary btn-small"
                :disabled="isReadOnly"
                @click.prevent="saveAndMinify"
              >
                <x-label>Minify & Apply</x-label>
              </x-button>
              <x-button
                :disabled="isReadOnly"
                class="btn btn-primary btn-small"
                menu
              >
                <i class="material-icons">arrow_drop_down</i>
                <x-menu style="--align: end">
                  <x-menuitem @click.prevent="save">
                    <x-label>Apply (no minify)</x-label>
                  </x-menuitem>
                </x-menu>
              </x-button>
            </x-buttons>
          </div>
        </div>
      </div>
    </modal>
  </portal>
</template>


<script lang="ts">
import Vue from 'vue'
import 'codemirror/addon/comment/comment'
import 'codemirror/keymap/vim.js'
import 'codemirror/addon/dialog/dialog'
import 'codemirror/addon/search/search'
import 'codemirror/addon/search/jump-to-line'
import 'codemirror/addon/scroll/annotatescrollbar'
import 'codemirror/addon/search/matchesonscrollbar'
import 'codemirror/addon/search/matchesonscrollbar.css'
import 'codemirror/addon/search/searchcursor'
import { Languages, LanguageData, TextLanguage, getLanguageByContent } from '../../lib/editor/languageData'
import { uuidv4 } from "@/lib/uuid"
import _ from 'lodash'
import { mapGetters } from 'vuex'
import TextEditor from '@/components/common/texteditor/TextEditor.vue'

export default Vue.extend({
  name: "CellEditorModal",
  data() {
    return {
      editorFocus: false,
      editorHeight: 100,
      error: "",
      languageName: "text",
      content: "",
      eventParams: null,
      wrapText: TextLanguage.wrapTextByDefault,
      isReadOnly: false
    }
  },
  components: { TextEditor },
  computed: {
    ...mapGetters({ 'settings': 'settings/settings' }),
    modalName() {
      return uuidv4()
    },
    userKeymap() {
      const value = this.settings?.keymap.value;
      const keymapTypes = this.$config.defaults.keymapTypes
      return value && keymapTypes.map(k => k.value).includes(value) ? value : 'default';
    },
    languages() {
      return Languages
    },
    language() {
      return Languages.find((lang) => lang.name === this.languageName);
    },
  },

  watch: {
    languageName() {
      this.debouncedCheckForErrors();
    },
    content() {
      this.debouncedCheckForErrors();
    },
  },

  methods: {
    openModal(content: any, language: LanguageData, eventParams?: any) {
      if (content === null) {
        content = ""
      } else if (ArrayBuffer.isView(content)) {
        content = content.toString()
      } else if (typeof content !== 'string') {
        content = JSON.stringify(content)
      }
      language = language ? language : getLanguageByContent(content)
      this.languageName = language.name
      try {
        this.content = language.beautify(content)
      } catch {
        this.content = content
      }
      this.eventParams = eventParams
      this.isReadOnly = eventParams?.isReadOnly
      this.wrapText = language.wrapTextByDefault ?? false
      this.$modal.show(this.modalName)
    },

    copy() {
      this.$copyText(this.content)
      this.$noty.success("Copied the data to your clipboard!")
    },

    saveAndMinify() {
      this.minify()
      this.save()
    },
    save() {
      this.$emit('save', this.content, this.language, this.eventParams?.cell)
      this.$modal.hide(this.modalName)
    },

    async onOpen() {
      await this.$nextTick();
      this.$refs.editorContainer.style.height = undefined
      this.editorFocus = true
      this.$nextTick(this.resizeHeightToFitContent)
    },
    async onBeforeClose() {
      // Hack: keep the modal height as it was before.
      this.$refs.editorContainer.style.height = this.$refs.editorContainer.offsetHeight + 'px'
      this.editorFocus = false
    },
    resizeHeightToFitContent() {
      const wrapperEl = this.$refs.editorContainer.querySelector('.CodeMirror')
      const wrapperStyle = window.getComputedStyle(wrapperEl)

      const minHeight = parseInt(wrapperStyle.minHeight)
      const maxHeight = parseInt(wrapperStyle.maxHeight)

      const sizerEl = wrapperEl.querySelector(".CodeMirror-sizer")

      this.editorHeight = _.clamp(sizerEl.offsetHeight, minHeight, maxHeight)
    },
    debouncedCheckForErrors: _.debounce(function() {
      const isValid = this.language.isValid(this.content)
      this.error = isValid ? "" : `Invalid ${this.language.label} content`
    }, 50),
    toggleWrapText() {
      this.wrapText = !this.wrapText
    },
    format() {
      this.content = this.language.beautify(this.content)
      this.$nextTick(this.resizeHeightToFitContent)
    },
    minify() {
      this.content = this.language.minify(this.content)
    },
    handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Escape") {
        this.$modal.hide(this.modalName)
      }
    }
  }
});
</script>



<style lang="scss" scoped>
@import '../../shared/assets/styles/_variables';

div.vue-dialog div.dialog-content {
  padding: 0;
  .top {
    padding: 1rem 1.2rem 1rem;
  }
}

.vue-dialog .vue-dialog-buttons x-buttons {
  x-button.btn {
    margin: 0;
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
      max-height: 55vh;
      resize: vertical;
    }
  }
}
</style>

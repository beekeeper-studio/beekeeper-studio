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

            <bk-button
              class="btn btn-flat"
              title="Actions"
            >
              <i class="material-icons">settings</i>
              <i class="material-icons">arrow_drop_down</i>
              <bk-menu style="--align: end">
                <bk-menuitem
                  togglable
                  @click.prevent="format"
                  v-show="!language.noBeautify"
                >
                  <bk-label>Format {{ language.label }}</bk-label>
                </bk-menuitem>
                <bk-menuitem @click.prevent="minify" togglable>
                  <bk-label>Minify text</bk-label>
                </bk-menuitem>
                <bk-menuitem
                  togglable
                  :toggled="wrapText"
                  @click.prevent="toggleWrapText"
                >
                  <bk-label class="flex-between">
                    Wrap Text
                  </bk-label>
                </bk-menuitem>
              </bk-menu>
            </bk-button>
          </div>

          <!-- Prevent tabbing into the next element, caused by v-kbd-trap -->
          <div
            ref="editorContainer"
            class="editor-container"
            @keydown="$event.key === 'Tab' && $event.stopPropagation()"
            @keyup="$event.key === 'Tab' && $event.stopPropagation()"
          >
            <text-editor
              :value="content"
              :language-id="language.languageId"
              :line-wrapping="wrapText"
              :is-focused="editorFocus"
              :read-only="isReadOnly"
              :replace-extensions="replaceExtensions"
              @focus="editorFocus = $event"
              @bks-value-change="content = $event.value"
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
            <bk-button
              v-if="language.noMinify"
              class="btn btn-primary btn-sm"
              @click.prevent="save"
              :disabled="isReadOnly"
            >
              <bk-label>Apply</bk-label>
            </bk-button>
            <bk-buttons v-else>
              <bk-button
                class="btn btn-primary btn-small"
                :disabled="isReadOnly"
                @click.prevent="saveAndMinify"
              >
                <bk-label>Minify & Apply</bk-label>
              </bk-button>
              <bk-button
                :disabled="isReadOnly"
                class="btn btn-primary btn-small"
                menu
              >
                <i class="material-icons">arrow_drop_down</i>
                <bk-menu style="--align: end">
                  <bk-menuitem @click.prevent="save">
                    <bk-label>Apply (no minify)</bk-label>
                  </bk-menuitem>
                </bk-menu>
              </bk-button>
            </bk-buttons>
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
import TextEditor from '@beekeeperstudio/ui-kit/vue/text-editor'
import { typedArrayToString } from "@/common/utils";
import { monokaiInit } from '@uiw/codemirror-theme-monokai';

export default Vue.extend({
  name: "CellEditorModal",
  props: {
    binaryEncoding: String,
  },
  data() {
    return {
      editorFocus: false,
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
      } else if (_.isTypedArray(content)) {
        content = typedArrayToString(content, this.binaryEncoding)
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
    },
    async onBeforeClose() {
      // Hack: keep the modal height as it was before.
      this.$refs.editorContainer.style.height = this.$refs.editorContainer.offsetHeight + 'px'
      this.editorFocus = false
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
    },
    minify() {
      this.content = this.language.minify(this.content)
    },
    handleKeyUp(e: KeyboardEvent) {
      if (e.key === "Escape" && this.userKeymap !== 'vim') {
        this.$modal.hide(this.modalName)
      }
    },
    replaceExtensions(extensions) {
      return [
        ...extensions,
        monokaiInit({
          settings: {
            selection: "",
            selectionMatch: "",
          },
        }),
      ]
    },
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

.vue-dialog .vue-dialog-buttons .bk-buttons {
  .bk-button.btn {
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
    .BksTextEditor {
      height: 300px;
      min-height: 300px;
      max-height: 55vh;
      resize: vertical;
      overflow: auto;
    }
  }
}
</style>

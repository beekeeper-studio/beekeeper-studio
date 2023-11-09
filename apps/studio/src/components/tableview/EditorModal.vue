<template>
  <portal to="modals">
    <modal
      :name="modalName"
      class="beekeeper-modal vue-dialog json-dialog"
      @closed="onClose"
      @opened="onOpen"
    >
      <div class="dialog-content">
        <div class="dialog-c-title">
          Editing Cell Content
        </div>

        <div class="codeArea">
          <textarea
            name="editor"
            class="editor"
            ref="editorRef"
            cols="30"
            rows="10"
          />
        </div>
      </div>

      <div class="vue-dialog-buttons">
        <span class="expand" />
        <button
          @click.prevent="$modal.hide(modalName)"
          class="btn btn-sm btn-flat"
        >
          Close
        </button>
        <button
          class="btn btn-sm btn-flat"
          @click.prevent="copy"
        >
          Copy
        </button>
        <button
          class="btn btn-sm btn-primary"
          @click.prevent="save"
        >
          Save
        </button>
      </div>
    </modal>
  </portal>
</template>

<style lang="scss">
.json-dialog {
  .v--modal {
    display: flex;
    flex-direction: column;

    overflow: hidden!important;
  }

  .dialog-content {
    display: flex;
    flex-direction: column;

    height: 100%;
    flex: 1!important;

    overflow: hidden;
  }

  .codeArea {
    flex: 1;
    height: 100%;

    overflow-y: scroll;
  }
}
</style>

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

export default Vue.extend({
  props: ["tabid", "content", "cell"],
  emits: ["updateContent"],

  data() {
    return {
      editor: null,
    }
  },

  methods: {
    copy() {
      this.$copyText(this.content)

      this.$noty.success("Copied the JSON data to your clipboard!")
    },

    save() {
      if (this.cell) {
        let parsed: Record<string, unknown> | null = null;

        try {
          parsed = JSON.parse(this.content)
        } catch (e) {
          log.error("Invalid JSON", e)

          this.$noty.error("Failed to save JSON as it is invalid")

          return
        }

        if (parsed) {
          this.$modal.hide(this.modalName)

          const saveData = JSON.stringify(parsed)

          this.cell.setValue(saveData)

          this.$noty.success("Successfully saved the JSON data")

          return
        }
      }

      this.$noty.error("An unknown issue occured whilst trying to save your JSON data")
    },

    onOpen() {
      this.editor = CodeMirror.fromTextArea(this.$refs.editorRef, {
        lineNumbers: true,
        mode: {
          name: "javascript",
          json: true,
          statementIndent: 2
        },
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
        // eslint-disable-next-line
        // @ts-ignore
        hint: CodeMirror.hint.json,
        keyMap: this.userKeymap
      } as CodeMirror.EditorConfiguration)

      this.editor.setValue(this.content)
      this.editor.on("keydown", (_cm, e) => {
        if (this.$store.state.menuActive) {
          e.preventDefault()
        }
      })

      if (this.userKeymap === "vim") {
        const codeMirrorVimInstance = document.querySelector(".CodeMirror").CodeMirror.constructor.Vim
        if(!codeMirrorVimInstance) {
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
      this.content = ""
      this.cell = null
    },
  },

  computed: {
    modalName() {
      return this.tabid ? `view-json-modal-${this.tabid}` : ""
    },
    userKeymap() {
      const value = this.settings?.keymap?.value;
      return value && this.keymapTypes.map(k => k.value).includes(value) ? value : 'default';
    },
  }
})
</script>

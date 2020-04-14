<template>
  <div class="query-editor" v-hotkey="keymap">
    <div class="top-panel" ref="topPanel">
      <textarea name="editor" class="editor" ref="editor" id="" cols="30" rows="10"></textarea>
      <span class="expand"></span>
      <div class="toolbar text-right">
        <div class="actions btn-group" ref="actions">
          <a @click.prevent="triggerSave" class="btn btn-flat">Save</a>
          <a href="" v-tooltip="'(ctrl + enter)'" @click.prevent="submitQuery" class="btn btn-primary">Run</a>
        </div>
      </div>
    </div>
    <div class="bottom-panel" ref="bottomPanel">
      <!-- <header class="toolbar row flex-middle" v-if="result">
        <span class="title expand">Results</span>
        <div class="actions btn-group">
          <a class="btn btn-fab" @click.prevent="download" v-tooltip="'Download Query Results'"><i class="material-icons">save_alt</i></a>
        </div>
      </header> -->
      <progress-bar v-if="running"></progress-bar>
      <result-table ref="table" v-else-if="result && result.rowCount > 0" :tableHeight="tableHeight" :result="result" :query='query'></result-table>
      <div class="alert alert-info" v-else-if="result"><i class="material-icons">info</i>Query Executed Successfully. No Results</div>
      <div class="alert alert-danger" v-else-if="error"><i class="material-icons">warning</i>{{error}}</div>
      <div v-else><!-- No Data --></div>
      <span class="expand" v-if="!result"></span>
      <footer class="status-bar row query-meta" v-bind:class="{'empty': !result}">
        <template v-if="result">
          <div class="row-counts">
            <span class="num-rows" v-if="result.rowCount > 0">{{result.rowCount}} Results</span>
            <span class="truncated-rows" v-if="result && result.truncated"> &middot; only {{result.truncatedRowCount}} shown.</span>
          </div>
          <span class="affected-rows" v-if="result && result.affectedRows">{{ affectedRowsText}}</span>
        </template>
        <template v-else>
          No Data
        </template>
        <span class="expand"></span>
        <a class="btn btn-fab" v-if="result" @click.prevent="download" v-tooltip="'Download Query Results'"><i class="material-icons">save_alt</i></a>
      </footer>
    </div>

    <!-- Save Modal -->
    <modal class="vue-dialog beekeeper-modal" name="save-modal" @closed="selectEditor" @opened="selectTitleInput" height="auto" :scrollable="true">
      <form @submit.prevent="saveQuery">
        <div class="dialog-content">
          <div class="dialog-c-title">Saved Query Name</div>
          <div class="modal-form">
            <div class="alert alert-danger save-errors" v-if="saveError">{{saveError}}</div>
            <div class="form-group">
                <input type="text" ref="titleInput" name="title" class="form-control"  v-model="tab.query.title" autofocus>
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button class="btn btn-flat" @click.prevent="$modal.hide('save-modal')">Cancel</button>
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>
    </modal>

  </div>
</template>

<script>

  import _ from 'lodash'
  import CodeMirror from 'codemirror'
  import Split from 'split.js'
  import Pluralize from 'pluralize'

  import { mapState } from 'vuex'

  import config from '@/config'
  import { ctrlOrCmd } from '@/lib/utils'
  import ProgressBar from './editor/ProgressBar'
  import ResultTable from './editor/ResultTable'

  export default {
    components: { ResultTable, ProgressBar },
    props: ['tab', 'active'],
    data() {
      return {
        result: null,
        running: false,
        editor: null,
        runningQuery: null,
        error: null,
        split: null,
        tableHeight: 0,
        savePrompt: false,
        unsavedText: null,
        saveError: null,
        lastWord: null,
      }
    },
    computed: {
      query() {
        return this.tab.query
      },
      queryText() {
        return this.tab.query.text
      },
      affectedRowsText() {
        if (!this.result) {
          return ""
        }
        return `${this.result.affectedRows} ${Pluralize('row', this.result.affectedRows)} affected`
      },
      hasText() {
        return this.query.text && this.query.text.replace(/\s+/, '').length > 0
      },
      hasTitle() {
        return this.query.title && this.query.title.replace(/\s+/, '').length > 0
      },
      splitElements() {
        return [
          this.$refs.topPanel,
          this.$refs.bottomPanel,
        ]
      },
      keymap() {
        const result = {}
        result[ctrlOrCmd('l')] = this.selectEditor
        return result
      },
      hintOptions() {
        const result = {}
        this.tables.forEach(table => {
          const cleanColumns = table.columns.map(col => {
            return col.columnName
          })
          result[table.name] = cleanColumns
        })
        return { tables: result }
      },
      ...mapState(['usedConfig', 'connection', 'database', 'tables'])
    },
    watch: {
      active() {
        if(this.active && this.editor) {
          this.editor.refresh()
          this.editor.focus()
        } else {
          this.$modal.hide('save-modal')
        }
      },
      hintOptions() {
        this.editor.setOption('hintOptions',this.hintOptions)
        // this.editor.setOptions('hint', CodeMirror.hint.sql)
        // this.editor.refresh()
      },
      queryText() {
        if (this.query.id && this.unsavedText === this.queryText) {
          this.tab.unsavedChanges = false
          return
        } else {
          this.tab.unsavedChanges = true
        }
      }
    },
    methods: {
      download() {
        this.$refs.table.download();
      },
      selectEditor() {
        this.editor.focus()
      },
      selectTitleInput() {
        this.$refs.titleInput.select()
      },
      updateEditorHeight() {
        let height = this.$refs.topPanel.clientHeight
        height -= this.$refs.actions.clientHeight
        this.editor.setSize(null, height)
      },
      triggerSave() {
        if (this.query.id) {
          this.saveQuery()
        } else {
          this.$modal.show('save-modal')
        }
      },
      async saveQuery() {
        if (!this.hasTitle || !this.hasText) {
          this.saveError = "You need both a title, and some query text."
        } else {
          await this.$store.dispatch('saveFavorite', this.query)
          this.$modal.hide('save-modal')
          this.$noty.success('Saved')
          this.unsavedText = this.tab.query.text
          this.tab.unsavedChanges = false
        }
      },
      async submitQuery() {
        this.running = true
        try {

          const runningQuery = this.connection.query(this.editor.getValue())
          const results = await runningQuery.execute()
          const result = results[0]
          // TODO (matthew): remove truncation logic somewhere sensible
          if (result.rowCount > config.maxResults) {
            result.rows = _.take(result.rows, config.maxResults)
            result.truncated = true
            result.truncatedRowCount = config.maxResults
          }

          this.result = result
          this.$store.dispatch('logQuery', { text: this.editor.getValue(), rowCount: result.rowCount})
        } catch (ex) {
          this.error = ex
          this.result = null
        } finally {
          this.running = false
        }
      },
      inQuote() {
        return false
      },
      maybeAutoComplete(editor, e) {
        // Currently this doesn't do anything.
        // BUGS:
        // 1. only on periods if not in a quote
        // 2. post-space trigger after a few SQL keywords
        //    - from, join
        const triggerWords = ['from', 'join']
        const triggers = {
          '190': 'period'
        }
        const space = 32
        if (editor.state.completionActive) return;
        if (triggers[e.keyCode] && !this.inQuote(editor, e)) {
          CodeMirror.commands.autocomplete(editor, null, { completeSingle: false });
          // return
        }
        if (e.keyCode === space) {
          try {
            const pos = _.clone(editor.getCursor());
            if (pos.ch > 0) {
              pos.ch = pos.ch - 2
            }
            const word = editor.findWordAt(pos)
            const lastWord = editor.getRange(word.anchor, word.head)
            if (!triggerWords.includes(lastWord.toLowerCase())) return;
            CodeMirror.commands.autocomplete(editor, null, { completeSingle: false });

          } catch (ex) {
            console.log('no keyup space autocomplete')
          }
        }
      }
    },
    mounted() {
      const $editor = this.$refs.editor
      // TODO (matthew): Add hint options for all tables and columns
      let startingValue = ""
      if (this.query.text) {
        startingValue = this.query.text
        this.unsavedText = this.query.text
        this.tab.unsavedChanges = false
      } else {
        this.tab.unsavedChanges = true
        for (var i = 0; i < 9; i++) {
            startingValue += '\n';
        }
      }

      this.$nextTick(() => {


        this.split = Split(this.splitElements, {
          elementStyle: (dimension, size) => ({
              'flex-basis': `calc(${size}%)`,
          }),
          sizes: [50,50],
          gutterSize: 8,
          direction: 'vertical',
          onDragEnd: () => {
            this.$nextTick(() => {
              this.tableHeight = this.$refs.bottomPanel.clientHeight
              this.updateEditorHeight()
            })
          }
        })

        const runQueryKeyMap = {
          "Ctrl-Enter": this.submitQuery,
          "Cmd-Enter": this.submitQuery,
          "Ctrl-S": this.triggerSave,
          "Cmd-S": this.triggerSave
        }

        this.editor = CodeMirror.fromTextArea($editor, {
          lineNumbers: true,
          mode: "text/x-sql",
          theme: 'monokai',
          extraKeys: {"Ctrl-Space": "autocomplete", "Cmd-Space": "autocomplete"},
          hint: CodeMirror.hint.sql,
          hintOptions: this.hintOptions
        })
        this.editor.setValue(startingValue)
        this.editor.addKeyMap(runQueryKeyMap)

        this.editor.on("change", (cm) => {
          this.tab.query.text = cm.getValue()

        })

        // TODO: make this not suck
        this.editor.on('keyup', this.maybeAutoComplete)
        this.editor.focus()

        setTimeout(() => {
          this.editor.refresh()
        }, 1)

        // this gives the dom a chance to kick in and render these
        // before we try to read their heights
        setTimeout(() => {
          this.tableHeight = this.$refs.bottomPanel.clientHeight
          this.updateEditorHeight()
        }, 1)

      })

    },
    beforeDestroy() {
      if(this.split) {
        console.log("destroying split")
        this.split.destroy()
      }
    },
  }
</script>


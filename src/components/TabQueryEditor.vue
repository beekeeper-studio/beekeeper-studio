<template>
  <div class="query-editor" v-hotkey="keymap">
    <div class="top-panel" ref="topPanel">
      <textarea name="editor" class="editor" ref="editor" id="" cols="30" rows="10"></textarea>
      <span class="expand"></span>
      <div class="toolbar text-right">
        <div class="actions btn-group" ref="actions">
          <x-button @click.prevent="triggerSave" class="btn btn-flat btn-small">Save</x-button>

          <x-buttons class="">
            <x-button class="btn btn-primary btn-small" v-tooltip="'Ctrl+Enter'" @click.prevent="submitTabQuery">
              <x-label>{{hasSelectedText ? 'Run Selection' : 'Run'}}</x-label>
            </x-button>
            <x-button class="btn btn-primary btn-small" menu>
              <i class="material-icons">arrow_drop_down</i>
              <x-menu>
                <x-menuitem @click.prevent="submitTabQuery">
                  <x-label>{{hasSelectedText ? 'Run Selection' : 'Run'}}</x-label>
                  <x-shortcut value="Control+Enter"></x-shortcut>
                </x-menuitem>
                <x-menuitem @click.prevent="submitCurrentQuery">
                  <x-label>Run Current</x-label>
                  <x-shortcut value="Control+Shift+Enter"></x-shortcut>
                </x-menuitem>
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </div>
    <div class="bottom-panel" ref="bottomPanel">
      <progress-bar v-if="running"></progress-bar>
      <result-table ref="table" v-else-if="rowCount > 0" :tableHeight="tableHeight" :result="result" :query='query'></result-table>
      <div class="message" v-else-if="result"><div class="alert alert-info"><i class="material-icons">info</i><span>Query Executed Successfully. No Results</span></div></div>
      <div class="message" v-else-if="error"><div class="alert alert-danger"><i class="material-icons">warning</i><span>{{error}}</span></div></div>
      <div v-else><!-- No Data --></div>
      <span class="expand" v-if="!result"></span>
      <statusbar :class="{'empty': !result, 'query-meta': true}">
        <template v-if="results.length > 0">
          <span v-show="results.length > 1" class="result-selector" :title="'Results'">
            <div class="select-wrap">
              <select name="resultSelector" id="resultSelector" v-model="selectedResult" class="form-control">
                <option v-for="(result, index) in results" :selected="selectedResult == index" :key="index" :value="index">Result {{index + 1}}</option>
              </select>
            </div>
          </span>
          <div class="row-counts row flex-middle" v-if="rowCount > 0" :title="'Records Displayed'">
            <span class="num-rows">{{rowCount}}</span>
            <span class="truncated-rows" v-if="result && result.truncated">/&nbsp;{{result.truncatedRowCount}}</span>
            <span class="records">records</span>
          </div>
          <span class="affected-rows" v-if="affectedRowsText " :title="'Rows Affected'">{{ affectedRowsText}}</span>
          <span class="execute-time row flex-middle" v-if="executeTimeText" :title="'Execution Time'">
            <i class="material-icons">query_builder</i>
            <span>{{executeTimeText}}</span>
          </span>
          <span class="expand"></span>
        </template>
        <template v-else>
          <span class="expand"></span>
          <span class="empty">No Data</span>
        </template>
        <x-buttons class="download-results" v-if="result">
          <x-button class="btn btn-link btn-small" v-tooltip="'Download Results (CSV)'" @click.prevent="download('csv')">
            Download
          </x-button>
          <x-button class="btn btn-link btn-small" menu>
            <i class="material-icons">arrow_drop_down</i>
            <x-menu>
              <x-menuitem @click.prevent="download('csv')">
                <x-label>CSV</x-label>
              </x-menuitem>
              <x-menuitem @click.prevent="download('xlsx')">
                <x-label>Excel</x-label>
              </x-menuitem>
              <x-menuitem @click.prevent="download('json')">
                <x-label>JSON</x-label>
              </x-menuitem>
            </x-menu>
          </x-button>
        </x-buttons>
      </statusbar>
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
          <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('save-modal')">Cancel</button>
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>
    </modal>

    <!-- Parameter modal -->
    <modal class="vue-dialog beekeeper-modal" name="parameters-modal" @opened="selectFirstParameter" @closed="selectEditor" height="auto" :scrollable="true">
      <form @submit.prevent="submitQuery(queryForExecution, true)">
        <div class="dialog-content">
          <div class="dialog-c-title">Provide parameter values</div>
          <div class="dialog-c-subtitle">Don't forget to use single quotes around string values</div>
          <div class="modal-form">
            <div class="form-group">
                <div v-for="(param, index) in queryParameterPlaceholders" v-bind:key="index">
                  <div class="form-group row">
                    <label>{{param}}</label>
                    <input type="text" class="form-control" v-model="queryParameterValues[param]" autofocus ref="paramInput">
                  </div>
                </div>
            </div>
          </div>
        </div>
        <div class="vue-dialog-buttons">
          <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('parameters-modal')">Cancel</button>
          <button class="btn btn-primary" type="submit">Run</button>
        </div>
      </form>
    </modal>


  </div>
</template>

<script>

  import _ from 'lodash'
  import 'codemirror/addon/search/searchcursor'
  import CodeMirror from 'codemirror'
  import Split from 'split.js'
  import Pluralize from 'pluralize'

  import { mapState } from 'vuex'

  import { splitQueries, extractParams } from '../lib/db/sql_tools'
  import ProgressBar from './editor/ProgressBar'
  import ResultTable from './editor/ResultTable'
  import Statusbar from './common/StatusBar'
  import humanizeDuration from 'humanize-duration'

  export default {
    // this.queryText holds the current editor value, always
    components: { ResultTable, ProgressBar, Statusbar },
    props: ['tab', 'active'],
    data() {
      return {
        // result: null,
        results: [],
        running: false,
        selectedResult: 0,
        editor: null,
        runningQuery: null,
        error: null,
        split: null,
        tableHeight: 0,
        savePrompt: false,
        unsavedText: null,
        saveError: null,
        lastWord: null,
        cursorIndex: null,
        marker: null,
        queryParameterValues: {},
        queryForExecution: null,
        executeTime: 0

      }
    },
    computed: {
      hasSelectedText() {
        return this.editor ? !!this.editor.getSelection() : false
      },
      result() {
        return this.results[this.selectedResult]
      },
      query() {
        return this.tab.query
      },
      queryText() {
        return this.tab.query.text
      },
      individualQueries() {
        return splitQueries(this.queryText)
      },
      currentlySelectedQueryIndex() {
        let currentPos = 0
        const queries = this.individualQueries
        for (let i = 0; i < queries.length; i++) {
          currentPos += queries[i].length
          // currentPos += i == 0 ? queries[i].length : queries[i].length + 1
          if (currentPos >= this.cursorIndex) {
            return i
          }
        }
        return null
      },
      currentlySelectedQuery() {
        if (this.currentlySelectedQueryIndex == null) return null
        return this.individualQueries[this.currentlySelectedQueryIndex]
      },
      currentQueryPosition() {
        if(!this.editor || !this.currentlySelectedQuery) {
          return null
        }
        const otherCandidates = this.individualQueries.slice(0, this.currentlySelectedQueryIndex).filter((query) => query.includes(this.currentlySelectedQuery))
        let i = 0
        const cursor = this.editor.getSearchCursor(this.currentlySelectedQuery)
        while(i < otherCandidates.length + 1) {
          i ++
          if (!cursor.findNext()) return null
        }
        return {
          from: cursor.from(),
          to: cursor.to()
        }

      },
      affectedRowsText() {
        if (!this.result) {
          return null
        }

        const rows = this.result.affectedRows || 0
        return `${rows} ${Pluralize('row', rows)} affected`
      },
      executeTimeText() {
        if (!this.executeTime) {
          return null
        }
        const executeTime = this.executeTime || 0
        return humanizeDuration(executeTime)
      },
      rowCount() {
        return this.result && this.result.rows ? this.result.rows.length : 0
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
        result[this.ctrlOrCmd('l')] = this.selectEditor
        return result
      },
      connectionType() {
        return this.connection.connectionType;
      },
      hintOptions() {
        const result = {}
        this.tables.forEach(table => {
          const cleanColumns = table.columns.map(col => {
            return col.columnName
          })
          if (this.connectionType === 'postgresql' && /[A-Z]/.test(table.name)) {
            result[`"${table.name}"`] = cleanColumns
          }
          result[table.name] = cleanColumns
        })
        return { tables: result }
      },
      queryParameterPlaceholders() {
        let query = this.queryForExecution
        return extractParams(query)
      },
      deparameterizedQuery() {
        let query = this.queryForExecution
        if (_.isEmpty(query)) {
          return query;
        }
        _.each(this.queryParameterPlaceholders, param => {
          query = query.replace(new RegExp(`(\\W|^)${this.escapeRegExp(param)}(\\W|$)`), `$1${this.queryParameterValues[param]}$2`)
        });
        return query;
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
      currentQueryPosition() {
        if (this.marker){
          this.marker.clear()
        }

        if(this.individualQueries.length < 2) {
          return;
        }

        if (!this.currentQueryPosition) {
          return
        }
        const { from, to } = this.currentQueryPosition
        this.marker = this.editor.getDoc().markText(from, to, {className: 'highlight'})
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
      download(format) {
        this.$refs.table.download(format);
      },
      selectEditor() {
        this.editor.focus()
      },
      selectTitleInput() {
        this.$refs.titleInput.select()
      },
      selectFirstParameter() {
        if (!this.$refs['paramInput'] || this.$refs['paramInput'].length == 0) return
        this.$refs['paramInput'][0].select()        
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
      escapeRegExp(string) {
        return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
      },
      async submitCurrentQuery() {
        if (this.currentlySelectedQuery) {
          this.submitQuery(this.currentlySelectedQuery)
        } else {
          this.results = []
          this.error = 'No query to run'
        }
      },
      async submitTabQuery() {
        const text = this.hasSelectedText ? this.editor.getSelection() : this.editor.getValue()
        this.submitQuery(text)
      },
      async submitQuery(rawQuery, skipModal) {
        this.running = true
        this.queryForExecution = rawQuery
        this.results = []
        this.selectedResult = 0

        try {
          if (this.queryParameterPlaceholders.length > 0 && !skipModal) {
            this.$modal.show('parameters-modal')
            return
          }

          const query = this.deparameterizedQuery
          this.$modal.hide('parameters-modal')

          const runningQuery = this.connection.query(query)
          const queryStartTime = +new Date()
          const results = await runningQuery.execute()
          const queryEndTime = +new Date()
          this.executeTime = queryEndTime - queryStartTime
          let totalRows = 0
          results.forEach(result => {
            result.rowCount = result.rowCount || 0

            // TODO (matthew): remove truncation logic somewhere sensible
            totalRows += result.rowCount
            if (result.rowCount > this.$config.maxResults) {
              result.rows = _.take(result.rows, this.$config.maxResults)
              result.truncated = true
              result.truncatedRowCount = this.$config.maxResults
            }
          })
          this.results = results
          this.$store.dispatch('logQuery', { text: query, rowCount: totalRows})
        } catch (ex) {
          this.error = ex
        } finally {
          this.running = false
        }
      },
      inQuote() {
        return false
      },
      wrapIdentifier(value) {
        if (value && this.connectionType === 'postgresql' && /[A-Z]/.test(value)) {
          return `"${value.replace(/^"|"$/g, '')}"`
        }
        return value;
      },
      maybeAutoComplete(editor, e) {
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
      },
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
          "Shift-Ctrl-Enter": this.submitCurrentQuery,
          "Shift-Cmd-Enter": this.submitCurrentQuery,
          "Ctrl-Enter": this.submitTabQuery,
          "Cmd-Enter": this.submitTabQuery,
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
          // this also updates `this.queryText`
          this.tab.query.text = cm.getValue()
        })

        if (this.connectionType === 'postgresql')  {
          this.editor.on("beforeChange", (cm, co) => {
            const { to, from, origin, text } = co;
            if (origin === 'complete') {
              let [tableName, colName] = text[0].split('.');
              const newText = [[this.wrapIdentifier(tableName), this.wrapIdentifier(colName)].filter(s => s).join('.')]
              co.update(from, to, newText, origin);
            }
          })
        }

        // TODO: make this not suck
        this.editor.on('keyup', this.maybeAutoComplete)
        this.editor.on('cursorActivity', (editor) => this.cursorIndex = editor.getDoc().indexFromPos(editor.getCursor(true)))
        this.editor.focus()

        setTimeout(() => {
          // this fixes the editor not showing because it doesn't think it's dom element is in view.
          // its a hit and miss error
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


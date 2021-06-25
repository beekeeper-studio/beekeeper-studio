<template>
  <div class="query-editor" v-hotkey="keymap">
    <div class="top-panel" ref="topPanel" >
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
      <x-contextmenu>
        <x-menu>
          <x-menuitem @click.prevent="formatSql">
            <x-label>Format query</x-label>
            <x-shortcut value="Control+Shift+F"></x-shortcut>
          </x-menuitem>
        </x-menu>
      </x-contextmenu>
    </div>
    <div class="bottom-panel" ref="bottomPanel">
      <progress-bar @cancel="cancelQuery" v-if="running"></progress-bar>
      <result-table ref="table" v-else-if="rowCount > 0" :active="active" :tableHeight="tableHeight" :result="result" :query='query'></result-table>
      <div class="message" v-else-if="result"><div class="alert alert-info"><i class="material-icons">info</i><span>Query Executed Successfully. No Results</span></div></div>
      <div class="message" v-else-if="error"><div class="alert alert-danger"><i class="material-icons">warning</i><span>{{error}}</span></div></div>
      <div class="message" v-else-if="info"><div class="alert alert-info"><i class="material-icons">warning</i><span>{{info}}</span></div></div>
      <div class="layout-center expand" v-else>
        <shortcut-hints></shortcut-hints>
      </div>
      <!-- <span class="expand" v-if="!result"></span> -->
      <!-- STATUS BAR -->
      <query-editor-status-bar
        v-model="selectedResult"
        :results="results"
        :running="running"
        @download="download"
        @clipboard="clipboard"
        :executeTime="executeTime"
      ></query-editor-status-bar>
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
  import 'codemirror/addon/comment/comment'
  import Split from 'split.js'
  import { mapState } from 'vuex'
  import { identify } from 'sql-query-identifier'

  import { splitQueries, extractParams } from '../lib/db/sql_tools'
  import ProgressBar from './editor/ProgressBar.vue'
  import ResultTable from './editor/ResultTable.vue'
  import ShortcutHints from './editor/ShortcutHints.vue'

  import sqlFormatter from 'sql-formatter';

  import QueryEditorStatusBar from './editor/QueryEditorStatusBar.vue'
  import rawlog from 'electron-log'
  const log = rawlog.scope('query-editor')

  export default {
    // this.queryText holds the current editor value, always
    components: { ResultTable, ProgressBar, ShortcutHints, QueryEditorStatusBar},
    props: ['tab', 'active'],
    data() {
      return {
        results: [],
        running: false,
        selectedResult: 0,
        editor: null,
        runningQuery: null,
        error: null,
        info: null,
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
      dialect() {
        // dialect for sql-query-identifier
        const mappings = {
          'sqlserver': 'mssql',
          'sqlite': 'sqlite'
        }
        return mappings[this.connectionType] || 'generic'
      },
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
        if (!this.queryText) return []
        return splitQueries(this.queryText)
      },
      currentlySelectedQueryIndex() {
        const queries = this.individualQueries
        for (let i = 0; i < queries.length; i++) {
          if (this.cursorIndex <= queries[i].end + 1) return i
        }
        return null
      },
      currentlySelectedQuery() {
        if (this.currentlySelectedQueryIndex == null) return null
        return this.individualQueries[this.currentlySelectedQueryIndex]
      },
      currentQueryPosition() {
        if(!this.editor || !this.currentlySelectedQuery || !this.individualQueries) {
          return null
        }
        const qi = this.currentlySelectedQueryIndex
        const previousQuery = qi === 0 ? null : this.individualQueries[qi - 1]
        // adding 1 to account for semicolon
        const start = previousQuery ? previousQuery.end + 1: 0
        const end = this.currentlySelectedQuery.end

        return {
          from: start,
          to: end + 1
        }

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
        if (!this.active) return {}
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
            return /\./.test(col.columnName) ? `"${col.columnName}"` : col.columnName
          })

          // add quoted option for everyone that needs to be quoted
          if (this.connectionType === 'postgresql' && (/[^a-z0-9_]/.test(table.name) || /^\d/.test(table.name)))
            result[`"${table.name}"`] = cleanColumns
          
          // don't add table names that can get in conflict with database schema 
          if (!/\./.test(table.name))
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
          this.$nextTick(() => {
            this.editor.refresh()
            this.editor.focus()
          })
        } else {
          this.$modal.hide('save-modal')
        }
      },
      currentQueryPosition() {
        if (this.marker){
          this.marker.clear()
        }

        if(!this.individualQueries || this.individualQueries.length < 2) {
          return;
        }

        if (!this.currentQueryPosition) {
          return
        }
        const { from, to } = this.currentQueryPosition

        const editorText = this.editor.getValue()
        const lines = editorText.split(/\n/)

        const markStart = {
          line: null,
          ch: null
        }
        const markEnd = {
          line: null,
          ch: null
        }
        let startMarked = false
        let endMarked = false
        let startOfLine = 0
        lines.forEach((line, idx) => {
          const eol = startOfLine + line.length + 1
          if (startOfLine <= from && from <= eol && !startMarked) {
            markStart.line = idx
            markStart.ch = from - startOfLine
            startMarked = true
          }
          if (startOfLine <= to && to <= eol && !endMarked) {
            markEnd.line = idx
            markEnd.ch = to - startOfLine
            endMarked = true
          }
          startOfLine += line.length + 1
        })
        this.marker = this.editor.getDoc().markText(markStart, markEnd, {className: 'highlight'})
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
      async cancelQuery() {
        if(this.running && this.runningQuery) {
          this.running = false
          this.info = 'Query Execution Cancelled'
          await this.runningQuery.cancel()
          this.runningQuery = null
        }
      },
      download(format) {
        this.$refs.table.download(format)
      },
      clipboard() {
        this.$refs.table.clipboard()
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
          this.submitQuery(this.currentlySelectedQuery.text)
        } else {
          this.results = []
          this.error = 'No query to run'
        }
      },
      async submitTabQuery() {
        const text = this.hasSelectedText ? this.editor.getSelection() : this.editor.getValue()
        if (text.trim()) {
          this.submitQuery(text)
        } else {
          this.error = 'No query to run'
        }
      },
      async submitQuery(rawQuery, skipModal) {
        this.running = true
        this.queryForExecution = rawQuery
        this.results = []
        this.selectedResult = 0
        let identification = []
        try {
          identification = identify(rawQuery, { strict: false, dialect: this.dialect })
        } catch (ex) {
          log.error("Unable to identify query", ex)
        }

        try {
          if (this.queryParameterPlaceholders.length > 0 && !skipModal) {
            this.$modal.show('parameters-modal')
            return
          }

          const query = this.deparameterizedQuery
          this.$modal.hide('parameters-modal')

          this.runningQuery = this.connection.query(query)
          const queryStartTime = +new Date()
          const results = await this.runningQuery.execute()
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
              result.totalRowCount = result.rowCount
            }
          })
          this.results = Object.freeze(results);

          this.$store.dispatch('logQuery', { text: query, rowCount: totalRows})
          log.debug('identification', identification)
          const found = identification.find(i => {
            return i.type === 'CREATE_TABLE'
          })
          if (found) {
            this.$store.dispatch('updateTables')
          }
        } catch (ex) {
          log.error(ex)
          if(this.running) {
            this.error = ex
          }
        } finally {
          this.running = false
        }
      },
      inQuote() {
        return false
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
      formatSql() {
        this.editor.setValue(sqlFormatter.format(this.editor.getValue()))
        this.selectEditor()
      },
      toggleComment() {
        this.editor.execCommand('toggleComment')
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
          "Cmd-S": this.triggerSave,
          "Shift-Ctrl-F": this.formatSql,
          "Shift-Cmd-F": this.formatSql,
          "Ctrl-/": this.toggleComment,
          "Cmd-/": this.toggleComment,
          "Esc": this.cancelQuery
        }

        const modes = {
          'mysql': 'text/x-mysql',
          'postgresql': 'text/x-pgsql',
          'sqlserver': 'text/x-mssql',
        };
        this.editor = CodeMirror.fromTextArea($editor, {
          lineNumbers: true,
          mode: this.connection.connectionType in modes ? modes[this.connection.connectionType] : "text/x-sql",
          theme: 'monokai',
          extraKeys: {"Ctrl-Space": "autocomplete", "Cmd-Space": "autocomplete"},
          hint: CodeMirror.hint.sql,
          hintOptions: this.hintOptions
        })
        this.editor.setValue(startingValue)
        this.editor.addKeyMap(runQueryKeyMap)
        this.editor.on("keydown", (cm, e) => {
          if (this.$store.state.menuActive) {
            e.preventDefault()
          }
        })

        this.editor.on("change", (cm) => {
          // this also updates `this.queryText`
          this.tab.query.text = cm.getValue()
        })

        if (this.connectionType === 'postgresql')  {
          this.editor.on("beforeChange", (cm, co) => {
            const { to, from, origin, text } = co;

            const keywords = CodeMirror.resolveMode(this.editor.options.mode).keywords

            // quote names when needed
            if (origin === 'complete' && keywords[text[0].toLowerCase()] != true) {
              const names = text[0]
                .match(/("[^"]*"|[^.]+)/g)
                .map(n => /^\d/.test(n) ? `"${n}"` : n)
                .map(n => /[^a-z0-9_]/.test(n) && !/"/.test(n) ? `"${n}"` : n)
                .join('.')
  
              co.update(from, to, [names], origin)
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
        this.split.destroy()
      }
    },
  }
</script>


<template>
  <div class="query-editor">
    <div class="top-panel" ref="topPanel" >
      <MonacoEditor
        class="editor"
        v-model="queryText"
        :options="options"
        theme="vs-dark"
        language="sql"
        @editorWillMount="editorWillMount"
        @editorDidMount="editorDidMount"
      />
      <span class="expand"></span>
      <div class="toolbar text-right" ref="toolbar">
        <div class="actions btn-group">
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
      <div v-else><!-- No Data --></div>
      <span class="expand" v-if="!result"></span>
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

<script lang="ts">
  import Vue from 'vue'
  import { Component, Prop, Watch } from 'vue-property-decorator'

  import _ from 'lodash'

  //@ts-ignore
  import MonacoEditor from 'vue-monaco'
  import * as monaco from 'monaco-editor';
  import * as NodeSQLParser from 'node-sql-parser'
  import { languages, KeyCode, KeyMod } from 'monaco-editor';
  import Split from 'split.js'
  import { mapState } from 'vuex'

  import { splitQueries, extractParams } from '../lib/db/sql_tools'
  import { sqlMonacoDotSuggestion, sqlMonacoSuggestion } from '../lib/monaco-sql-suggestion'

  //@ts-ignore
  import ProgressBar from './editor/ProgressBar'
  //@ts-ignore
  import ResultTable from './editor/ResultTable'

  import sqlFormatter from 'sql-formatter';

  //@ts-ignore
  import QueryEditorStatusBar from './editor/QueryEditorStatusBar'

  type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor
  type CompletionItemProvider = monaco.languages.CompletionItemProvider

  const parser = new NodeSQLParser.Parser()

  @Component({
    components: { MonacoEditor, ResultTable, ProgressBar, QueryEditorStatusBar},
    props: ['tab', 'active'],
    computed: mapState(['usedConfig', 'connection', 'database', 'tables']),
  })
  export default class TabQueryEditor extends Vue {
    @Prop()
    tab!: any

    @Prop()
    active!: boolean

    // Data
    results: any[] = []
    queryText = ""
    currentQueryAST?: NodeSQLParser.AST
    individualQueries: string[] = [];
    running = false
    selectedResult = 0
    editor?: IStandaloneCodeEditor
    runningQuery?: any
    error: Nullable<string> = null
    info?: Nullable<string> = null
    split?: any
    tableHeight = 0
    savePrompt = false
    unsavedText = null
    saveError?: Nullable<string> = null
    lastWord = null
    cursorPosition: monaco.Position = new monaco.Position(0, 0)
    queryParameterValues: {[key: string]: string} = {}
    queryForExecution = ""
    executeTime = 0
    currentDecorations: string[] = []
    options = {
      quickSuggestions: true,
      wordBasedSuggestions: true,
      suggestOnTriggerCharacters: true,
    }

    // Computed
    usedConfig!: any
    connection!: any
    database!: string
    tables!: any[]

    get hasSelectedText() {
      return this.editor ? !!this.editor.getSelection() : false
    }

    get result() {
      return this.results[this.selectedResult]
    }

    get query() {
      return this.tab.query
    }

    get queryRanges() {
      const model = this.editor?.getModel()
      if (model) {
        return this.individualQueries.map(query => {
          const matches = model.findMatches(query, true, false, true, null, true)
          const match = _.last(matches)
          return match?.range!
        }).filter(range => !!range)
      }

      return []
    }

    get currentlySelectedQuery() {
      const i = this.queryRanges.findIndex(range => range.containsPosition(this.cursorPosition))
      return this.individualQueries[i]
    }

    get currentQueryRange() {
      return this.queryRanges.find(p => p.containsPosition(this.cursorPosition))
    }

    get rowCount() {
      return this.result && this.result.rows ? this.result.rows.length : 0
    }

    get hasText() {
      return this.query.text && this.query.text.replace(/\s+/, '').length > 0
    }

    get hasTitle() {
      return this.query.title && this.query.title.replace(/\s+/, '').length > 0
    }

    get splitElements() {
      return [
        this.$refs.topPanel,
        this.$refs.bottomPanel,
      ]
    }

    get connectionType() {
      return this.connection.connectionType;
    }

    get hintOptions(): { tables: {
      [table: string]: string[]
    } } {
      const result: any = {}
      this.tables.forEach(table => {
        const cleanColumns = table.columns.map((col: any) => {
          return col.columnName
        })
        if (this.connectionType === 'postgresql' && /[A-Z]/.test(table.name)) {
          result[`"${table.name}"`] = cleanColumns
        }
        result[table.name] = cleanColumns
      })
      return { tables: result }
    }

    get queryParameterPlaceholders() {
      let query = this.queryForExecution
      return extractParams(query)
    }

    get deparameterizedQuery() {
      let query = this.queryForExecution
      if (_.isEmpty(query)) {
        return query;
      }
      _.each(this.queryParameterPlaceholders, param => {
        query = query?.replace(new RegExp(`(\\W|^)${this.escapeRegExp(param)}(\\W|$)`), `$1${this.queryParameterValues[param]}$2`)
      });
      return query;
    }

    @Watch('active')
    onActiveChange() {
      if(this.active && this.editor) {
        this.$nextTick(() => {
          this.editor?.focus()
          this.editor?.layout()
        })
      } else {
        this.$modal.hide('save-modal')
      }
    }

    @Watch('queryText')
    onQueryTextChange() {
      this.individualQueries = splitQueries(this.queryText).map(s => s.trim())
      this.parseQuery()
      if (this.query.id && this.unsavedText === this.queryText) {
        this.tab.unsavedChanges = false
        return
      } else {
        this.tab.unsavedChanges = true
      }
    }

    parseQuery() {
      try {
        const { ast } = parser.parse(this.currentlySelectedQuery);
        if (ast instanceof Array) {
          this.currentQueryAST = _.first(ast);
        } else {
          this.currentQueryAST = ast;
        }
      } catch {
        // If error is because query is incomplete
      }
    }

    highlightCurrentQuery() {
      if (!this.currentQueryRange) {
        this.currentDecorations = this.editor?.deltaDecorations(this.currentDecorations, []) || []
      } else {
        this.currentDecorations = this.editor?.deltaDecorations(this.currentDecorations, [{
          range: this.currentQueryRange,
          options: {
            isWholeLine: true,
            className: 'highlight'
          }
        }]) || []
      }
    }

    async cancelQuery() {
      if(this.running && this.runningQuery) {
        this.running = false
        this.info = 'Query Execution Cancelled'
        await this.runningQuery.cancel()
        this.runningQuery = undefined
      }
    }

    download(format: string) {
      // @ts-ignore
      this.$refs.table.download(format)
    }

    clipboard() {
      // @ts-ignore
      this.$refs.table.clipboard()
    }

    selectEditor() {
      this.editor?.focus()
    }

    selectTitleInput() {
      // @ts-ignore
      this.$refs.titleInput.select()
    }

    selectFirstParameter() {
      // @ts-ignore
      if (!this.$refs['paramInput'] || this.$refs['paramInput'].length == 0) return
      // @ts-ignore
      this.$refs['paramInput'][0].select()
    }

    triggerSave() {
      if (this.query.id) {
        this.saveQuery()
      } else {
        this.$modal.show('save-modal')
      }
    }

    async saveQuery() {
      if (!this.hasTitle || !this.hasText) {
        this.saveError = "You need both a title, and some query text."
      } else {
        await this.$store.dispatch('saveFavorite', this.query)
        this.$modal.hide('save-modal')
        //@ts-ignore
        this.$noty.success('Saved')
        this.unsavedText = this.tab.query.text
        this.tab.unsavedChanges = false
      }
    }

    escapeRegExp(s: string) {
      return s.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
    }

    async submitCurrentQuery() {
      if (this.currentlySelectedQuery) {
        this.submitQuery(this.currentlySelectedQuery)
      } else {
        this.results = []
        this.error = 'No query to run'
      }
    }

    async submitTabQuery() {
      const model = this.editor?.getModel()
      const selection = this.editor?.getSelection()
      const selectedText = model && selection ? model.getValueInRange(selection) : undefined
      const text = selectedText || this.editor?.getValue() || ''
      if (text.trim()) {
        this.submitQuery(text)
      } else {
        this.error = 'No query to run'
      }
    }

    async submitQuery(rawQuery: string, skipModal = false) {
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

        this.runningQuery = this.connection.query(query)
        const queryStartTime = +new Date()
        const results = await this.runningQuery.execute()
        const queryEndTime = +new Date()
        this.executeTime = queryEndTime - queryStartTime
        let totalRows = 0
        results.forEach((result: any) => {
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
        if(this.running) {
          this.error = ex
        }
      } finally {
        this.running = false
      }
    }

    inQuote() {
      return false
    }

    formatSql() {
      this.editor?.setValue(sqlFormatter.format(this.editor.getValue()))
      this.selectEditor()
    }

    toggleComment() {
      this.editor?.trigger('', 'editor.action.commentLine', null)
    }

    editorWillMount() {
      languages.registerCompletionItemProvider("sql", this.getSqlCompletionProvider())
    }

    editorDidMount(editor: IStandaloneCodeEditor) {
      this.editor = editor
      this.editor.onDidChangeCursorPosition((event) => {
        this.cursorPosition = event.position.delta(undefined , -1)
        this.highlightCurrentQuery()
      })
      this.editor.addCommand(KeyMod.CtrlCmd | KeyCode.Shift | KeyCode.Enter, this.submitCurrentQuery)
      this.editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, this.submitCurrentQuery)
      this.editor.addCommand(KeyMod.CtrlCmd | KeyCode.KEY_S, this.triggerSave)
      this.editor.addCommand(KeyMod.CtrlCmd | KeyCode.Shift | KeyCode.KEY_F, this.formatSql)
      this.editor.addCommand(KeyMod.CtrlCmd | KeyCode.US_SLASH, this.toggleComment)
      this.editor.addCommand(KeyCode.Escape, this.cancelQuery)
    }

    getSqlCompletionProvider(): CompletionItemProvider {
      return {
        triggerCharacters: [' ', '.'],
        provideCompletionItems: (model, position, context) => {
          const textUntilPosition = model.getValueInRange({startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column})
          const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
          switch (context.triggerCharacter) {
            case '.': return sqlMonacoDotSuggestion(this.connectionType, textUntilPosition, range, this.hintOptions.tables, this.currentQueryAST)
            case ' ': return sqlMonacoSuggestion(this.connectionType, textUntilPosition, range, this.hintOptions.tables, this.currentQueryAST)
            default: return {
              suggestions: []
            }
          }
        }
      }
    }

    updateEditorHeight() {
      //@ts-ignore
      let height = this.$refs.topPanel.clientHeight
      //@ts-ignore
      height -= this.$refs.toolbar.clientHeight
      Array.from(document.getElementsByClassName('editor')).forEach(e => {
        // @ts-ignore
        e.style.height = `${height}px`
      })
      this.editor?.layout()
    }

    mounted() {
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
        // @ts-ignore
        this.split = Split(this.splitElements, {
          elementStyle: (dimension, size) => ({
              'flex-basis': `calc(${size}%)`,
          }),
          sizes: [50,50],
          gutterSize: 8,
          direction: 'vertical',
          onDragEnd: () => {
            this.$nextTick(() => {
              // @ts-ignore
              this.tableHeight = this.$refs.bottomPanel.clientHeight
              this.updateEditorHeight()
            })
          }
        })

        this.queryText = startingValue
      })
    }

    beforeDestroy() {
      if(this.split) {
        this.split.destroy()
      }
    }
  }
</script>


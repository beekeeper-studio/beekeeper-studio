<template>
  <div class="query-editor" v-hotkey="keymap">
    <div class="top-panel" ref="topPanel" @contextmenu.prevent.stop="showContextMenu">
      <merge-manager v-if="query && query.id" :originalText="originalText" :query="query" :unsavedText="unsavedText"
        @change="onChange" @mergeAccepted="originalText = query.text" />
      <div class="no-content" v-if="remoteDeleted">
        <div class="alert alert-danger">
          <i class="material-icons">error_outline</i>
          <div class="alert-body">
            This query was deleted by someone else. It is no longer editable.
          </div>
          <a @click.prevent="close" class="btn btn-flat">Close Tab</a>
        </div>
      </div>
      <textarea name="editor" class="editor" ref="editor" id="" cols="30" rows="10"></textarea>
      <span class="expand"></span>
      <div class="toolbar text-right">
        <div class="actions btn-group" ref="actions">
          <x-button @click.prevent="triggerSave" class="btn btn-flat btn-small">Save</x-button>

          <x-buttons class="">
            <x-button class="btn btn-primary btn-small" v-tooltip="'Ctrl+Enter'" @click.prevent="submitTabQuery">
              <x-label>{{ hasSelectedText ? 'Run Selection' : 'Run' }}</x-label>
            </x-button>
            <x-button class="btn btn-primary btn-small" menu>
              <i class="material-icons">arrow_drop_down</i>
              <x-menu>
                <x-menuitem @click.prevent="submitTabQuery">
                  <x-label>{{ hasSelectedText ? 'Run Selection' : 'Run' }}</x-label>
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
      <progress-bar @cancel="cancelQuery" :message="runningText" v-if="running"></progress-bar>
      <result-table ref="table" v-else-if="rowCount > 0" :active="active" :tableHeight="tableHeight" :result="result"
        :query='query'></result-table>
      <div class="message" v-else-if="result">
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <span>Query {{ selectedResult + 1 }}/{{ results.length }}: No Results. {{ result.affectedRows || 0 }} rows
            affected.
            See the select box in the bottom left ↙ for more query results.</span>
        </div>
      </div>
      <div class="message" v-else-if="errors">
        <error-alert :error="errors" />
      </div>
      <div class="message" v-else-if="info">
        <div class="alert alert-info">
          <i class="material-icon-outlined">info</i>
          <span>{{ info }}</span>
        </div>
      </div>
      <div class="layout-center expand" v-else>
        <shortcut-hints></shortcut-hints>
      </div>
      <!-- <span class="expand" v-if="!result"></span> -->
      <!-- STATUS BAR -->
      <query-editor-status-bar v-model="selectedResult" :results="results" :running="running" @download="download"
        @clipboard="clipboard" @clipboardJson="clipboardJson" @clipboardMarkdown="clipboardMarkdown"
        :executeTime="executeTime"></query-editor-status-bar>
    </div>

    <!-- Save Modal -->
    <portal to="modals">
      <modal class="vue-dialog beekeeper-modal" :name="`save-modal-${tab.id}`" @closed="selectEditor"
        @opened="selectTitleInput" height="auto" :scrollable="true">
        <form v-if="query" @submit.prevent="saveQuery">
          <div class="dialog-content">
            <div class="dialog-c-title">Saved Query Name</div>
            <div class="modal-form">
              <div class="alert alert-danger save-errors" v-if="saveError">{{ saveError }}</div>
              <div class="form-group">
                <input type="text" ref="titleInput" name="title" class="form-control" v-model="query.title" autofocus>
              </div>
            </div>
          </div>
          <div class="vue-dialog-buttons">
            <button class="btn btn-flat" type="button"
              @click.prevent="$modal.hide(`save-modal-${tab.id}`)">Cancel</button>
            <button class="btn btn-primary" type="submit">Save</button>
          </div>
        </form>
      </modal>
    </portal>

    <!-- Parameter modal -->
    <portal to="modals">
      <modal class="vue-dialog beekeeper-modal" :name="`parameters-modal-${tab.id}`" @opened="selectFirstParameter"
        @closed="selectEditor" height="auto" :scrollable="true">
        <form @submit.prevent="submitQuery(queryForExecution, true)">
          <div class="dialog-content">
            <div class="dialog-c-title">Provide parameter values</div>
            <div class="dialog-c-subtitle">You need to use single quotes around string values. Blank values are invalid
            </div>
            <div class="modal-form">
              <div class="form-group">
                <div v-for="(param, index) in queryParameterPlaceholders" v-bind:key="index">
                  <div class="form-group row">
                    <label>{{ param }}</label>
                    <input type="text" class="form-control" required v-model="queryParameterValues[param]" autofocus
                      ref="paramInput">
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="vue-dialog-buttons">
            <button class="btn btn-flat" type="button"
              @click.prevent="$modal.hide(`parameters-modal-${tab.id}`)">Cancel</button>
            <button class="btn btn-primary" type="submit">Run</button>
          </div>
        </form>
      </modal>
    </portal>
  </div>
</template>

<script>

import _ from 'lodash'
import CodeMirror from 'codemirror'

import Split from 'split.js'
import { mapGetters, mapState } from 'vuex'
import { identify } from 'sql-query-identifier'
import pluralize from 'pluralize'

import { splitQueries, extractParams } from '../lib/db/sql_tools'
import ProgressBar from './editor/ProgressBar.vue'
import ResultTable from './editor/ResultTable.vue'
import ShortcutHints from './editor/ShortcutHints.vue'

import { format } from 'sql-formatter';

import QueryEditorStatusBar from './editor/QueryEditorStatusBar.vue'
import rawlog from 'electron-log'
import ErrorAlert from './common/ErrorAlert.vue'
import { FormatterDialect } from "@shared/lib/dialects/models";
import MergeManager from '@/components/editor/MergeManager.vue'
import { AppEvent } from '@/common/AppEvent'
import { FavoriteQuery } from '@/common/appdb/models/favorite_query'

const log = rawlog.scope('query-editor')
const isEmpty = (s) => _.isEmpty(_.trim(s))
const editorDefault = "\n\n\n\n\n\n\n\n\n\n"

export default {
  // this.queryText holds the current editor value, always
  components: { ResultTable, ProgressBar, ShortcutHints, QueryEditorStatusBar, ErrorAlert, MergeManager },
  props: ['tab', 'active'],
  data() {
    return {
      results: [],
      running: false,
      runningCount: 1,
      runningType: 'all queries',
      selectedResult: 0,
      editor: null,
      runningQuery: null,
      error: null,
      errorMarker: null,
      saveError: null,
      info: null,
      split: null,
      tableHeight: 0,
      savePrompt: false,
      lastWord: null,
      cursorIndex: null,
      marker: null,
      queryParameterValues: {},
      queryForExecution: null,
      executeTime: 0,
      originalText: "",
      initialized: false,
      blankQuery: new FavoriteQuery(),
    }
  },
  computed: {
    ...mapGetters(['dialect', 'defaultSchema']),
    ...mapState(['usedConfig', 'connection', 'database', 'tables', 'storeInitialized']),
    ...mapState('data/queries', { 'savedQueries': 'items' }),
    shouldInitialize() {
      return this.storeInitialized && this.active && !this.initialized
    },
    remoteDeleted() {
      return this.storeInitialized && this.tab.queryId && !this.query
    },
    query() {
      return this.tab.findQuery(this.savedQueries || []) || this.blankQuery
    },
    queryTitle() {
      return this.query?.title
    },
    unsavedText: {
      get() {
        return this.tab.unsavedQueryText || ""
      },
      set(value) {
        this.tab.unsavedQueryText = value
      },
    },
    identifyDialect() {
      // dialect for sql-query-identifier
      const mappings = {
        'sqlserver': 'mssql',
        'sqlite': 'sqlite',
        'cockroachdb': 'psql',
        'postgresql': 'psql',
        'mysql': 'mysql',
        'mariadb': 'mysql',
        'redshift': 'psql',
      }
      return mappings[this.connectionType] || 'generic'
    },
    hasParams() {
      return !!this.queryParameterPlaceholders?.length
    },
    paramsModalRequired() {
      let result = false
      this.queryParameterPlaceholders.forEach((param) => {
        const v = this.queryParameterValues[param]
        if (!v || _.isEmpty(v.trim())) {
          result = true
        }
      })
      return result
    },
    errors() {
      const result = [
        this.error,
        this.saveError
      ].filter((e) => e)

      return result.length ? result : null
    },
    runningText() {
      return `Running ${this.runningType} (${pluralize('query', this.runningCount, true)})`
    },
    hasSelectedText() {
      return this.editor ? !!this.editor.getSelection() : false
    },
    result() {
      return this.results[this.selectedResult]
    },
    individualQueries() {
      if (!this.unsavedText) return []
      return splitQueries(this.unsavedText, this.identifyDialect)
    },
    currentlySelectedQueryIndex() {
      const queries = this.individualQueries
      for (let i = 0; i < queries.length; i++) {
        if (this.cursorIndex <= queries[i].end + 1) return i
      }
      return null
    },
    currentlySelectedQuery() {
      if (this.currentlySelectedQueryIndex === null) return null
      return this.individualQueries[this.currentlySelectedQueryIndex]
    },
    currentQueryPosition() {
      if (!this.editor || !this.currentlySelectedQuery || !this.individualQueries) {
        return null
      }
      const qi = this.currentlySelectedQueryIndex
      const previousQuery = qi === 0 ? null : this.individualQueries[qi - 1]
      // adding 1 to account for semicolon
      const start = previousQuery ? previousQuery.end + 1 : 0
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
      return !isEmpty(this.unsavedText)
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
      // Previously we had to provide a table: column[] mapping.
      // we don't need to provide the columns anymore because we fetch them dynamically.
      const result = {}
      this.tables.forEach(table => {
        if (table.schema && table.schema != this.defaultSchema) {
          // do nothing - don't add this table
        } else {
          // add quoted option for everyone that needs to be quoted
          if (this.connectionType === 'postgresql' && (/[^a-z0-9_]/.test(table.name) || /^\d/.test(table.name))) {
            result[`"${table.name}"`] = []
          }

          // don't add table names that can get in conflict with database schema
          if (!/\./.test(table.name)) {
            result[table.name] = []
          }
        }
      })
      return { tables: result }
    },
    queryParameterPlaceholders() {
      let params = this.individualQueries.flatMap((qs) => qs.parameters)

      if (this.currentlySelectedQuery && (this.hasSelectedText || this.runningType === 'current')) {
        params = this.currentlySelectedQuery.parameters
      }

      if (params.length && params[0] === '?') return []

      return _.uniq(params)
    },
    deparameterizedQuery() {
      let query = this.queryForExecution
      if (_.isEmpty(query)) {
        return query;
      }
      _.each(this.queryParameterPlaceholders, param => {
        query = query.replace(new RegExp(`(\\W|^)${this.escapeRegExp(param)}(\\W|$)`, 'g'), `$1${this.queryParameterValues[param]}$2`)
      });
      return query;
    },
    unsavedChanges() {
      if (_.trim(this.unsavedText) === "" && _.trim(this.originalText) === "") return false

      return !this.query?.id ||
        _.trim(this.unsavedText) !== _.trim(this.originalText)
    },
  },
  watch: {
    error() {
      if (this.errorMarker) {
        this.errorMarker.clear()
      }
      if (this.dialect === 'postgresql' && this.error && this.error.position) {
        const [a, b] = this.locationFromPosition(this.queryForExecution, parseInt(this.error.position) - 1, parseInt(this.error.position))
        this.errorMarker = this.editor.getDoc().markText(a, b, { className: 'error' })
        this.error.marker = { line: b.line + 1, ch: b.ch }
      }
    },
    queryTitle() {
      if (this.queryTitle) this.tab.title = this.queryTitle
    },
    shouldInitialize() {
      if (this.shouldInitialize) this.initialize()
    },
    unsavedText() {
      this.saveTab()
    },
    remoteDeleted() {
      if (this.remoteDeleted) {
        this.editor?.setOption('readOnly', 'nocursor')
        this.tab.unsavedChanges = false
        this.tab.alert = true
      } else {
        this.editor?.setOption('readOnly', false)
      }
    },
    unsavedChanges() {
      this.tab.unsavedChanges = this.unsavedChanges
    },
    active() {
      if (this.active && this.editor) {
        this.$nextTick(() => {
          this.editor.refresh()
          this.editor.focus()
        })
      } else {
        this.$modal.hide(`save-modal-${this.tab.id}`)
      }
    },
    currentQueryPosition() {
      if (this.marker) {
        this.marker.clear()
      }

      if (!this.individualQueries || this.individualQueries.length < 2) {
        return;
      }

      if (!this.currentQueryPosition) {
        return
      }
      const { from, to } = this.currentQueryPosition

      const editorText = this.editor.getValue()
      const lines = editorText.split(/\n/)

      const [markStart, markEnd] = this.locationFromPosition(editorText, from, to)
      this.marker = this.editor.getDoc().markText(markStart, markEnd, { className: 'highlight' })
    },
    tables() {
      this.editor?.setOption('hintOptions', this.hintOptions)
    }
  },
  methods: {

    find() {
      // trigger's codemirror's search functionality
      this.editor.execCommand('find')
    },
    replace() {
      // trigger's codemirror's search functionality
      this.editor.execCommand('replace')
    },
    replaceAll() {
      // trigger's codemirror's search functionality
      this.editor.execCommand('replaceAll')
    },
    locationFromPosition(queryText, ...rawPositions) {
      // 1. find the query text inside the editor
      // 2.

      const editorText = this.editor.getValue()

      const startCharacter = editorText.indexOf(queryText)
      const lines = editorText.split(/\n/)
      const positions = rawPositions.map((p) => p + startCharacter)

      const finished = positions.map((p) => false)
      const results = positions.map((p) => ({ line: null, ch: null }))

      let startOfLine = 0
      lines.forEach((line, idx) => {
        const eol = startOfLine + line.length + 1
        positions.forEach((p, pIndex) => {
          if (startOfLine <= p && p <= eol && !finished[pIndex]) {
            results[pIndex].line = idx
            results[pIndex].ch = p - startOfLine
            finished[pIndex] = true
          }
        })
        startOfLine += line.length + 1
      })
      return results
    },
    initialize() {
      this.initialized = true
      // TODO (matthew): Add hint options for all tables and columns\
      this.initializeQueries()
      const startingValue = this.unsavedText || this.query?.text || editorDefault
      console.log("starting value", startingValue)
      this.tab.unsavedChanges = this.unsavedChanges

      this.$nextTick(() => {
        this.split = Split(this.splitElements, {
          elementStyle: (dimension, size) => ({
            'flex-basis': `calc(${size}%)`,
          }),
          sizes: [50, 50],
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
          "Esc": this.cancelQuery,
          "F5": this.submitTabQuery,
          "Shift-F5": this.submitCurrentQuery
        }

        const modes = {
          'mysql': 'text/x-mysql',
          'postgresql': 'text/x-pgsql',
          'sqlserver': 'text/x-mssql',
        };

        const extraKeys = {}

        extraKeys[this.cmCtrlOrCmd('F')] = 'findPersistent'
        extraKeys[this.cmCtrlOrCmd('R')] = 'replace'
        extraKeys[this.cmCtrlOrCmd('Shift-R')] = 'replaceAll'


        this.editor = CodeMirror.fromTextArea(this.$refs.editor, {
          lineNumbers: true,
          mode: this.connection.connectionType in modes ? modes[this.connection.connectionType] : "text/x-sql",
          tabSize: 2,
          theme: 'monokai',
          extraKeys: {
            "Ctrl-Space": "autocomplete",
            "Shift-Tab": "indentLess",
            ...extraKeys
          },
          options: {
            closeOnBlur: false
          },
          hint: CodeMirror.hint.sql,
          hintOptions: this.hintOptions,
          getColumns: this.getColumnsForAutocomplete
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
          // this.tab.query.text = cm.getValue()
          this.unsavedText = cm.getValue()
        })

        if (this.connectionType === 'postgresql') {
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
    saveTab: _.debounce(function () {
      this.$store.dispatch('tabs/save', this.tab)
    }, 1000),
    close() {
      this.$root.$emit(AppEvent.closeTab)
    },
    showContextMenu(event) {
      const selectionDepClass = this.hasSelectedText ? '' : 'disabled';
      this.$bks.openMenu({
        item: this.tab,
        options: [
          {
            name: 'Undo',
            slug: '',
            handler: this.editorUndo,
            shortcut: this.ctrlOrCmd('z')
          },
          {
            name: 'Redo',
            slug: '',
            handler: this.editorRedo,
            shortcut: this.ctrlOrCmd('shift+z')
          },
          {
            name: 'Cut',
            slug: '',
            handler: this.editorCut,
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd('x')
          },
          {
            name: 'Copy',
            slug: '',
            handler: this.editorCopy,
            class: selectionDepClass,
            shortcut: this.ctrlOrCmd('c')
          },
          {
            name: 'Paste',
            slug: '',
            handler: this.editorPaste,
            shortcut: this.ctrlOrCmd('v')
          },
          {
            name: 'Delete',
            slug: '',
            handler: this.editorDelete,
            class: selectionDepClass
          },
          {
            name: 'Select All',
            slug: '',
            handler: this.editorSelectAll,
            shortcut: this.ctrlOrCmd('a')
          },
          {
            type: 'divider'
          },
          {
            name: "Format Query",
            slug: 'format',
            handler: this.formatSql,
            shortcut: this.ctrlOrCmd('shift+f')
          },
          {
            type: 'divider'
          },
          {
            name: "Find",
            slug: 'find',
            handler: this.find,
            shortcut: this.ctrlOrCmd('f')
          },
          {
            name: "Replace",
            slug: "replace",
            handler: this.replace,
            shortcut: this.ctrlOrCmd('r')
          },
          {
            name: "ReplaceAll",
            slug: "replace_all",
            handler: this.replaceAll,
            shortcut: this.ctrlOrCmd('shift+r')
          }
        ],
        event,
      })
    },
    async cancelQuery() {
      if (this.running && this.runningQuery) {
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
    clipboardJson() {
      const data = this.$refs.table.clipboard('json')
    },
    clipboardMarkdown() {
      const data = this.$refs.table.clipboard('md')
    },
    selectEditor() {
      this.editor.focus()
    },
    selectTitleInput() {
      this.$refs.titleInput.select()
    },
    selectFirstParameter() {
      if (!this.$refs['paramInput'] || this.$refs['paramInput'].length === 0) return
      this.$refs['paramInput'][0].select()
    },
    updateEditorHeight() {
      let height = this.$refs.topPanel.clientHeight
      height -= this.$refs.actions.clientHeight
      this.editor.setSize(null, height)
    },
    triggerSave() {
      if (this.query?.id) {
        this.saveQuery()
      } else {
        this.$modal.show(`save-modal-${this.tab.id}`)
      }
    },
    async saveQuery() {
      if (this.remoteDeleted) return
      if (!this.hasTitle || !this.hasText) {
        this.saveError = new Error("You need both a title, and some query text.")
        return
      } else {
        try {
          const payload = _.clone(this.query)
          payload.text = this.unsavedText
          this.$modal.hide(`save-modal-${this.tab.id}`)
          const id = await this.$store.dispatch('data/queries/save', payload)
          this.tab.queryId = id

          this.$nextTick(() => {
            this.unsavedText = this.query.text
            this.tab.title = this.query.title
            this.originalText = this.query.text
          })
          this.$noty.success('Query Saved')
        } catch (ex) {
          this.saveError = ex
          this.$noty.error(`Save Error: ${ex.message}`)
        }
      }
    },
    onChange(text) {
      this.unsavedText = text
      this.editor.setValue(text)
    },
    escapeRegExp(string) {
      return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
    },
    async submitCurrentQuery() {
      if (this.currentlySelectedQuery) {
        this.runningType = 'current'
        this.submitQuery(this.currentlySelectedQuery.text)
      } else {
        this.results = []
        this.error = 'No query to run'
      }
    },
    async submitTabQuery() {
      const text = this.hasSelectedText ? this.editor.getSelection() : this.editor.getValue()
      this.runningType = this.hasSelectedText ? 'selection' : 'everything'
      if (text.trim()) {
        this.submitQuery(text)
      } else {
        this.error = 'No query to run'
      }
    },
    async submitQuery(rawQuery, fromModal = false) {
      if (this.remoteDeleted) return;
      this.running = true
      this.error = null
      this.queryForExecution = rawQuery
      this.results = []
      this.selectedResult = 0
      let identification = []
      try {
        identification = identify(rawQuery, { strict: false, dialect: this.identifyDialect })
      } catch (ex) {
        log.error("Unable to identify query", ex)
      }

      try {
        if (this.hasParams && (!fromModal || this.paramsModalRequired)) {
          this.$modal.show(`parameters-modal-${this.tab.id}`)
          return
        }

        const query = this.deparameterizedQuery
        this.$modal.hide(`parameters-modal-${this.tab.id}`)
        this.runningCount = identification.length || 1
        this.runningQuery = this.connection.query(query)
        const queryStartTime = new Date()
        const results = await this.runningQuery.execute()
        const queryEndTime = new Date()
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

        const defaultResult = Math.max(results.length - 1, 0)

        const nonEmptyResult = _.chain(results).findLastIndex((r) => !!r.rows?.length).value()
        console.log("non empty result", nonEmptyResult)
        this.selectedResult = nonEmptyResult === -1 ? results.length - 1 : nonEmptyResult

        this.$store.dispatch('data/usedQueries/save', { text: query, numberOfRecords: totalRows, queryId: this.query?.id, connectionId: this.connection.id })
        log.debug('identification', identification)
        const found = identification.find(i => {
          return i.type === 'CREATE_TABLE' || i.type === 'DROP_TABLE' || i.type === 'ALTER_TABLE'
        })
        if (found) {
          this.$store.dispatch('updateTables')
        }
      } catch (ex) {
        log.error(ex)
        if (this.running) {
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
          // do nothing
        }
      }
    },
    formatSql() {
      this.editor.setValue(format(this.editor.getValue(), { language: FormatterDialect(this.dialect) }))
      this.selectEditor()
    },
    toggleComment() {
      this.editor.execCommand('toggleComment')
    },
    initializeQueries() {
      if (!this.tab.unsavedChanges && this.query?.text) {
        this.unsavedText = null
      }
      if (this.query?.text) {
        this.originalText = this.query.text
        if (!this.unsavedText) this.unsavedText = this.query.text
      }
    },
    fakeRemoteChange() {
      this.query.text = "select * from foo"
    },
    async getColumnsForAutocomplete(tableName) {
      const tableToFind = this.tables.find(t => t.name === tableName)
      if (!tableToFind) return null
      // Only refresh columns if we don't have them cached.
      if (!tableToFind.columns?.length) {
        await this.$store.dispatch('updateTableColumns', tableToFind)
      }

      return tableToFind?.columns.map((c) => c.columnName)
    },
    // Right click menu handlers
    editorCut() {
      const selection = this.editor.getSelection();
      this.editor.replaceSelection('');
      this.$native.clipboard.writeText(selection);
    },
    editorCopy() {
      const selection = this.editor.getSelection();
      this.$native.clipboard.writeText(selection);
    },
    editorPaste() {
      const clipboard = this.$native.clipboard.readText();
      if (this.hasSelectedText) {
        this.editor.replaceSelection(clipboard, 'around');
      } else {
        const cursor = this.editor.getCursor();
        this.editor.replaceRange(clipboard, cursor);
      }
    },
    editorDelete() {
      this.editor.replaceSelection('')
    },
    editorUndo() {
      this.editor.execCommand('undo')
    },
    editorRedo() {
      this.editor.execCommand('redo')
    },
    editorSelectAll() {
      this.editor.execCommand('selectAll')
    }
  },
  mounted() {
    if (this.shouldInitialize) this.initialize()

  },
  beforeDestroy() {
    if (this.split) {
      this.split.destroy()
    }
  },
}
</script>


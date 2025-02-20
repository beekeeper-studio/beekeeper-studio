<template>
  <div
    class="query-editor"
    ref="container"
    v-hotkey="keymap"
  >
    <div
      class="top-panel"
      ref="topPanel"
    >
      <merge-manager
        v-if="query && query.id"
        :original-text="originalText"
        :query="query"
        :unsaved-text="unsavedText"
        @change="onChange"
        @mergeAccepted="originalText = query.text"
      />
      <div
        class="no-content"
        v-if="remoteDeleted"
      >
        <div class="alert alert-danger">
          <i class="material-icons">error_outline</i>
          <div class="alert-body">
            This query was deleted by someone else. It is no longer editable.
          </div>
          <a
            @click.prevent="close"
            class="btn btn-flat"
          >Close Tab</a>
        </div>
      </div>
      <sql-text-editor
        v-model="unsavedText"
        v-bind.sync="editor"
        :focus="focusingElement === 'text-editor'"
        @update:focus="updateTextEditorFocus"
        :markers="editorMarkers"
        :connection-type="connectionType"
        :extra-keybindings="keybindings"
        :vim-config="vimConfig"
        @initialized="handleEditorInitialized"
      />
      <span class="expand" />
      <div class="toolbar text-right">
        <div class="editor-help expand" />
        <div class="expand" />
        <div
          class="actions btn-group"
          ref="actions"
        >
          <x-button
            v-if="showDryRun"
            class="btn btn-flat btn-small dry-run-btn"
            :disabled="isCommunity"
            @click="dryRun = !dryRun"
          >
            <x-label>Dry Run</x-label>
            <i
              v-if="isCommunity"
              class="material-icons menu-icon"
            >stars</i>
            <input
              v-else
              type="checkbox"
              v-model="dryRun"
            >
          </x-button>
          <x-button
            @click.prevent="triggerSave"
            class="btn btn-flat btn-small"
          >
            Save
          </x-button>

          <x-buttons class="">
            <x-button
              class="btn btn-primary btn-small"
              v-tooltip="'Ctrl+Enter'"
              @click.prevent="submitTabQuery"
            >
              <x-label>{{ hasSelectedText ? 'Run Selection' : 'Run' }}</x-label>
            </x-button>
            <x-button
              class="btn btn-primary btn-small"
              menu
            >
              <i class="material-icons">arrow_drop_down</i>
              <x-menu>
                <x-menuitem @click.prevent="submitTabQuery">
                  <x-label>{{ hasSelectedText ? 'Run Selection' : 'Run' }}</x-label>
                  <x-shortcut value="Control+Enter" />
                </x-menuitem>
                <x-menuitem @click.prevent="submitCurrentQuery">
                  <x-label>Run Current</x-label>
                  <x-shortcut value="Control+Shift+Enter" />
                </x-menuitem>
                <hr>
                <x-menuitem @click.prevent="submitQueryToFile">
                  <x-label>{{ hasSelectedText ? 'Run Selection to File' : 'Run to File' }}</x-label>
                  <i
                    v-if="isCommunity"
                    class="material-icons menu-icon"
                  >
                    stars
                  </i>
                </x-menuitem>
                <x-menuitem @click.prevent="submitCurrentQueryToFile">
                  <x-label>Run Current to File</x-label>
                  <i
                    v-if="isCommunity"
                    class="material-icons menu-icon "
                  >
                    stars
                  </i>
                </x-menuitem>
              </x-menu>
            </x-button>
          </x-buttons>
        </div>
      </div>
    </div>
    <div class="not-supported" v-if="!enabled">
      <span class="title">
        Query Editor
      </span>
      <div class="body">
        <p> We don't currently support queries for {{ dialect }} </p>
      </div>
    </div>
    <div
      class="bottom-panel"
      ref="bottomPanel"
    >
      <progress-bar
        @cancel="cancelQuery"
        :message="runningText"
        v-if="running"
      />
      <result-table
        ref="table"
        v-else-if="showResultTable"
        :focus="focusingElement === 'table'"
        :active="active"
        :table-height="tableHeight"
        :result="result"
        :query="query"
        :tab="tab"
      />
      <div
        class="message"
        v-else-if="result"
      >
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <span>Query {{ selectedResult + 1 }}/{{ results.length }}: No Results. {{ result.affectedRows || 0 }} rows affected. See the select box in the bottom left ↙ for more query results.</span>
        </div>
      </div>
      <div
        class="message"
        v-else-if="errors"
      >
        <error-alert :error="errors" />
      </div>
      <div
        class="message"
        v-else-if="info"
      >
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <span>{{ info }}</span>
        </div>
      </div>
      <div
        class="layout-center expand"
        v-else
      >
        <shortcut-hints />
      </div>
      <!-- <span class="expand" v-if="!result"></span> -->
      <!-- STATUS BAR -->
      <query-editor-status-bar
        v-model="selectedResult"
        :results="results"
        :running="running"
        @download="download"
        @clipboard="clipboard"
        @clipboardJson="clipboardJson"
        @clipboardMarkdown="clipboardMarkdown"
        @submitCurrentQueryToFile="submitCurrentQueryToFile"
        :execute-time="executeTime"
      />
    </div>

    <!-- Save Modal -->
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        :name="`save-modal-${tab.id}`"
        @closed="selectEditor"
        @opened="selectTitleInput"
        height="auto"
        :scrollable="true"
      >
        <form
          v-kbd-trap="true"
          v-if="query"
          @submit.prevent="saveQuery"
        >
          <div class="dialog-content">
            <div class="dialog-c-title">
              Saved Query Name
            </div>
            <div class="modal-form">
              <div
                class="alert alert-danger save-errors"
                v-if="saveError"
              >
                {{ saveError }}
              </div>
              <div class="form-group">
                <input
                  type="text"
                  ref="titleInput"
                  name="title"
                  class="form-control"
                  v-model="query.title"
                  autofocus
                >
              </div>
            </div>
          </div>
          <div class="vue-dialog-buttons">
            <button
              class="btn btn-flat"
              type="button"
              @click.prevent="$modal.hide(`save-modal-${tab.id}`)"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              type="submit"
            >
              Save
            </button>
          </div>
        </form>
      </modal>
    </portal>

    <!-- Parameter modal -->
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        :name="`parameters-modal-${tab.id}`"
        @opened="selectFirstParameter"
        @closed="selectEditor"
        height="auto"
        :scrollable="true"
      >
        <form
          v-kbd-trap="true"
          @submit.prevent="submitQuery(queryForExecution, true)"
        >
          <div class="dialog-content">
            <div class="dialog-c-title">
              Provide parameter values
            </div>
            <div class="dialog-c-subtitle">
              You need to use single quotes around string values. Blank values are invalid
            </div>
            <div class="modal-form">
              <div class="form-group">
                <div
                  v-for="(param, index) in queryParameterPlaceholders"
                  :key="index"
                >
                  <div class="form-group row">
                    <label>{{ param }}</label>
                    <input
                      type="text"
                      class="form-control"
                      required
                      v-model="queryParameterValues[param]"
                      autofocus
                      ref="paramInput"
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="vue-dialog-buttons">
            <button
              class="btn btn-flat"
              type="button"
              @click.prevent="$modal.hide(`parameters-modal-${tab.id}`)"
            >
              Cancel
            </button>
            <button
              class="btn btn-primary"
              type="submit"
            >
              Run
            </button>
          </div>
        </form>
      </modal>
    </portal>
  </div>
</template>

<script lang="ts">

  import _ from 'lodash'
  import Split from 'split.js'
  import { mapGetters, mapState } from 'vuex'
  import { identify } from 'sql-query-identifier'

  import { splitQueries, isTextSelected } from '../lib/db/sql_tools'
  import { EditorMarker } from '@/lib/editor/utils'
  import ProgressBar from './editor/ProgressBar.vue'
  import ResultTable from './editor/ResultTable.vue'
  import ShortcutHints from './editor/ShortcutHints.vue'
  import SQLTextEditor from '@/components/common/texteditor/SQLTextEditor.vue'

  import QueryEditorStatusBar from './editor/QueryEditorStatusBar.vue'
  import rawlog from '@bksLogger'
  import ErrorAlert from './common/ErrorAlert.vue'
  import MergeManager from '@/components/editor/MergeManager.vue'
  import { AppEvent } from '@/common/AppEvent'
  import { PropType } from 'vue'
  import { TransportOpenTab, findQuery } from '@/common/transport/TransportOpenTab'
  import { blankFavoriteQuery } from '@/common/transport'

  const log = rawlog.scope('query-editor')
  const isEmpty = (s) => _.isEmpty(_.trim(s))
  const editorDefault = "\n\n\n\n\n\n\n\n\n\n"

  export default {
    // this.queryText holds the current editor value, always
    components: { ResultTable, ProgressBar, ShortcutHints, QueryEditorStatusBar, ErrorAlert, MergeManager, SqlTextEditor: SQLTextEditor },
    props: {
      tab: Object as PropType<TransportOpenTab>,
      active: Boolean
    },
    data() {
      return {
        results: [],
        running: false,
        runningCount: 1,
        runningType: 'all queries',
        selectedResult: 0,
        unsavedText: editorDefault,
        editor: {
          height: 100,
          selection: null,
          readOnly: false,
          cursorIndex: 0,
          cursorIndexAnchor: 0,
          initialized: false,
        },
        runningQuery: null,
        error: null,
        errorMarker: null,
        saveError: null,
        info: null,
        split: null,
        tableHeight: 0,
        savePrompt: false,
        lastWord: null,
        marker: null,
        queryParameterValues: {},
        queryForExecution: null,
        executeTime: 0,
        originalText: "",
        initialized: false,
        blankQuery: blankFavoriteQuery(),
        dryRun: false,
        containerResizeObserver: null,
        onTextEditorBlur: null,

        /**
         * NOTE: Use focusElement instead of focusingElement or blurTextEditor()
         * if we want to switch focus. Why two states? We need a feedback from
         * text editor cause it can't release focus automatically.
         *
         * Possible values: 'text-editor', 'table', 'none'
         */
        focusElement: 'none',
        focusingElement: 'none',
      }
    },
    computed: {
      ...mapGetters(['dialect', 'dialectData', 'defaultSchema']),
      ...mapGetters({
        'isCommunity': 'licenses/isCommunity',
        'userKeymap': 'settings/userKeymap',
      }),
      ...mapState(['usedConfig', 'connectionType', 'database', 'tables', 'storeInitialized', 'connection']),
      ...mapState('data/queries', {'savedQueries': 'items'}),
      ...mapState('settings', ['settings']),
      ...mapState('tabs', { 'activeTab': 'active' }),
      enabled() {
        return !this.dialectData?.disabledFeatures?.queryEditor;
      },
      shouldInitialize() {
        return this.storeInitialized && this.active && !this.initialized
      },
      remoteDeleted() {
        return this.storeInitialized && this.tab.queryId && !this.query
      },
      query() {
        return findQuery(this.tab, this.savedQueries ?? []) ?? this.blankQuery
      },
      queryTitle() {
        return this.query?.title
      },
      showDryRun() {
        return this.dialect == 'bigquery'
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
          'tidb': 'mysql',
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
        return `Running ${this.runningType} (${window.main.pluralize('query', this.runningCount, true)})`
      },
      hasSelectedText() {
        return this.editor.initialized ? !!this.editor.selection : false
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
          // Find a query in between anchor and head cursors
          if (this.editor.cursorIndex !== this.editor.cursorIndexAnchor) {
            const isSelected = isTextSelected(queries[i].start, queries[i].end, this.editor.cursorIndexAnchor, this.editor.cursorIndex)
            if (isSelected) return i
          }
          // Otherwise, find a query that sits before the cursor
          else if (this.editor.cursorIndex <= queries[i].end + 1) return i
        }
        return null
      },
      currentlySelectedQuery() {
        if (this.currentlySelectedQueryIndex === null) return null
        return this.individualQueries[this.currentlySelectedQueryIndex]
      },
      currentQueryPosition() {
        if(!this.editor.initialized || !this.currentlySelectedQuery || !this.individualQueries) {
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
        result[this.ctrlOrCmd('`')] = this.switchPaneFocus.bind(this)
        result[this.ctrlOrCmd('l')] = this.selectEditor
        result[this.ctrlOrCmd('i')] = this.submitQueryToFile
        result[this.ctrlOrCmdShift('i')] = this.submitCurrentQueryToFile
        return result
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
      keybindings() {
        const keybindings: any = {
          "Shift-Ctrl-Enter": this.submitCurrentQuery,
          "Shift-Cmd-Enter": this.submitCurrentQuery,
          "Ctrl-Enter": this.submitTabQuery,
          "Cmd-Enter": this.submitTabQuery,
          "Ctrl-S": this.triggerSave,
          "Cmd-S": this.triggerSave,
          "F5": this.submitTabQuery,
          "Shift-F5": this.submitCurrentQuery,
          "Ctrl+I": this.submitQueryToFile,
          "Cmd+I": this.submitQueryToFile,
          "Shift+Ctrl+I": this.submitCurrentQueryToFile,
          "Shift+Cmd+I": this.submitCurrentQueryToFile,
        }

        if(this.userKeymap === "vim") {
          keybindings["Ctrl-Esc"] = this.cancelQuery
        } else {
          keybindings["Esc"] = this.cancelQuery
        }

        return keybindings
      },
      vimConfig() {
        const exCommands = [
          { name: "write", prefix: "w", handler: this.triggerSave },
          { name: "quit", prefix: "q", handler: this.close },
          { name: "qa", prefix: "qa", handler: () => this.$root.$emit(AppEvent.closeAllTabs) },
          { name: "x", prefix: "x", handler: this.writeQuit },
          { name: "wq", prefix: "wq", handler: this.writeQuit },
          { name: "tabnew", prefix: "tabnew", handler: (_cn, params) => {
            if(params.args && params.args.length > 0){
              let queryName = params.args[0]
              this.$root.$emit(AppEvent.newTab,"", queryName)
              return
            }
            this.$root.$emit(AppEvent.newTab)
          }},
        ]

        return { exCommands }
      },
      editorMarkers() {
        const markers = []
        if (this.marker) markers.push(this.marker)
        if (this.errorMarker) markers.push(this.errorMarker)
        return markers
      },
      showResultTable() {
        return this.rowCount > 0
      },
    },
    watch: {
      error() {
        this.errorMarker = null
        if (this.dialect === 'postgresql' && this.error && this.error.position) {
          const [a, b] = this.locationFromPosition(this.queryForExecution, parseInt(this.error.position) - 1, parseInt(this.error.position))
          this.errorMarker = { from: a, to: b, type: 'error' } as EditorMarker
          this.error.marker = {line: b.line + 1, ch: b.ch}
        }
      },
      queryTitle() {
        if (this.queryTitle) this.tab.title = this.queryTitle
      },
      shouldInitialize() {
        if (this.shouldInitialize) this.initialize()
      },
      unsavedText() {
        this.tab.unsavedQueryText = this.unsavedText
        this.saveTab()
      },
      remoteDeleted() {
        if (this.remoteDeleted) {
          this.editor.readOnly = 'nocursor'
          this.tab.unsavedChanges = false
          this.tab.alert = true
        } else {
          this.editor.readOnly = false
        }
      },
      unsavedChanges() {
        this.tab.unsavedChanges = this.unsavedChanges
      },
      async active() {
        if (!this.editor.initialized) {
          return
        }

        // HACK: we couldn't focus the editor immediately each time the tab is
        // clicked because something steals the focus. So we defer focusing
        // the editor at the end of the call stack with timeout, and
        // this.$nextTick doesn't work in this case.
        if (this.active) {
          setTimeout(this.selectEditor, 0)
        }

        if (!this.active) {
          this.focusElement = 'none'
          this.$modal.hide(`save-modal-${this.tab.id}`)
        }
      },
      currentQueryPosition() {
        this.marker = null

        if(!this.individualQueries || this.individualQueries.length < 2) {
          return;
        }

        if (!this.currentQueryPosition) {
          return
        }
        const { from, to } = this.currentQueryPosition

        const editorText = this.unsavedText
        // const lines = editorText.split(/\n/)

        const [markStart, markEnd] = this.locationFromPosition(editorText, from, to)
        this.marker = { from: markStart, to: markEnd, type: 'highlight' } as EditorMarker
      },
      async focusElement(element, oldElement) {
        if (oldElement === 'text-editor' && element !== 'text-editor') {
          await this.blurTextEditor()
        }
        this.focusingElement = element
      },
    },
    methods: {

      locationFromPosition(queryText, ...rawPositions) {
        // 1. find the query text inside the editor
        // 2.

        const editorText = this.unsavedText

        const startCharacter = editorText.indexOf(queryText)
        const lines = editorText.split(/\n/)
        const positions = rawPositions.map((p) => p + startCharacter)

        const finished = positions.map((_p) => false)
        const results = positions.map((_p) => ({ line: null, ch: null}))

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
        this.query.title = this.activeTab.title

        this.tab.unsavedChanges = this.unsavedChanges

        if (this.split) {
          this.split.destroy();
          this.split = null;
        }

        this.$nextTick(() => {
          this.split = Split(this.splitElements, {
            elementStyle: (_dimension, size) => ({
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

          this.$nextTick(() => {
            this.tableHeight = this.$refs.bottomPanel.clientHeight
            this.updateEditorHeight()
          })
        })
      },
      handleEditorInitialized() {
        // this gives the dom a chance to kick in and render these
        // before we try to read their heights
        this.$nextTick(() => {
          this.tableHeight = this.$refs.bottomPanel.clientHeight
          this.updateEditorHeight()
        })
      },
      saveTab: _.debounce(function() {
        this.$store.dispatch('tabs/save', this.tab)
      }, 1000),
      close() {
        this.$root.$emit(AppEvent.closeTab)
      },
      async cancelQuery() {
        if (this.running && this.runningQuery) {
          this.running = false
          this.info = 'Query Execution Cancelled'
          await this.runningQuery.cancel();
          this.runningQuery = null;
        }
      },
      download(format) {
        this.$refs.table.download(format)
      },
      clipboard() {
        this.$refs.table.clipboard()
      },
      clipboardJson() {
        // eslint-disable-next-line
        // @ts-ignore
        const data = this.$refs.table.clipboard('json')
      },
      clipboardMarkdown() {
        // eslint-disable-next-line
        // @ts-ignore
        const data = this.$refs.table.clipboard('md')
      },
      selectEditor() {
        this.focusElement = 'text-editor'
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
        this.editor.height = height
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
      },
      escapeRegExp(string) {
        return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
      },
      async submitQueryToFile() {
        if (this.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal)
          return;
        }
        // run the currently hilighted text (if any) to a file, else all sql
        const query_sql = this.hasSelectedText ? this.editor.selection : this.unsavedText
        const saved_name = this.hasTitle ? this.query.title : null
        const tab_title = this.tab.title // e.g. "Query #1"
        const queryName = saved_name || tab_title
        this.trigger( AppEvent.beginExport, { query: query_sql, queryName: queryName });
      },
      async submitCurrentQueryToFile() {
        if (this.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal)
          return;
        }
        // run the currently selected query (if there are multiple) to a file, else all sql
        const query_sql = this.currentlySelectedQuery ? this.currentlySelectedQuery.text : this.unsavedText
        const saved_name = this.hasTitle ? this.query.title : null
        const tab_title = this.tab.title // e.g. "Query #1"
        const queryName = saved_name || tab_title
        this.trigger( AppEvent.beginExport, { query: query_sql, queryName: queryName });
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
        const text = this.hasSelectedText ? this.editor.selection : this.unsavedText
        this.runningType = this.hasSelectedText ? 'selection' : 'everything'
        if (text.trim()) {
          this.submitQuery(text)
        } else {
          this.error = 'No query to run'
        }
      },
      async submitQuery(rawQuery, fromModal = false) {
        if (this.remoteDeleted) return;
        this.tab.isRunning = true
        this.running = true
        this.error = null
        this.queryForExecution = rawQuery
        this.results = []
        this.selectedResult = 0
        let identification = []
        try {
          identification = identify(rawQuery, { strict: false, dialect: this.identifyDialect, identifyTables: true })
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
          // Dry run is for bigquery, allows query cost estimations
          this.runningQuery = await this.connection.query(query, { dryRun: this.dryRun });
          const queryStartTime = new Date()
          const results = await this.runningQuery.execute();
          const queryEndTime = new Date()

          // https://github.com/beekeeper-studio/beekeeper-studio/issues/1435
          if (!document.hasFocus() && window.Notification && Notification.permission === "granted") {
            new window.Notification("Query Complete", {
              body: `${this.tab.title} has been executed successfully.`,
            });
          }

          // eslint-disable-next-line
          // @ts-ignore
          this.executeTime = queryEndTime - queryStartTime
          let totalRows = 0
          results.forEach((result, idx) => {
            result.rowCount = result.rowCount || 0

            // TODO (matthew): remove truncation logic somewhere sensible
            totalRows += result.rowCount
            if (result.rowCount > this.$config.maxResults) {
              result.rows = _.take(result.rows, this.$config.maxResults)
              result.truncated = true
              result.totalRowCount = result.rowCount
            }

            const identifiedTables = identification[idx]?.tables || []
            if (identifiedTables.length > 0) {
              result.tableName = identifiedTables[0]
            } else {
              result.tableName = "mytable"
            }
          })
          this.results = Object.freeze(results);

          // const defaultResult = Math.max(results.length - 1, 0)

          const nonEmptyResult = _.chain(results).findLastIndex((r) => !!r.rows?.length).value()
          console.log("non empty result", nonEmptyResult)
          this.selectedResult = nonEmptyResult === -1 ? results.length - 1 : nonEmptyResult

          this.$store.dispatch('data/usedQueries/save', { text: query, numberOfRecords: totalRows, queryId: this.query?.id, connectionId: this.usedConfig.id })
          log.debug('identification', identification)
          const found = identification.find(i => {
            return i.type === 'CREATE_TABLE' || i.type === 'DROP_TABLE' || i.type === 'ALTER_TABLE'
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
          this.tab.isRunning = false
        }
      },
      initializeQueries() {
        if (!this.tab.unsavedChanges && this.query?.text) {
          this.unsavedText = null
        }
        const originalText = this.query?.text || this.tab.unsavedQueryText
        if (originalText) {
          this.originalText = originalText
          this.unsavedText = originalText
        }
      },
      fakeRemoteChange() {
        this.query.text = "select * from foo"
      },
      // Right click menu handlers
      writeQuit() {
        this.triggerSave()
        if(this.query.id) {
          this.close()
        }
      },
      updateTextEditorFocus(focused: boolean) {
        if (!focused) {
          this.onTextEditorBlur?.()
        }
      },
      async switchPaneFocus(_event?: KeyboardEvent, target?: 'text-editor' | 'table') {
        if (target) {
          this.focusElement = target
        } else {
          this.focusElement = this.focusElement === 'text-editor'
            ? 'table'
            : 'text-editor'
        }
      },
      blurTextEditor() {
        let timedOut = false
        let resolved = false
        return new Promise<void>((resolvePromise) => {
          const resolve = () => {
            this.onTextEditorBlur = null
            resolvePromise()
          }
          this.onTextEditorBlur = () => {
            resolved = true
            if (!timedOut) {
              resolve()
            }
          }
          setTimeout(() => {
            if (!resolved) {
              timedOut = true
              log.warn('Timed out waiting for text editor to blur')
              resolve()
            }
          }, 1000)
          this.focusingElement = 'none'
        })
      },
    },
    async mounted() {
      if (this.shouldInitialize) this.initialize()

      this.containerResizeObserver = new ResizeObserver(() => {
        this.updateEditorHeight()
      })
      this.containerResizeObserver.observe(this.$refs.container)

      if (this.active) {
        await this.$nextTick()
        this.focusElement = 'text-editor'
      }
    },
    beforeDestroy() {
      if(this.split) {
        this.split.destroy()
      }
      this.containerResizeObserver.disconnect()
    },
  }
</script>


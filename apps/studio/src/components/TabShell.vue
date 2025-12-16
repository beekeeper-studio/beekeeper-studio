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
      <mongo-shell
        v-bind.sync="editor"
        :vim-config="vimConfig"
        :vim-keymaps="vimKeymaps"
        :keymap="userKeymap"
        :output="mongoOutputResult"
        :is-focused="focusingElement === 'text-editor'"
        :auto-focus="true"
        :extensions="extensions"
        :promptSymbol="promptSymbol"
        :line-wrapping="wrapText"
        @clear="clear"
        @submitCommand="submitMongoCommand"
        @update:focus="updateTextEditorFocus"
        @bks-initialized="handleEditorInitialized"
        @bks-shell-run-command="submitMongoCommand"
      />
      <!-- This is we so we have the separating line -->
      <span class="expand"></span>
      <div class="toolbar text-right"></div>
    </div>
    <div class="not-supported" v-if="!enabled">
      <span class="title">
        Shell
      </span>
      <div class="body">
        <p> We don't currently support a shell for {{ dialect }} </p>
      </div>
    </div>
    <div
      class="bottom-panel"
      ref="bottomPanel"
    >
      <progress-bar
        :canCancel="false"
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
        :tab="tab"
      />
      <div
        class="message"
        v-else-if="result"
      >
        <div class="alert alert-info">
          <i class="material-icons-outlined">info</i>
          <span>Command {{ selectedResult + 1 }}/{{ results.length }}: No Results. {{ result.affectedRows || 0 }} rows affected. See the select box in the bottom left ↙ for more command results.</span>
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
        <shortcut-hints :isMongo="true" />
      </div>
      <!-- <span class="expand" v-if="!result"></span> -->
      <!-- STATUS BAR -->
      <query-editor-status-bar
        v-model="selectedResult"
        :hideWrapText="true"
        :results="results"
        :running="running"
        @download="download"
        @clipboard="clipboard"
        @clipboardJson="clipboardJson"
        @clipboardMarkdown="clipboardMarkdown"
        @wrap-text="wrapText = !wrapText"
        :execute-time="executeTime"
        :active="active"
      />
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import _ from 'lodash'
import Split from 'split.js'
import { mapGetters, mapState } from 'vuex'

import ProgressBar from './editor/ProgressBar.vue'
import ResultTable from './editor/ResultTable.vue'
import ShortcutHints from './editor/ShortcutHints.vue'
import MongoShell from '@beekeeperstudio/ui-kit/vue/mongo-shell'
import { mongoHintExtension } from '@/lib/editor/extensions/mongoHint'

import QueryEditorStatusBar from './editor/QueryEditorStatusBar.vue'
import rawlog from '@bksLogger'
import ErrorAlert from './common/ErrorAlert.vue'
import MergeManager from '@/components/editor/MergeManager.vue'
import { AppEvent } from '@/common/AppEvent'
import { PropType } from 'vue'
import { TransportOpenTab } from '@/common/transport/TransportOpenTab'
import { getVimKeymapsFromVimrc } from '@/lib/editor/vim';

const log = rawlog.scope('query-editor')

export default Vue.extend({
  components: { ResultTable, ProgressBar, ShortcutHints, QueryEditorStatusBar, ErrorAlert, MergeManager, MongoShell },
  props: {
    tab: Object as PropType<TransportOpenTab>,
    active: Boolean
  },
  data() {
    return {
      results: [],
      running: false,
      runningCount: 1,
      selectedResult: 0,
      editor: {
        height: 100,
        selection: null,
        readOnly: false,
        cursorIndex: 0,
        cursorIndexAnchor: 0,
        initialized: false,
      },
      mongoOutputResult: null,
      error: null,
      errorMarker: null,
      saveError: null,
      info: null,
      split: null,
      tableHeight: 0,
      savePrompt: false,
      lastWord: null,
      marker: null,
      executeTime: 0,
      initialized: false,
      containerResizeObserver: null,
      onTextEditorBlur: null,
      wrapText: false,

      /**
       * NOTE: Use focusElement instead of focusingElement or blurTextEditor()
       * if we want to switch focus. Why two states? We need a feedback from
       * text editor cause it can't release focus automatically.
       *
       * Possible values: 'text-editor', 'table', 'none'
       */
      focusElement: 'none',
      focusingElement: 'none',
      promptSymbol: null,
      mongoHint: mongoHintExtension(),
      vimKeymaps: []
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
    extensions() {
      return this.mongoHint.extensions;
    },
    enabled() {
      return !this.dialectData?.disabledFeatures?.shell;
    },
    shouldInitialize() {
      return this.storeInitialized && this.active && !this.initialized
    },
    errors() {
      const result = [
        this.error,
        this.saveError
      ].filter((e) => e)

      return result.length ? result : null
    },
    runningText() {
      return `Running (${window.main.pluralize('command', this.runningCount, true)})`
    },
    result() {
      return this.results[this.selectedResult]
    },
    rowCount() {
      return this.result && this.result.rows ? this.result.rows.length : 0
    },
    splitElements() {
      return [
        this.$refs.topPanel,
        this.$refs.bottomPanel,
      ]
    },
    keymap() {
      if (!this.active) return {}
      return this.$vHotkeyKeymap({
        'queryEditor.switchPaneFocus': this.switchPaneFocus,
        'queryEditor.selectEditor': this.selectEditor,
      })
    },
   keybindings() {
      const keybindings: any = {}

      if(this.userKeymap === "vim") {
        keybindings["Ctrl-Esc"] = this.cancelQuery
      } else {
        keybindings["Esc"] = this.cancelQuery
      }

      return keybindings
    },
    vimConfig() {
      const exCommands = [
        { name: "quit", prefix: "q", handler: this.close },
        { name: "qa", prefix: "qa", handler: () => this.$root.$emit(AppEvent.closeAllTabs) },
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
    showResultTable() {
      return this.rowCount > 0
    },
  },
  watch: {
    error() {
      this.errorMarker = null
    },
    shouldInitialize() {
      if (this.shouldInitialize) this.initialize()
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
      }
    },
    async focusElement(element, oldElement) {
      if (oldElement === 'text-editor' && element !== 'text-editor') {
        await this.blurTextEditor()
      }
      this.focusingElement = element
    },
  },
  methods: {
    initialize() {
      this.initialized = true
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
      this.editor.initialized = true;

      this.mongoHint.setGetHints(this.connection.getCompletions);

      // this gives the dom a chance to kick in and render these
      // before we try to read their heights
      this.$nextTick(() => {
        this.tableHeight = this.$refs.bottomPanel.clientHeight
        this.updateEditorHeight()
      })
    },
    close() {
      this.$root.$emit(AppEvent.closeTab)
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
    updateEditorHeight() {
      this.editor.height = this.$refs.topPanel.clientHeight
    },
    clear() {
      this.selectedResult = 0;
      this.results = [];
      this.selectEditor();
    },
    async submitMongoCommand(command) {
      this.tab.isRunning = true
      this.running = true
      this.error = null
      this.selectedResult = 0

      try {
        const cmdStartTime = new Date();
        const results = await this.connection.executeCommand(command);
        const cmdEndTime = new Date();

        // update promptSymbol before we do any processing so the new prompt is correct
        this.promptSymbol = await this.connection.getShellPrompt();

        // eslint-disable-next-line
        // @ts-ignore
        this.executeTime = cmdEndTime - cmdStartTime;
        results.forEach((result) => {
          result.rowCount = result.rowCount || 0

          // TODO (matthew): remove truncation logic somewhere sensible
          if (result.rowCount > this.$config.maxResults) {
            result.rows = _.take(result.rows, this.$config.maxResults)
            result.truncated = true
            result.totalRowCount = result.rowCount
          }
        })
        const printable = results.find((r) => !!r.output);
        if (printable) {
          this.mongoOutputResult = printable
        } else {
          this.mongoOutputResult = {
            output: ''
          }
        }
        // get rid of old empty results
        this.results = Object.freeze([...this.results.filter((r) => !!r.rows?.length), ...results])
        const nonEmptyResult = _.chain(this.results).findLastIndex((r) => !!r.rows?.length).value()
        console.log("non empty result", nonEmptyResult)
        this.selectedResult = nonEmptyResult === -1 ? this.results.length - 1 : nonEmptyResult;
      } catch (ex) {
        this.mongoOutputResult = {
          output: ex.message
        }
        log.error(ex)
        if(this.running) {
          this.error = ex
        }
      } finally {
        this.running = false
        this.tab.isRunning = false
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
    this.promptSymbol = await this.connection.getShellPrompt();

    if (this.shouldInitialize) this.initialize()

    this.containerResizeObserver = new ResizeObserver(() => {
      this.updateEditorHeight()
    })
    this.containerResizeObserver.observe(this.$refs.container)

    if (this.active) {
      await this.$nextTick()
      this.focusElement = 'text-editor'
    }

    this.vimKeymaps = await getVimKeymapsFromVimrc();
  },
  beforeDestroy() {
    if(this.split) {
      this.split.destroy()
    }
    this.containerResizeObserver.disconnect()
  },
});
</script>


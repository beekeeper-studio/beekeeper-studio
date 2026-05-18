<template>
  <div
    class="query-editor"
    :class="{ 'editing-result': editingResult }"
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
      <component
        :is="editorComponent"
        :value="unsavedText"
        :read-only="readOnly"
        :is-focused="focusingElement === 'text-editor'"
        :markers="editorMarkers"
        :formatter-dialect="formatterDialect"
        :identifier-dialect="identifierDialect"
        :param-types="paramTypes"
        :keybindings="keybindings"
        :vim-config="vimConfig"
        :line-wrapping="wrapText"
        :keymap="userKeymap"
        :vim-keymaps="vimKeymaps"
        :entities="entities"
        :columns-getter="columnsGetter"
        :default-schema="defaultSchema"
        :language-id="languageIdForDialect"
        :clipboard="$native.clipboard"
        :replace-extensions="replaceExtensions"
        :context-menu-items="editorContextMenu"
        :formatter-config="selectedFormatter ?? undefined"
        :allow-presets="true"
        :presets="formatterPresets"
        @bks-initialized="handleEditorInitialized"
        @bks-value-change="unsavedText = $event.value"
        @bks-selection-change="handleEditorSelectionChange"
        @bks-blur="onTextEditorBlur?.()"
        @bks-query-selection-change="handleQuerySelectionChange"
        @bks-apply-preset="applyPreset"
      />
      <span class="expand" />
      <div
        class="toolbar text-right"
        ref="toolbar"
      >
        <div class="actions" v-if="canManageTransactions">
          <transition name="fade-swap">
            <x-buttons
              id="commit-mode"
              class="selectbutton"
              v-if="!hasActiveTransaction"
            >
              <x-button
                :toggled="!isManualCommit"
                @click.prevent="toggleCommitMode('auto')"
                v-tooltip="getCommitModeVTooltip({
                  title: 'Auto commit mode',
                  description: 'This is the way it works by default. No need to worry about it.',
                })"
              >
                <span class="togglebutton-content">
                  {{ !isManualCommit ? 'Auto Commit' : 'Auto' }}
                </span>
              </x-button>
              <x-button
                :toggled="isManualCommit"
                @click.prevent="toggleCommitMode('manual')"
                v-tooltip="getCommitModeVTooltip({
                  title: 'Manual commit mode',
                  description: 'Write actions will require you to manually commit your changes',
                  learnMoreLink: 'https://docs.beekeeperstudio.io/user_guide/sql_editor/manual-transaction-management',
                })"
              >
                <span class="togglebutton-content">
                  {{ isManualCommit ? 'Manual Commit' : 'Manual' }}
                </span>
              </x-button>
            </x-buttons>
          </transition>
          <transition name="fade-swap">
            <div
              v-if="hasActiveTransaction"
              class="transaction-indicator"
              v-tooltip="{
                ...getCommitModeVTooltip({
                  title: `<i class='material-icons'>commit</i><span>Transaction active</span>`,
                  description: 'Once committed or rolled back, it will be deactivated.',
                  learnMoreLink: 'https://docs.beekeeperstudio.io/user_guide/sql_editor/manual-transaction-management',
                  className: 'transaction-active',
                  show: showTransactionActiveTooltip,
                  onClose() {
                    showTransactionActiveTooltip = false
                  },
                }),
              }"
            >
              <i class="material-icons">commit</i>
              <span>Transaction active</span>
            </div>
          </transition>
        </div>

        <div v-if="canManageTransactions && isManualCommit" class="actions btn-group">
          <x-buttons v-show="!hasActiveTransaction">
            <x-button
              @click.prevent="manualBegin"
              class="btn btn-flat btn-small"
            >
              Begin
            </x-button>
          </x-buttons>

          <x-buttons v-show="showKeepAlive">
            <x-button
              @click.prevent="keepAliveTransaction"
              class="btn btn-flat btn-small"
            >
              <x-label>Keep Alive</x-label>
            </x-button>
          </x-buttons>
          <x-buttons>
            <x-button
              @click.prevent="manualCommit"
              class="btn btn-flat btn-small"
              :disabled="!hasActiveTransaction"
            >
              <x-label>Commit</x-label>
            </x-button>
          </x-buttons>
          <x-buttons>
            <x-button
              @click.prevent="manualRollback"
              class="btn btn-flat btn-small"
              :disabled="!hasActiveTransaction"
            >
              <x-label>Rollback</x-label>
            </x-button>
          </x-buttons>

        </div>

        <div class="editor-help expand" />
        <div class="expand" />
        <div class="actions btn-group">
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

          <x-buttons class="" v-tooltip="runButtonTooltip">
            <x-button
              class="btn btn-primary btn-small"
              :v-tooltip="displayShortcut('queryEditor.primaryQueryAction')"
              @click.prevent="queryFunctions.primaryRead"
              :disabled="runButtonDisabled"
            >
              <x-label>{{ runPrimaryText() }}</x-label>
            </x-button>
            <x-button
              class="btn btn-primary btn-small"
              :disabled="runButtonDisabled"
              menu
            >
              <i class="material-icons">arrow_drop_down</i>
              <x-menu>
                <x-menuitem @click.prevent="queryFunctions.primaryRead">
                  <x-label>{{ runPrimaryText() }}</x-label>
                  <x-shortcut :value="displayShortcut('queryEditor.primaryQueryAction')" />
                </x-menuitem>
                <x-menuitem @click.prevent="queryFunctions.secondaryRead">
                  <x-label>{{ runSecondaryText() }}</x-label>
                  <x-shortcut :value="displayShortcut('queryEditor.secondaryQueryAction')" />
                </x-menuitem>
                <hr>
                <x-menuitem
                  @click.prevent="queryFunctions.primaryWrite"
                  :disabled="disableRunToFile"
                >
                  <x-label>{{ runPrimaryText(true) }}</x-label>
                  <x-shortcut :value="displayShortcut('queryEditor.primaryQueryToFileAction')" />
                  <i
                    v-if="isCommunity"
                    class="material-icons menu-icon "
                  >
                    stars
                  </i>
                </x-menuitem>
                <x-menuitem
                  @click.prevent="queryFunctions.secondaryWrite"
                  :disabled="disableRunToFile"
                >
                  <x-label>{{ runSecondaryText(true) }}</x-label>
                  <x-shortcut :value="displayShortcut('queryEditor.secondaryQueryToFileAction')" />
                  <i
                    v-if="isCommunity"
                    class="material-icons menu-icon"
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
        :editData="resultEditData"
        :editingData="editingResult"
        :focus="focusingElement === 'table'"
        :active="active"
        :table-height="tableHeight"
        :result="result"
        :query="query"
        :tab="tab"
        :isManualCommit="isManualCommit"
        :binary-encoding="$bksConfig.ui.general.binaryEncoding"
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
        :editing="editingResult"
        :changesCount="$refs.table?.pendingChangesCount"
        :changesString="$refs.table?.pendingChangesString"
        :result-editable="resultEditable"
        @editResults="editResults"
        @stopEditing="stopEditing"
        @saveChanges="saveChanges"
        @copyToSql="copyToSql"
        @discardChanges="discardChanges"
        @download="download"
        @clipboard="clipboard"
        @clipboardJson="clipboardJson"
        @clipboardMarkdown="clipboardMarkdown"
        @submitCurrentQueryToFile="submitCurrentQueryToFile"
        @wrap-text="wrapText = !wrapText"
        :execute-time="executeTime"
        :elapsed-time="elapsedTime"
        :active="active"
      />
    </div>

    <!-- Super-Formatter Modal -->
    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal super-formatter-modal"
        @opened="getPresets"
        :name="superFormatterId"
        :scrollable="true"
      >
        <div class="dialog-content">
          <div class="dialog-c-title">
            <p>
              Super Formatter
            </p>
          </div>
          <bks-super-formatter
            :value="unsavedText"
            :formatter-dialect="formatterDialect"
            :identifier-dialect="identifierDialect"
            :can-add-presets="true"
            :clipboard="$native.clipboard"
            :starting-preset="selectedFormatter ?? undefined"
            :presets="formatterPresets"
            @bks-apply-preset="applyPreset"
            @bks-save-preset="savePreset"
            @bks-create-preset="savePreset"
            @bks-delete-preset="deletePreset"
          >
            <template #start-footer>
              <button
                type="button"
                class="btn btn-small btn-flat"
                aria-label="Close super formatter"
                title="Close super formatter"
                @click="handleFormatterPresetModal({ showFormatter: false })"
              >
                Cancel
              </button>
            </template>
          </bks-super-formatter>
        </div>
      </modal>
    </portal>

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
              <div class="form-group" v-if="queryFolders && queryFolders.length > 0">
                <label>Folder <i v-if="!isUltimate && !isCloud" class="material-icons menu-icon">stars</i></label>
                <select v-model="query.queryFolderId" :disabled="!isUltimate && !isCloud">
                  <option :value="null">No folder</option>
                  <option v-for="f in queryFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
                </select>
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
                    <label>{{ isNumber(param) ? `? ${param + 1}` : param }}</label>
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
  import Noty from 'noty'
  import { mapGetters, mapState } from 'vuex'
  import { identify } from 'sql-query-identifier'

  import { canDeparameterize, convertParamsForReplacement, deparameterizeQuery } from '../lib/db/sql_tools'
  import { EditorMarker } from '@/lib/editor/utils'
  import ProgressBar from './editor/ProgressBar.vue'
  import ResultTable from './editor/ResultTable.vue'
  import ShortcutHints from './editor/ShortcutHints.vue'
  import SqlTextEditor from "@beekeeperstudio/ui-kit/vue/sql-text-editor"
  import BksSuperFormatter from "@beekeeperstudio/ui-kit/vue/super-formatter"
  import SurrealTextEditor from "@beekeeperstudio/ui-kit/vue/surreal-text-editor"
  import type { Entity } from "@beekeeperstudio/ui-kit";

  import QueryEditorStatusBar from './editor/QueryEditorStatusBar.vue'
  import rawlog from '@bksLogger'
  import ErrorAlert from './common/ErrorAlert.vue'
  import MergeManager from '@/components/editor/MergeManager.vue'
  import { AppEvent } from '@/common/AppEvent'
  import { PropType } from 'vue'
  import { TransportOpenTab, findQuery } from '@/common/transport/TransportOpenTab'
  import { blankFavoriteQuery } from '@/common/transport'
  import { FieldEditData, TableOrView } from "@/lib/db/models";
  import { FormatterDialect, dialectFor } from "@shared/lib/dialects/models"
  import { findSqlQueryIdentifierDialect } from "@/lib/editor/CodeMirrorPlugins";
  import { queryMagicExtension } from "@/lib/editor/extensions/queryMagicExtension";
  import { getVimKeymapsFromVimrc } from "@/lib/editor/vim";
  import { monokaiInit } from '@uiw/codemirror-theme-monokai';
  import { SmartLocalStorage } from '@/common/LocalStorage';
  import { IdentifyResult } from 'sql-query-identifier/lib/defines'
import { KeybindingPath } from '@/common/bksConfig/BksConfigProvider'
  import { wait } from '@/shared/lib/wait'

  const log = rawlog.scope('query-editor')
  const isEmpty = (s) => _.isEmpty(_.trim(s))
  const editorDefault = "\n\n\n\n\n\n\n\n\n\n"
  const hasUsedTransactionsKey = "hasUsedTransactions";

  export default {
    // this.queryText holds the current editor value, always
    components: { ResultTable, ProgressBar, ShortcutHints, QueryEditorStatusBar, ErrorAlert, MergeManager, SqlTextEditor, SurrealTextEditor, BksSuperFormatter},
    props: {
      tab: Object as PropType<TransportOpenTab>,
      active: Boolean
    },
    data() {
      return {
        results: [],
        running: false,
        runningCount: 1,
        runningType: 'current',
        selectedResult: 0,
        unsavedText: editorDefault,
        editor: {
          height: 100,
          selection: null,
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
        elapsedTime: 0,
        timerInterval: null,
        tableHeight: 0,
        savePrompt: false,
        lastWord: null,
        queryParameterValues: {},
        queryForExecution: null,
        executeTime: 0,
        originalText: "",
        initialized: false,
        blankQuery: blankFavoriteQuery(),
        fullQuery: null,
        dryRun: false,
        containerResizeObserver: null,
        onTextEditorBlur: null,
        wrapText: false,
        vimKeymaps: [],
        formatterPresets: [],
        selectedFormatter: null,
        /**
         * NOTE: Use focusElement instead of focusingElement or blurTextEditor()
         * if we want to switch focus. Why two states? We need a feedback from
         * text editor cause it can't release focus automatically.
         *
         * Possible values: 'text-editor', 'table', 'none'
         */
        focusElement: 'none',
        focusingElement: 'none',

        individualQueries: [],
        currentlySelectedQuery: null,
        queryMagic: queryMagicExtension(),
        isManualCommit: false,
        hasActiveTransaction: false,
        transactionTimeoutWarningListenerId: null,
        transactionTimeoutListenerId: null,
        showKeepAlive: false,
        warningNoty: null,
        showTransactionActiveTooltip: false,
        enteredTransactionFromIdent: false,
        queryFunctions: {} as {
          primaryRead: () => Promise<void>,
          secondaryRead: () => Promise<void>,
          primaryWrite: () => Promise<void>,
          secondaryWrite: () => Promise<void>,
        },
        editingResult: false,
        resultsEditData: [],
        resultEditableMap: []
      }
    },
    computed: {
      ...mapGetters(['dialect', 'dialectData', 'defaultSchema', 'isUltimate', 'isCloud']),
      ...mapGetters({
        'isCommunity': 'licenses/isCommunity',
        'userKeymap': 'settings/userKeymap',
      }),
      ...mapState(['usedConfig', 'connectionType', 'database', 'tables', 'storeInitialized', 'connection']),
      ...mapState('data/queries', {'savedQueries': 'items'}),
      ...mapState('data/queryFolders', { queryFolders: 'items' }),
      ...mapState('settings', ['settings']),
      ...mapState('tabs', { 'activeTab': 'active' }),
      ...mapGetters('popupMenu', ['getExtraPopupMenu']),
      readOnly() {
        if (this.remoteDeleted) {
          return true;
        }
        return false;
      },
      queryTabTitle() {
        if (this.tab.query && this.tab.query.title) {
          return this.tab.query.title;
        }

        return ''
      },
      canManageTransactions() {
        return !this.dialectData?.disabledFeatures?.manualCommit;
      },
      editorComponent() {
        return this.connectionType === 'surrealdb' ? SurrealTextEditor : SqlTextEditor;
      },
      enabled() {
        return !this.dialectData?.disabledFeatures?.queryEditor;
      },
      disableRunToFile() {
        return this.dialectData?.disabledFeatures?.export?.stream
      },
      superFormatterId() {
        return `super-formatter-${this.tab.id}`
      },
      shouldInitialize() {
        return this.storeInitialized && this.active && !this.initialized
      },
      remoteDeleted() {
        return this.storeInitialized && this.tab.queryId && !this.query
      },
      query() {
        return this.fullQuery ?? this.blankQuery
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
          'mongodb': 'psql'
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
      runButtonTooltip() {
        if (this.tab.isRunning || this.running) {
          return "Query is already running."
        } else if (this.editingResult && this.changesCount > 0) {
          return "Discard or apply your changes to run queries";
        } else {
          return null
        }
      },
      runButtonDisabled() {
        return this.tab.isRunning ||
          this.running ||
          (this.editingResult && this.changesCount > 0);
      },
      changesCount() {
        return this.$refs.table?.pendingChangesCount;
      },
      pendingChangesString() {
        return this.$refs.table?.pendingChangesString;
      },
      resultEditData() {
        return this.resultsEditData[this.selectedResult]
      },
      resultEditable() {
        return this.resultEditableMap[this.selectedResult]
      },
      result() {
        return this.results[this.selectedResult]
      },
      rowCount() {
        return this.result && this.result.rows ? this.result.rows.length : 0
      },
      hasText() {
        return !isEmpty(this.unsavedText)
      },
      hasTitle() {
        return this.query?.title && this.query.title.replace(/\s+/, '').length > 0
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
          'queryEditor.primaryQueryToFileAction': this.queryFunctions.primaryWrite,
          'queryEditor.secondaryQueryToFileAction': this.queryFunctions.secondaryWrite,
          'queryEditor.manualCommit': this.manualCommit,
          'queryEditor.manualRollback': this.manualRollback,
        })
      },
      queryParameterPlaceholders() {
        let params = this.individualQueries.flatMap((qs) => qs.parameters)

        if (this.currentlySelectedQuery && (this.hasSelectedText || this.runningType === 'current')) {
          params = this.currentlySelectedQuery.parameters
        }

        if (params.length && params.includes('?')) {
          let posIndex = 0; // number doesn't matter, this just distinguishes positional from other types
          params = params.map((param) => {
            if (param != '?') return param;

            return posIndex++;
          })
        }

        return _.uniq(params)
      },
      deparameterizedQuery() {
        let query = this.queryForExecution
        if (_.isEmpty(query)) {
          return query;
        }

        try {
          const placeholders = this.individualQueries.flatMap((qs) => qs.parameters);
          if (_.isEmpty(placeholders)) {
            return query;
          }
          const values = Object.values(this.queryParameterValues) as string[];
          const convertedParams = convertParamsForReplacement(placeholders, values);
          query = deparameterizeQuery(query, this.dialect, convertedParams, this.paramTypes);
        } catch (ex) {
          log.error("Unable to deparameterize query", ex)
        }

        return query;
      },
      unsavedChanges() {
        if (_.trim(this.unsavedText) === "" && _.trim(this.originalText) === "") return false

        return !this.query?.id ||
          _.trim(this.unsavedText) !== _.trim(this.originalText)
      },
      keybindings() {
        const keybindings = this.$CMKeymap({
          'general.save': this.triggerSave,
          'queryEditor.primaryQueryAction': this.queryFunctions.primaryRead,
          'queryEditor.secondaryQueryAction': this.queryFunctions.secondaryRead
        })

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
        if (this.errorMarker) markers.push(this.errorMarker)
        return markers
      },
      showResultTable() {
        return this.rowCount > 0
      },
      entities() {
        return this.tables.map((t: TableOrView) => ({
          schema: t.schema,
          name: t.name,
          entityType: t.entityType,
        }) as Entity)
      },
      queryDialect() {
        return this.dialectData.queryDialectOverride ?? this.connectionType;
      },
      formatterDialect() {
        return FormatterDialect(dialectFor(this.queryDialect))
      },
      paramTypes() {
        // TODO: Parameter replacement for redis
        if (this.dialect === 'redis') {
          return {};
        }
        const dbType = this.connectionType === 'postgresql' ? 'postgres' : this.connectionType;
        return this.$bksConfig.db[dbType]?.paramTypes
      },
      identifierDialect() {
        return findSqlQueryIdentifierDialect(this.queryDialect)
      },
      languageIdForDialect() {
        // Map textEditorMode to CodeMirror 6 languageId
        if (this.dialectData.textEditorMode === 'text/x-redis') {
          return 'redis';
        }
        return this.dialectData.textEditorMode;
      },
      replaceExtensions() {
        return (extensions) => {
          return [
            extensions,
            monokaiInit({
              settings: {
                selection: "",
                selectionMatch: "",
              },
            }),
            this.queryMagic.extensions,
          ]
        }
      },
      primaryIsTab() {
        return this.$bksConfig.ui.queryEditor?.primaryQueryAction.toLowerCase() === 'submittabquery';
      },
      primaryIsCurrent() {
        return this.$bksConfig.ui.queryEditor?.primaryQueryAction.toLowerCase() === 'submitcurrentquery';
      },
    },
    watch: {
      selectedResult() {
        this.editingResult = false
      },
      error() {
        this.errorMarker = null
        if (this.dialect === 'postgresql' && this.error && this.error.position) {
          const [a, b] = this.locationFromPosition(this.queryForExecution, parseInt(this.error.position) - 1, parseInt(this.error.position))
          this.errorMarker = { from: a, to: b, type: 'error' } as EditorMarker
          this.error.marker = {line: b.line + 1, ch: b.ch}
        }
      },
      running() {
        if (this.running) {
          this.startTimer();
        } else {
          this.stopTimer();
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
          this.tab.unsavedChanges = false
          this.tab.alert = true
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
      async focusElement(element, oldElement) {
        if (oldElement === 'text-editor' && element !== 'text-editor') {
          await this.blurTextEditor()
        }
        this.focusingElement = element
      },
      hasActiveTransaction() {
        this.tab.isTransaction = this.hasActiveTransaction;
        this.updateTab();
      }
    },
    methods: {
      updateTab() {
        this.$emit('update-tab', this.tab)
      },
      formatterPreset() {
        this.handleFormatterPresetModal({ showFormatter: true })
      },
      handleFormatterPresetModal({ showFormatter }){
        if (showFormatter) {
          this.$modal.show(this.superFormatterId)
        } else {
          this.$modal.hide(this.superFormatterId)
        }
      },
      runPrimaryText(isWrite = false) {
        const writeText = isWrite ? ' to File' : '';

        let runText: string;
        if (this.hasSelectedText) {
          runText = 'Run Selection';
        } else if (this.primaryIsTab) {
          runText = 'Run All';
        } else {
          runText = 'Run Current';
        }

        return `${runText}${writeText}`
      },
      runSecondaryText(isWrite = false) {
        const writeText = isWrite ? ' to File' : '';

        let runText: string;
        if (this.primaryIsCurrent) {
          runText = 'Run All';
        } else {
          runText = 'Run Current';
        }

        return `${runText}${writeText}`
      },
      getQueryActions() {
        let primaryFunc = this.submitCurrentQuery
        let secondaryFunc = this.submitTabQuery
        let primaryWriteFunction = this.submitCurrentQueryToFile
        let secondaryWriteFunc = this.submitQueryToFile

        if (this.primaryIsTab) {
          primaryFunc = this.submitTabQuery
          secondaryFunc = this.submitCurrentQuery
          primaryWriteFunction = this.submitQueryToFile
          secondaryWriteFunc = this.submitCurrentQueryToFile
        }

        return {
          primaryFunc,
          secondaryFunc,
          primaryWriteFunction,
          secondaryWriteFunc
        }
      },
      getPresets(presetId) {
        this.$util.send('appdb/formatter/getAll')
          .then((presets) => {
            const presetToFind = typeof presetId === 'object' ? this.$bksConfig.ui.queryEditor.defaultFormatter : presetId
            const selectedFormatter = presets.find(p => Number(p.id) === Number(presetToFind))

            if (selectedFormatter != null) this.selectedFormatter = { id: selectedFormatter.id, ...selectedFormatter.config }

            this.formatterPresets = presets
          })
          .catch(err => {
            console.error(err)
            throw new Error(err)
          })
      },
      applyPreset(presetConfig) {
        this.handleFormatterPresetModal({ showFormatter: false })
        this.selectedFormatter = { ...presetConfig }
      },
      async deletePreset({ id }) {
        if (!await this.$confirm('Are you sure you want to delete this configuation?')) {
          return
        }

        this.$util.send('appdb/formatter/deletePreset', { id })
          .then(() => {
            this.$noty.success('Formatter Configuration successfully deleted')
            this.selectedFormatter = null
            this.handleFormatterPresetModal({ showFormatter: false })
          })
          .catch(err => {
            const error_notice = this.$noty.error(`Formatter Configuration delete failed: ${err.message}`, {
              buttons: [
                Noty.button('Close', 'btn btn-primary', () => {
                  error_notice.close()
                })
              ]
            }).setTimeout(60 * 1000)

            throw new Error(err)
          })
      },
      savePreset({id, config, name}) {
        let inputData = {}
        let notyMessage = ''
        let presetId = id
        let endpoint

        if (id == null){
          notyMessage = 'Add new preset'
          endpoint = 'appdb/formatter/newPreset'
          inputData = {
            insertValues: {
              name,
              config
            }
          }
        } else {
          notyMessage = 'Updating preset'
          endpoint = 'appdb/formatter/updatePreset'
          inputData = {
            id,
            updateValues: {
              config
            }
          }
        }

        this.$util.send(endpoint, inputData)
          .then((presetValues) => {
            this.$noty.success(`${notyMessage} complete`)
            this.selectedFormatter = { id: presetValues.id, ...presetValues.config }
            presetId = presetValues.id
          })
          .catch(err => {
            const error_notice = this.$noty.error(`${notyMessage} failed: ${err.message}`, {
              buttons: [
                Noty.button('Close', 'btn btn-primary', () => {
                  error_notice.close()
                })
              ]
            }).setTimeout(60 * 1000)

            throw new Error(err)
          })
          .finally( () => {
            return this.getPresets(presetId)
          })
      },
      isNumber(value: any) {
        return _.isNumber(value);
      },
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
        this.query.title = this.activeTab?.title

        if (this.split) {
          this.split.destroy();
          this.split = null;
        }

        this.initializeQueries()
        this.tab.unsavedChanges = this.unsavedChanges

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

        // Making sure split.js is initialized
        this.$nextTick(() => {
          this.tableHeight = this.$refs.bottomPanel.clientHeight
          this.updateEditorHeight()
        })
      },
      handleEditorInitialized() {
        this.editor.initialized = true

        // Setup query magic data providers
        this.queryMagic.setDefaultSchemaGetter(() => this.defaultSchema);
        this.queryMagic.setTablesGetter(() => this.tables);

        // this gives the dom a chance to kick in and render these
        // before we try to read their heights
        this.$nextTick(() => {
          this.tableHeight = this.$refs.bottomPanel.clientHeight
          this.updateEditorHeight()
        })
      },
      handleEditorSelectionChange(detail) {
        this.editor.selection = detail.value
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
          this.tab.isRunning = false
          this.info = 'Query Execution Cancelled'
          await this.runningQuery.cancel();
          this.runningQuery = null;
        }
      },
      stopEditing() {
        this.editingResult = false;
      },
      async editResults() {
        if (this.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal, "Editable Query Results")
          return;
        }
        if (!this.resultsEditData[this.selectedResult]) {
          const resultEditData: FieldEditData[] = await this.connection.getResultEditData(this.result?.text, this.result.fields);


          const mapped = new Map(resultEditData.map((e) => [e.id, e]));
          this.$set(this.resultsEditData, this.selectedResult, mapped)
          await this.$nextTick();
          this.$refs.table.rebuildColumns()

          if (!resultEditData.some((e) => e.editable)) {
            this.$noty.warning("Editing results cannot be enabled because no primary keys are included in the query", {
              buttons: [
                Noty.button('Learn More', 'btn btn-primary', () => {
                  window.main.openExternally('https://beekeeperstudio.io/user_guide_sql_editor/editing-data.md')
                })
              ]
            })
            this.$set(this.resultEditableMap, this.selectedResult, false)
            await this.$nextTick();
            return;
          }
        }
        this.editingResult = true;
        wait(800).then(() => this.$tour.start("startedEditingResult"));
      },
      async saveChanges() {
        // This covers the instance where someone runs a query, toggles manual commit on, and then makes edits and tries to save them. This ensures it will then be inside a transaction
        if (this.canManageTransactions && this.isManualCommit && !this.hasActiveTransaction) {
          await this.manualBegin();
        }

        await this.$refs.table.saveChanges();
      },
      copyToSql() {
        this.$refs.table.copyToSql();
      },
      discardChanges() {
        this.$refs.table.discardChanges();
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
        height -= this.$refs.toolbar.clientHeight
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
            payload.excerpt = payload.text.substr(0, 250)
            this.$modal.hide(`save-modal-${this.tab.id}`)
            const id = await this.$store.dispatch('data/queries/save', payload)
            this.tab.queryId = id
            try {
              const savedQuery = await this.$store.dispatch('data/queries/findOne', id)
              this.fullQuery = savedQuery
            } catch (e) {
              log.error("Could not find saved query", e);
              // fallback to payload
              this.fullQuery = payload;
            }

            this.$nextTick(async () => {
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
      addTransactionTimeoutListener() {
        const connectionType = this.connectionType === 'postgresql' ? 'postgres' : this.connectionType;
        this.transactionTimeoutWarningListenerId = this.$util.addListener(`transactionTimeoutWarning/${this.tab.id}`, () => {
          this.showKeepAlive = true;
          this.warningNoty = this.$noty.warning(`The Transaction in ${this.tab?.query?.title ?? this.tab?.title } will be automatically rolled back soon!`, {
            buttons: [
              Noty.button('Show Tab', "btn btn-primary", () => {
                this.$store.dispatch('tabs/setActive', this.tab);
              })
            ],
            timeout: this.$bksConfig.db[connectionType].autoRollbackWarningWindow
          })
        })

        this.transactionTimeoutListenerId = this.$util.addListener(`transactionTimedOut/${this.tab.id}`, () => {
          this.toggleCommitMode();
          this.$noty.info("Transaction timed out and was automatically rolled back.", {
            buttons: [
              Noty.button('Show Tab', "btn btn-primary", () => {
                this.$store.dispatch('tabs/setActive', this.tab);
              })
            ]
          })
        })
      },
      removeTransactionTimeoutListener() {
        this.$util.removeListener(this.transactionTimeoutWarningListenerId);
        this.$util.removeListener(this.transactionTimeoutListenerId);
      },
      async submitQueryToFile() {
        if (this.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal, 'Query to File')
          return;
        }

        // run the currently highlighted text (if any) to a file, else all sql
        const query_sql = this.hasSelectedText && this.primaryIsTab ? this.editor.selection : this.unsavedText;
        if (this.runButtonDisabled) return;
        const saved_name = this.hasTitle ? this.query.title : null
        const tab_title = this.tab.title // e.g. "Query #1"
        const queryName = saved_name || tab_title
        this.trigger( AppEvent.beginExport, { query: query_sql, queryName: queryName });
      },
      async submitCurrentQueryToFile() {
        if (this.isCommunity) {
          this.$root.$emit(AppEvent.upgradeModal, 'Query to File')
          return;
        }
        if (this.runButtonDisabled) return;
        // run the currently selected query or highlighted (if there are multiple) to a file, else all sql
        let query_sql = ''

        if ( this.hasSelectedText && this.primaryIsCurrent) {
          query_sql = this.editor.selection
        } else if (this.currentlySelectedQuery) {
          query_sql = this.currentlySelectedQuery.text
        } else {
          query_sql = this.unsavedText
        }
        const saved_name = this.hasTitle ? this.query.title : null
        const tab_title = this.tab.title // e.g. "Query #1"
        const queryName = saved_name || tab_title
        this.trigger( AppEvent.beginExport, { query: query_sql, queryName: queryName });
      },
      async submitCurrentQuery() {
        if(this.runButtonDisabled) return;
        this.runningType = 'current'

        if (this.hasSelectedText && this.primaryIsCurrent) {
          this.runningType = 'selection'
          return await this.submitQuery(this.editor.selection)
        }

        if (this.currentlySelectedQuery) {
          return await this.submitQuery(this.currentlySelectedQuery.text)
        }

        const queries = identify(this.unsavedText, { strict: false, dialect: this.identifierDialect, paramTypes: this.paramTypes })
        if (queries.length > 0) {
          this.individualQueries = queries
          this.currentlySelectedQuery = queries[0]
          return await this.submitQuery(this.currentlySelectedQuery.text)
        } else {
          this.results = []
          this.error = 'No query to run'
        }
      },
      async submitTabQuery() {
        if (this.runButtonDisabled) return;

        let text = '';

        if (this.hasSelectedText && this.primaryIsTab) {
          text = this.editor.selection;
          this.runningType = 'selection';
        } else {
          text = this.unsavedText;
          this.runningType = 'everything';
        }

        if (text.trim()) {
          this.submitQuery(text)
        } else {
          this.error = 'No query to run'
        }
      },
      async maybeReserveConnection() {
        try {
          await this.connection.reserveConnection(this.tab.id);
        } catch (e) {
          await this.toggleCommitMode();
          this.$noty.error(e.message);
          return;
        }
      },
      async submitQuery(rawQuery, fromModal = false) {
        if (this.remoteDeleted) return;

        //Cancel existing query before starting a new one
        if(this.running && this.runningQuery){
          await this.cancelQuery();
        }

        if (this.canManageTransactions && this.isManualCommit && !this.hasActiveTransaction) {
          await this.manualBegin();
        }

        this.showKeepAlive = false
        this.maybeCloseWarningNoty();
        this.error = null
        this.queryForExecution = rawQuery
        this.results = []
        this.resultsEditData = []
        this.resultEditableMap = []
        this.editingResult = false
        this.selectedResult = 0
        let identification = []
        try {
          identification = identify(rawQuery, { strict: false, dialect: this.identifyDialect, identifyTables: true, identifyColumns: true })

          if (this.canManageTransactions && identification.some((value: IdentifyResult) => value.executionType === "TRANSACTION")) {
            const startTransaction = identification.filter((value: IdentifyResult) => value.type === "BEGIN_TRANSACTION").length
            const endTransaction = identification.filter((value: IdentifyResult) => value.type === "COMMIT" || value.type === "ROLLBACK").length

            if (!this.isManualCommit && !this.hasActiveTransaction && startTransaction > endTransaction) {
              await this.toggleCommitMode();
              await this.maybeReserveConnection();
              this.enteredTransactionFromIdent = true;
              this.hasActiveTransaction = true;
            } else if (this.isManualCommit && this.hasActiveTransaction && endTransaction > startTransaction) {
              await this.toggleCommitMode();
            }
          }
        } catch (ex) {
          log.error("Unable to identify query", ex)
        }

        try {
          if (this.hasParams && (!fromModal || this.paramsModalRequired)) {
            const params = this.individualQueries.flatMap((qs) => qs.parameters);
            if (canDeparameterize(params)) {
              this.$modal.show(`parameters-modal-${this.tab.id}`)
              return;
            } else {
              this.error = `You can't use positional and non-positional parameters at the same time`
              return;
            }
          }

          this.tab.isRunning = true
          this.updateTab();
          this.running = true

          const query = this.deparameterizedQuery
          this.$modal.hide(`parameters-modal-${this.tab.id}`)
          this.runningCount = identification.length || 1
          // Dry run is for bigquery, allows query cost estimations
          this.runningQuery = await this.connection.query(query, this.tab.id, { dryRun: this.dryRun}, this.hasActiveTransaction);
          const queryStartTime = new Date()
          const results = await this.runningQuery.execute();
          const queryEndTime = new Date()

          // https://github.com/beekeeper-studio/beekeeper-studio/issues/1435
          if (!document.hasFocus() && window.Notification && Notification.permission === "granted") {
            new window.Notification("Query Complete", {
              body: `${this.tab.title} has been executed successfully.`,
            });
          }
          log.info("RESULTS: ", results)

          // eslint-disable-next-line
          // @ts-ignore
          this.executeTime = queryEndTime - queryStartTime
          let totalRows = 0
          results.forEach((result, idx) => {
            result.rowCount = result.rowCount || 0

            totalRows += result.totalRowCount
            const identifiedTables = identification[idx]?.tables || []
            if (identifiedTables.length > 0) {
              result.tableName = identifiedTables[0]?.name
              result.schema = identifiedTables[0]?.schema
            } else {
              result.tableName = "mytable"
              result.schema = this.defaultSchema
            }
          })
          this.results = Object.freeze(results);
          this.resultsEditData = this.results.map(() => null)
          this.resultEditableMap = this.results.map(() => true)

          // const defaultResult = Math.max(results.length - 1, 0)

          const nonEmptyResult = _.chain(results).findLastIndex((r) => !!r.rows?.length).value()
          console.log("non empty result", nonEmptyResult)
          this.selectedResult = nonEmptyResult === -1 ? results.length - 1 : nonEmptyResult

          const lastQuery = this.$store.state['data/usedQueries']?.items?.[0]
          const isDuplicate = lastQuery?.text?.trim() === query?.trim()

          const queryObj = {
            text: query,
            excerpt: query.substr(0, 250),
            numberOfRecords: totalRows,
            queryId: this.query?.id,
            connectionId: this.usedConfig.id
          }

          if(lastQuery && isDuplicate){
            queryObj.updatedAt = new Date();
            queryObj.id = lastQuery.id;
          }

          this.$store.dispatch('data/usedQueries/save', queryObj)

          log.debug('identification', identification)
          const found = identification.find(i => {
            return i.type === 'CREATE_TABLE' || i.type === 'DROP_TABLE' || i.type === 'ALTER_TABLE'
          })
          if (found) {
            this.$store.dispatch('updateTables')
          }
          wait(1200).then(() => this.$tour.start("ranQuerySuccessfully"));
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
          const queries = identify(originalText, { strict: false, dialect: this.identifierDialect, paramTypes: this.paramTypes })
          if (queries.length > 0) {
            this.individualQueries = queries
            this.currentlySelectedQuery = queries[0]
          }

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
      maybeCloseWarningNoty() {
        if (this.warningNoty) {
          this.warningNoty.close();
          this.warningNoty = null;
        }
      },
      async toggleCommitMode(mode?: "manual" | "auto") {
        if (!this.canManageTransactions) return
        if (_.isNil(mode)) {
          mode = this.isManualCommit ? "auto" : "manual";
        } else if ((mode === "manual" && this.isManualCommit)
          || (mode === "auto" && !this.isManualCommit)) {
          return
        }
        if (mode === "auto") {
          if (this.hasActiveTransaction) {
            await this.connection.rollbackTransaction(this.tab.id);
          }
          this.hasActiveTransaction = false;
          await this.connection.releaseConnection(this.tab.id);
        }

        this.enteredTransactionFromIdent = false;
        this.showKeepAlive = false;
        this.maybeCloseWarningNoty();
        this.isManualCommit = mode === "manual";
      },
      async manualBegin() {
        await this.maybeReserveConnection();
        await this.connection.startTransaction(this.tab.id);
        this.hasActiveTransaction = true
        if (SmartLocalStorage.exists(hasUsedTransactionsKey)) {
          this.showTransactionActiveTooltip = false;
        } else {
          SmartLocalStorage.setBool(hasUsedTransactionsKey, true);
          this.showTransactionActiveTooltip = true;
        }
      },
      async manualCommit() {
        if (!this.canManageTransactions || !this.hasActiveTransaction) return
        this.showKeepAlive = false;
        this.maybeCloseWarningNoty();
        await this.connection.commitTransaction(this.tab.id);
        await this.connection.releaseConnection(this.tab.id);
        this.hasActiveTransaction = false;
        this.$noty.success("Successfully committed transaction")

        if (this.enteredTransactionFromIdent) {
          await this.toggleCommitMode();
        }
      },
      async manualRollback() {
        if (!this.canManageTransactions || !this.hasActiveTransaction) return
        await this.connection.rollbackTransaction(this.tab.id)
        await this.connection.releaseConnection(this.tab.id);
        this.showKeepAlive = false;
        this.maybeCloseWarningNoty();
        this.hasActiveTransaction = false;
        this.$noty.success("Successfully rolled back transaction")

        if (this.enteredTransactionFromIdent) {
          await this.toggleCommitMode();
        }
      },
      async keepAliveTransaction() {
        this.showKeepAlive = false;
        this.maybeCloseWarningNoty();
        await this.$util.send('conn/resetTransactionTimeout', { tabId: this.tab.id });
      },
      async columnsGetter(tableName: string) {
        let table = this.tables.find(
          (t: TableOrView) => t.name === tableName || `${t.schema}.${t.name}` === tableName
        );

        if (!table) {
          return null;
        }

        // Only refresh columns if we don't have them cached.
        if (!table.columns?.length) {
          await this.$store.dispatch("updateTableColumns", table);
          table = this.tables.find(
            (t: TableOrView) => t.name === tableName || `${t.schema}.${t.name}` === tableName
          );
        }

        return table?.columns.map((c) => c.columnName);
      },
      handleQuerySelectionChange({ queries, selectedQuery }) {
        this.individualQueries = queries;
        this.currentlySelectedQuery = selectedQuery;
      },
      startTimer() {
        this.elapsedTime = 0;
        this.timerInterval = setInterval(() => {
          this.elapsedTime += 1;
        }, 1000);
      },
      stopTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      },
      displayShortcut(shortcutPath: KeybindingPath) {
        const keybindings = this.$bksConfig.getKeybindings('context-menu', shortcutPath)
        const displayKeybinding: string = Array.isArray(keybindings) ? keybindings[0] : keybindings;
        return displayKeybinding;
      },
      editorContextMenu(_event, _context, items) {
        if (this.readOnly) {
          return [
            ...items,
            ...this.getExtraPopupMenu("editor.query", { transform: "ui-kit" }),
          ]
        }
        return [
          ...items,
          {
            label: "Open Query Formatter",
            id: "formatter",
            handler: this.formatterPreset
          },
          ...(window.platformInfo.isDevelopment && this.isCloud && this.query?.id
            ? [
                { type: "divider" },
                {
                  label: "[DEV] Make Fake Remote Change",
                  id: "fake-remote-change",
                  handler: this.fakeRemoteChange,
                },
              ]
            : []),
          ...this.getExtraPopupMenu("editor.query", { transform: "ui-kit" }),
        ];
      },
      getCommitModeVTooltip(options: {
        title: string;
        description: string;
        learnMoreLink?: string;
        className?: string;
        show?: boolean;
        onClose?: () => void;
      }) {
        const actions = `
          <div class="actions">
            ${options.learnMoreLink ? `<a href="${options.learnMoreLink}" class="btn btn-flat">Learn more</a>` : ''}
            ${options.show ? `<button class="btn btn-flat" data-close="true">Close</button>` : ''}
          </div>
        `;
        return {
          template: `
<div class="tooltip commit-mode-tooltip" role="tooltip">
  <div class="tooltip-arrow"></div>
  <div class="tooltip-inner"></div>
  <div class="tooltip-boundary"></div>
</div>`,
          content: `
<div class="commit-mode-tooltip-content ${options.className || ''}">
  <h2>${options.title}</h2>
  <p>${options.description}</p>
  ${(options.learnMoreLink || options.show) ? actions : ''}
  </div>
</div>`,
          delay: { show: 750 },
          html: true,
          autoHide: false,
          show: options.show,
          popperOptions: {
            onCreate(popper) {
              if (options.show && options.onClose) {
                popper.instance.popper.addEventListener("click", (e) => {
                  if (e.target.dataset?.close) {
                    options.onClose()
                  }
                })
              }
            },
          }
        };
      }
    },
    async mounted() {
      const {
        primaryFunc,
        secondaryFunc,
        primaryWriteFunction,
        secondaryWriteFunc
      } = this.getQueryActions()

      this.queryFunctions = {
        primaryRead: primaryFunc,
        secondaryRead: secondaryFunc,
        primaryWrite: primaryWriteFunction,
        secondaryWrite: secondaryWriteFunc
      }

      if (this.tab.queryId) {
        this.fullQuery = await this.$store.dispatch('data/queries/findOne', this.tab.queryId);
      } else if (this.tab.usedQueryId) {
        this.fullQuery = await this.$store.dispatch('data/usedQueries/findOne', this.tab.usedQueryId);
      }
      this.initializeQueries();

      if (this.shouldInitialize) {
        await this.$nextTick()
        this.initialize()
      }

      this.containerResizeObserver = new ResizeObserver(() => {
        this.updateEditorHeight()
      })
      this.containerResizeObserver.observe(this.$refs.container)

      if (this.active) {
        await this.$nextTick()
        this.focusElement = 'text-editor'
      }

      this.vimKeymaps = await getVimKeymapsFromVimrc()

      // Load formatter presets for context menu
      this.getPresets(this.$bksConfig.ui.queryEditor.defaultFormatter)
      this.addTransactionTimeoutListener();
    },
    beforeDestroy() {
      if(this.split) {
        this.split.destroy()
      }
      this.connection.releaseConnection(this.tab.id)
      this.containerResizeObserver.disconnect()
      this.removeTransactionTimeoutListener();
    },
  }
</script>

<style lang="scss" scoped>
  @use "sass:color";
  @import '../assets/styles/app/_variables';

  label[for="commit-mode"] {
    color: var(--text);
  }

  #commit-mode {
    --togglebutton-color: color-mix(
      in srgb,
      var(--theme-base) 60%,
      var(--query-editor-bg)
      );
    --togglebutton-background: color-mix(
      in srgb,
      var(--theme-base) 6%,
      var(--query-editor-bg));
    --togglebutton-content-checked-color: var(--theme-base);
    --togglebutton-content-checked-background: color-mix(
      in srgb,
      var(--theme-base) 15%,
      var(--query-editor-bg));
  }

  .manual-commit-notice {
    display: flex;
    gap: 0.5rem;
    padding-block: 0.5rem;
    padding-inline: 0.75rem;
    margin-bottom: -0.75rem;
    color: $brand-danger;
    font-size: 0.85rem;

    [class^="material-icons"] {
      font-size: 1.2em;
    }
  }

  .fade-swap-enter-active,
  .fade-swap-leave-active {
    transition: opacity 0.25s ease;
  }

  .fade-swap-enter,
  .fade-swap-leave-to {
    opacity: 0;
  }

  .fade-swap-leave-active {
    position: absolute;
  }

  .transaction-indicator {
    line-height: 1;
    font-size: 0.9rem;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
    color: var(--brand-warning);
    font-weight: bold;
    background: color-mix(
      in srgb,
      var(--brand-warning) 4%,
      var(--query-editor-bg));
    border-radius: 9999px;
    padding: 0.215rem 0.75rem;
    box-shadow: 0 0 6px 0 rgb(from var(--brand-warning) r g b / 0.7);
    animation: glowAndDrop 0.9s cubic-bezier(0.33, 0, 0.2, 1) forwards;
  }

  @keyframes glowAndDrop {
    0% {
      box-shadow: 0 0 0px 0 rgb(from var(--brand-warning) r g b / 0);
    }

    60% {
      box-shadow: 0 0 10px 0px rgb(from var(--brand-warning) r g b / 1);
    }

    100% {
      box-shadow: 0 0 3px 0 rgb(from var(--brand-warning) r g b / 1);
    }
  }

  .top-panel {
    position: relative;
  }

  .top-panel-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
    background-color: rgba(from var(--theme-bg) r g b / 70%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    flex-direction: column;
    gap: 1rem;
  }

  // Hide the dot on the range highlight when not editing result
  .query-editor:not(.editing-result) ::v-deep .tabulator-range-active::after {
    visibility: hidden;
  }
</style>


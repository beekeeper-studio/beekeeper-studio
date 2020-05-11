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
      <progress-bar v-if="running"></progress-bar>
      <result-table ref="table" v-else-if="rowCount > 0" :tableHeight="tableHeight" :result="result" :query='query'></result-table>
      <div class="alert alert-info" v-else-if="result"><i class="material-icons">info</i>Query Executed Successfully. No Results</div>
      <div class="alert alert-danger" v-else-if="error"><i class="material-icons">warning</i>{{error}}</div>
      <div v-else><!-- No Data --></div>
      <span class="expand" v-if="!result"></span>
      <footer class="status-bar row query-meta" v-bind:class="{'empty': !result}">
        <template v-if="results.length > 0">
          <span v-show="results.length > 1" class="result-selector">
            <div class="select-wrap">
              <select name="resultSelector" id="resultSelector" v-model="selectedResult" class="form-control">
                <option v-for="(result, index) in results" :selected="selectedResult == index" :key="index" :value="index">Result {{index + 1}}</option>
              </select>
            </div>
          </span>
          <div class="row-counts">
            <span class="num-rows" v-if="rowCount > 0">{{rowCount}} Records</span>
            <span class="truncated-rows" v-if="result && result.truncated"> &middot; only {{result.truncatedRowCount}} shown.</span>
          </div>
          <span class="affected-rows" v-if="affectedRowsText ">{{ affectedRowsText}}</span>
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
          <button class="btn btn-flat" type="button" @click.prevent="$modal.hide('save-modal')">Cancel</button>
          <button class="btn btn-primary" type="submit">Save</button>
        </div>
      </form>
    </modal>

    <!-- Parameter modal -->
    <modal class="vue-dialog beekeeper-modal" name="parameters-modal" @closed="selectEditor" height="auto" :scrollable="true">
      <form @submit.prevent="deparameterizeQueryResolve">
        <div class="dialog-content">
          <div class="dialog-c-title">Provide parameter values</div>
          <div class="modal-form">
            <div class="form-group">
                <div v-for="(param, index) in queryParameterPlaceholders" v-bind:key="index">
                  <div class="form-group row">
                    <label>{{param}}</label>
                    <input type="text" class="form-control" v-model="queryParameterValues[param]" autofocus>
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
  import CodeMirror from 'codemirror'
  import Split from 'split.js'
  import Pluralize from 'pluralize'

  import { mapState } from 'vuex'

  import ProgressBar from './editor/ProgressBar'
  import ResultTable from './editor/ResultTable'

  export default {
    components: { ResultTable, ProgressBar },
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

        queryParameterValues: {},
        deparameterizeQueryResolve: null,
      }
    },
    computed: {
      result() {
        return this.results[this.selectedResult]
      },
      query() {
        return this.tab.query
      },
      queryText() {
        return this.tab.query.text
      },
      affectedRowsText() {
        if (!this.result) {
          return null
        }

        const rows = this.result.affectedRows || 0
        return `${rows} ${Pluralize('row', rows)} affected`
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
        let query = _.get(this.query, 'text');
        if (_.isEmpty(query)) {
          return query;
        }

        // Get parameter placeholders that follow the patterns:
        // :project_id, :user_id
        // $1, $2
        // Positional ? parameters are not yet supported
        const namedAndNumberedParams = Array.from(query.matchAll(/(?:\W|^)(:\w+|\$\d+)(?:\W|$)/g)).map(match => match[1])

        if (!namedAndNumberedParams.length) {
          return null;
        }

        return _.uniq(namedAndNumberedParams);
      },
      deparameterizedQuery() {
        let query = _.get(this.query, 'text');
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
      escapeRegExp(string) {
        return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
      },
      async submitQuery() {
        this.running = true
        this.results = []
        this.selectedResult = 0
        try {
          let query = this.query;

          if (this.queryParameterPlaceholders) {
            this.$modal.show('parameters-modal')
            await new Promise(resolve => this.deparameterizeQueryResolve = resolve);
            this.$modal.hide('parameters-modal')
            query = this.deparameterizedQuery;
          }

          const runningQuery = this.connection.query(query);
          const results = await runningQuery.execute()
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
          this.$store.dispatch('logQuery', { text: this.editor.getValue(), rowCount: totalRows})
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


r
<template>
  <div class="query-editor" v-hotkey="keymap">
    <div class="top-panel" ref="topPanel">
      <textarea name="editor" class="editor" ref="editor" id="" cols="30" rows="10"></textarea>
      <span class="expand"></span>
      <div class="actions text-right">
        <a href="" v-tooltip="'(ctrl + enter)'" @click.prevent="submitQuery" class="btn btn-primary">Run Query</a>
      </div>
    </div>
    <div class="bottom-panel" ref="bottomPanel">
      <progress-bar v-if="running"></progress-bar>
      <result-table v-else-if="result" :tableHeight="tableHeight" :result="result"></result-table>
      <div class="error" v-else-if="error">{{error}}</div>
      <!-- TODO (gregory): Make the no results section nicer -->
      <!-- QUESTION (matthew): Should this even display if there are no results? -->
      <div v-else class="not-run-yet">No Results</div>
    </div>
  </div>
</template>

<script>

  import _ from 'lodash'
  import CodeMirror from 'codemirror'

  import Split from 'split.js'

  import config from '../config'
  import { UsedQuery } from '../entity/used_query'
  import { mapState } from 'vuex'

  import ProgressBar from './editor/ProgressBar'
  import ResultTable from './editor/ResultTable'

  export default {
    components: { ResultTable, ProgressBar },
    props: ['query', 'active'],
    data() {
      return {
        result: null,
        running: false,
        editor: null,
        runningQuery: null,
        error: null,
        split: null,
        tableHeight: 0
      }
    },
    computed: {
      splitElements() {
        return [
          this.$refs.topPanel,
          this.$refs.bottomPanel,
        ]
      },
      keymap() {
        return {
          'ctrl+l': this.selectEditor
        }
      },
      ...mapState(['usedConfig', 'connection', 'database', 'tables'])
    },
    watch: {
      active() {
        if(this.active) {
          this.editor.focus()
        }
      }
    },
    methods: {

      selectEditor() {
        this.editor.focus()
      },
      async submitQuery() {
        const run = new UsedQuery()
        run.text = this.editor.getValue()
        run.database = this.database
        run.connectionHash = this.usedConfig.uniqueHash
        console.log(run)
        return await this.runQuery(run)
      },
      async runQuery(queryRun) {
        console.log(queryRun)
        this.running = true
        // TODO (matthew): Allow multiple queries executed here.
        try {
          this.runningQuery = this.connection.query(queryRun.text)
          queryRun.status = 'running'
          const results = await this.runningQuery.execute()
          const result = results[0]

          // TODO (matthew): remove truncation logic somewhere sensible
          if (result.rowCount > config.maxResults) {
            result.rows = _.take(result.rows, config.maxResults)
            result.truncated = true
            result.truncatedRowCount = config.maxResults
          }
          this.result = result
          queryRun.status = 'completed'
          queryRun.numberOfRecords = this.result.rowCount
          await queryRun.save()
        } catch(ex) {
          this.error = ex
          this.result = null
          throw ex
        } finally {
          this.running = false
        }

      }
    },
    mounted() {
      const $editor = this.$refs.editor
      // TODO (matthew): Add hint options for all tables and columns
      let startingValue = ""
      for (var i = 0; i < 9; i++) {
          startingValue += '\n';
      }


      this.editor = CodeMirror.fromTextArea($editor, {
        lineNumbers: true,
        mode: "sql",
        theme: 'monokai'
      })
      this.editor.setValue(startingValue)

      const runQueryKeyMap = {
        "Ctrl-Enter": this.submitQuery,
        "Cmd-Enter": this.submitQuery
      }
      this.editor.addKeyMap(runQueryKeyMap)

      this.$nextTick(() => {
        this.editor.focus()
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
            })
          }
        })
        this.tableHeight = this.$refs.bottomPanel.clientHeight
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

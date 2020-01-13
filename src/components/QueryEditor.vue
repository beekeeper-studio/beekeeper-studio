<template>
  <div class="query-editor">
    <div class="top-panel" ref="topPanel">
      <textarea name="editor" class="editor" ref="editor" id="" cols="30" rows="10"></textarea>
      <span class="expand"></span>
      <div class="actions text-right">
        <a href="" @click.prevent="submitQuery" class="btn btn-primary">Run Query</a>
      </div>
    </div>
    <div class="bottom-panel" ref="bottomPanel">
      <div v-if="running" class="running">
        <div class="container">
          <div class="row justify-content-center">
            <div class="col-md-8">
              <div class="card">
                <div class="card-body">
                  <div class="progress">
                    <div class="progress-bar progress-bar-striped bg-info progress-bar-animated" style="width: 100%;">Retriculating Splines</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
      <result-table v-else-if="result" :result="result"></result-table>
      <div class="error" v-else-if="error">{{error}}</div>
      <div v-else class="not-run-yet">Nothing to show</div>
    </div>
  </div>
</template>

<script>
  import CodeMirror from 'codemirror'
  import ResultTable from './ResultTable.vue'
  import Split from 'split.js'

  import { UsedQuery } from '../entity/used_query'
import { mapState } from 'vuex'

  export default {
    components: { ResultTable },
    props: ['query'],
    data() {
      return {
        result: null,
        running: false,
        editor: null,
        runningQuery: null,
        error: null,
        split: null,
      }
    },
    computed: {
      splitElements() {
        return [
          this.$refs.topPanel,
          this.$refs.bottomPanel,
        ]
      },
      ...mapState(['usedConfig', 'connection', 'database', 'tables'])
    },
    methods: {
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
        this.runningQuery = this.connection.query(queryRun.text)
        // TODO (matthew): Allow multiple queries executed here.
        try {
          queryRun.status = 'running'
          const results = await this.runningQuery.execute()
          this.result = results[0]
          queryRun.status = 'completed'
          queryRun.numberOfRecords = this.result.rowCount
          await queryRun.save()
        } catch(ex) {
          this.error = ex
          this.result = null
          throw ex
        }

      }
    },
    mounted() {
      const $editor = this.$refs.editor
      // TODO (matthew): Add hint options for all tables and columns
      this.editor = CodeMirror.fromTextArea($editor, {
        lineNumbers: true,
        mode: "sql",
        theme: 'monokai'
      })
      this.$nextTick(() => {
        this.split = Split(this.splitElements, {
          elementStyle: (dimension, size, direction) => ({
              'flex-basis': `calc(${size}%)`,
          }),
          sizes: [50,50],
          gutterSize: 8,
          direction: 'vertical',
        })
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

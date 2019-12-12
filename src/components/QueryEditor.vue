<template>
  <div class="query-editor">
    <div class="top-panel">
      <textarea name="editor" class="editor" ref="editor" id="" cols="30" rows="10"></textarea>
      <div class="actions text-right">
        <a href="" @click.prevent="submitQuery" class="btn btn-link btn-primary">Run Query</a>
      </div>
    </div>
    <div class="bottom-panel">
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

  export default {
    components: { ResultTable },
    props: ['query', 'database', 'connection'],
    data() {
      return {
        result: null,
        running: false,
        editor: null,
        runningQuery: null,
        error: null,
      }
    },
    computed: {
    },
    methods: {
      async submitQuery() {
        const run = {
          queryText: this.editor.getValue(),
          database: this.database,
        }
        return await this.runQuery(run)
      },
      async runQuery(queryRun) {
        console.log(queryRun)
        this.runningQuery = this.connection.query(queryRun.queryText)
        // TODO (matthew): Allow multiple queries executed here.
        console.log(queryRun.queryText)
        try {
          const results = await this.runningQuery.execute()
          console.log(results)

          // TODO (matthew): Figure out multiple results. Right now we return the result of the first query
          this.result = results[0]
          console.log(this.result)
          queryRun.status = 'completed'
          queryRun.records = this.result.rowCount
        } catch(ex) {
          this.error = ex
          this.result = null
        }

      }
    },
    mounted() {
      const $editor = this.$refs.editor
      this.editor = CodeMirror.fromTextArea($editor, {
          lineNumbers: true,
          mode: "sql",
          theme: 'monokai'
        })
    },
  }
</script>

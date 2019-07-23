<template>
  <div class="query-editor">
    <div class="top-panel">
      <monaco-editor class="editor" v-model="query.queryText" language="sql"></monaco-editor>

      <div class="text-right">
        <a v-bind:click="runQuery" class="btn text-white btn-primary btn-sm">Execute Query</a>
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
      <result-table v-else-if="result" result="result"></result-table>
      <div v-else class="not-run-yet">Nothing to show</div>

    </div>

  </div>
</template>

<script>
  import MonacoEditor from 'vue-monaco'
  // import QueryRun from '../models/QueryRun.js'

  export default {
    components: { MonacoEditor },
    props: ['query', 'database', 'connection'],
    data() {
      return {
        result: null,
        running: false,
      }
    },
    computed: {
    },
    methods: {
      async submitQuery() {
        // const run = QueryRun.build({
        //   queryText: this.query.queryText,
        //   database: this.database,
        // })
        // return await this.runQuery(run)
      },
      async runQuery(queryRun) {
        const result = await this.connection.runQuery(
          queryRun.queryText
        )
        queryRun.status = 'completed'
        queryRun.records = result.length
        queryRun = await queryRun.save()
        this.result = result
      }
    }
  }
</script>


<style>

.editor {
  width: 100%;
  height: 400px;
}
</style>

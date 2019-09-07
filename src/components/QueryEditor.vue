<template>
  <div class="query-editor">
    <div class="top-panel">
      <textarea name="editor" class="editor" ref="editor" id="" cols="30" rows="10"></textarea>
      <div class="actions text-right">
        <a href="" @click.prevent="runQuery" class="btn btn-link btn-primary">Run Query</a>
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
      }
    },
    computed: {
    },
    methods: {
      async submitQuery() {
        const run = {
          queryText: this.query.queryText,
          database: this.database,
        }
        return await this.runQuery(run)
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
    },
    mounted() {
      const $editor = this.$refs.editor
      this.editor = CodeMirror.fromTextArea($editor, {
          lineNumbers: true,
          mode: "sql"
        })
    },
  }
</script>

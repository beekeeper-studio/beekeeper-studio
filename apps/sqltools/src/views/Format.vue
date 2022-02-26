<template>
  <div class="format">
    <section class="subheader">
      <div class="small-wrap">
        <h1>SQL Formatter
          </h1>
        <div class="subtitle">Quickly format your SQL query by pasting (or typing) it in the box below. Code generation is done client-side, no data is transferred to our servers. We're committed to <a class="text-primary" href="https://www.beekeeperstudio.io/mission/" target="_blank">privacy, and just not being creepy</a>.</div>
      </div>
    </section>
    <section>
      <div class="small-wrap">
        <div class="schema-header">


          <h2 class="title">Paste SQL</h2>
          <span class="expand"></span>
          <div class="actions"><a @click.prevent="clear" class="btn btn-flat">Clear</a></div>
        </div>
        <div class="form-group">
          <textarea placeholder="Paste your raw SQL here" name="input" id="input" rows="8" v-model="input"></textarea>
        </div>
        <div class="form-group">
          <label for="dialect">SQL Dialect</label>
          <dialect-picker />
        </div>
        <div class="output">
          <highlighted-code :code="output" :dialect="dialect" :format="true" >
            <h3 class="title">Formatted SQL</h3>
          </highlighted-code>
        </div>
      </div>
    </section>
  </div>

</template>
<script lang="ts">
import Vue from 'vue'
import HighlightedCode from '@/components/HighlightedCode.vue'
import { mapState } from 'vuex'
import DialectPicker from '@/components/DialectPicker.vue'
import _ from 'lodash'
export default Vue.extend({
  metaInfo() {
    return {
      title: "SQL Query Formatter for MySQL, PostgreSQL, SQLite, and SQL Server",
      meta: [
        {
          name: "description",
          content: "Paste unformatted SQL, get formatted SQL back. Format SQL for Postgres, MySQL, SQLite, and more."
        }
      ]
    }
  },
  components: { HighlightedCode, DialectPicker },
  data() {
    return {
      input: "",
      output: null
    }
  },
  methods: {
    clear() {
      this.input = null
    }
  },
  computed: {
    ...mapState(['dialect'])
  },
  watch: {
    input: _.debounce(function() {
      this.output = this.input;
    }, 300)
  }


})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  textarea {
    resize: vertical;
    height: initial;
    line-height: 1.2rem;
  }
</style>
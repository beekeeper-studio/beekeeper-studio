<template>
  <div class="format">
    <section class="subheader">
      <div class="small-wrap">
        <h1>SQL Formatter</h1>
        <div class="subtitle">Quickly format your SQL query by pasting (or typing) it in the box below. Code generation is done client-side, no data is transferred to our servers. We're committed to <a class="text-primary" href="https://www.beekeeperstudio.io/mission/" target="_blank">privacy, and just not being creepy</a>.</div>
      </div>
    </section>
    <section>
      <div class="small-wrap">
        <div class="form-group">
          <a @click.prevent="clear" class="btn">Clear</a>
          <textarea placeholder="Paste your raw SQL here" name="input" id="input" cols="30" rows="10" v-model="input"></textarea>
        </div>
        
        <div v-if="output" class="output">
          <highlighted-code :code="output" dialect="sql" >
            <h2>Formatted SQL</h2>
          </highlighted-code>
        </div>
        <div v-else>
          <div class="format-info">
            <p>
              <i class="material-icons">info</i> Formatted SQL will appear here
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>

</template>
<script lang="ts">
import Vue from 'vue'
import Formatter from 'sql-formatter'
import HighlightedCode from '@/components/HighlightedCode.vue'
export default Vue.extend({
  components: { HighlightedCode },
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
  watch: {
    input() {
      if (!this.input) {
        this.output = null
        return
      }
      this.output = Formatter.format(this.input, { language: 'sql' })
    }
  }

})
</script>
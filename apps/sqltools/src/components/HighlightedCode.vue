<template>
  <div class="highlighted-code">
    <div class="code-wrap">
      <div class="schema-header">
        <slot></slot>
        <span class="expand"></span>
        <div class="actions" v-if="code">
          <a v-clipboard:copy="code"
             v-clipboard:success="onCopySuccess"
             v-clipboard:error="onCopyError"
             class="btn btn-icon" :class="copyClass"
          ><span class="material-icons" :title='copyTitle'>{{copyIcon}}</span>{{copyMessage}}</a>
        </div>
      </div>
      <slot name="alert"></slot>
      <highlightjs :lang="highlightDialect" :code="code"  v-if="code" />
      <pre class="code-empty" v-else><div class="hljs">(Empty)</div></pre>
    </div>
  </div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: ['code', 'dialect', 'allowCopy'],
  data() {
    return {
      copyMessage: "Copy",
      copyIcon: "content_copy",
      copyClass: 'btn-flat',
      copyTitle: null
    }
  },
  computed: {
    highlightDialect() {
      switch (this.dialect) {
        case 'postgresql':
        case 'redshift':
          return 'pgsql'
        default:
          return 'sql'
      }
    },
  },
  methods: {
    onCopySuccess() {
      this.copyMessage = "Copied"
      this.copyIcon = "done"
      this.copyClass = "btn-success"
      setTimeout(() => {
        this.copyMessage = "Copy"
        this.copyIcon = "content_copy"
        this.copyClass = "btn-flat"
      }, 2000)
    },
    onCopyError(e) {
      this.copyMessage = "Error"
      this.copyTitle = e.message
      this.copyIcon = "error"
      this.copyClass = "btn-error"
      setTimeout(() => {
        this.copyMessage = "Copy"
        this.copyIcon = "content_copy"
        this.copyClass = "btn-flat"
      }, 5000);
    }
  }

})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .code-empty .hljs {
    color: rgba($theme-base, 0.15);
  }
</style>
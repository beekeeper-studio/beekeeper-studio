<template>
  <div class="highlighted-code">
    <div class="code-wrap" v-if="code">
      <highlightjs :lang="dialect" :code="code" />
      <a 
        v-clipboard:copy="code"
        v-clipboard:success="onCopySuccess"
        v-clipboard:error="onCopyError"
        class="btn" :class="copyClass"
      ><span class="material-icons" :title='copyTitle'>{{copyIcon}}</span>{{copyMessage}}</a>
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
      copyClass: 'btn-info',
      copyTitle: null
    }
  },
  methods: {
    onCopySuccess() {
      this.copyMessage = "Copied"
      this.copyIcon = "done"
      this.copyClass = "btn-success"
      setTimeout(() => {
        this.copyMessage = "Copy"
        this.copyIcon = "content_copy"
        this.copyClass = "btn-info"
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
        this.copyClass = "btn-info"
      }, 5000);
    }
  }

})
</script>
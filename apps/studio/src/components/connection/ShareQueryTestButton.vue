<!-- DEV ONLY: remove once share-query flow is verified -->
<template>
  <div class="share-query-test-button">
    <a
      class="btn btn-link btn-small"
      href="#"
      @click.prevent="open"
    >Test Share Query</a>

    <portal to="modals">
      <modal
        class="vue-dialog beekeeper-modal"
        name="share-query-test-modal"
        height="auto"
        :scrollable="true"
        @opened="$refs.urlInput.focus()"
      >
        <form
          v-kbd-trap="true"
          @submit.prevent="submit"
        >
          <div class="dialog-content">
            <div class="dialog-c-title">
              Test Share Query
            </div>
            <div class="form-group">
              <label>db param</label>
              <input class="form-control" type="text" v-model="db" placeholder="parsed from URL">
            </div>
            <div class="form-group">
              <label>query param</label>
              <input class="form-control" type="text" v-model="query" placeholder="parsed from URL">
            </div>
            <div v-if="result" class="alert alert-info" style="word-break: break-all; white-space: pre-wrap;">
              {{ JSON.stringify(result, null, 2) }}
            </div>
            <div v-if="error" class="alert alert-danger">
              {{ error }}
            </div>
          </div>
          <div class="vue-dialog-buttons">
            <button class="btn btn-flat" type="button" @click.prevent="close">
              Cancel
            </button>
            <button class="btn btn-primary" type="submit" :disabled="!db && !query">
              Send
            </button>
          </div>
        </form>
      </modal>
    </portal>
  </div>
</template>

<script>
export default {
  data() {
    return {
      db: '',
      query: '',
      result: null,
      error: null,
    }
  },
  methods: {
    open() {
      this.result = null
      this.error = null
      this.$modal.show('share-query-test-modal')
    },
    close() {
      this.$modal.hide('share-query-test-modal')
    },
    async submit() {
      this.result = null
      this.error = null
      try {
        this.result = await this.$store.dispatch('openSharedQuery', { db: this.db, query: this.query })
      } catch (e) {
        this.error = e?.message || String(e)
      }
    }
  }
}
</script>

<template>
  <div class="query-rename-form">
    <form @submit.prevent="submit">
      <div
        class="alert alert-danger save-errors"
        v-if="saveError"
      >
        {{ saveError }}
      </div>
      <div class="form-group">
        <input
          ref="input"
          type="text"
          v-model="title"
          autofocus
          class="form-control"
          name="title"
        >
      </div>
      <div class="buttons">
        <button
          class="btn btn-flat"
          type="button"
          @click.prevent="$emit('done')"
        >
          Cancel
        </button>
        <button
          class="btn btn-primary"
          :disabled="working"
          type="submit"
        >
          Save
        </button>
      </div>
    </form>
  </div>
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import rawLog from '@bksLogger';

const log = rawLog.scope('QueryRenameForm')

export default Vue.extend({
  props: ["query"],
  mounted() {
    this.title = this.query.title
    this.$nextTick(() => {
      this.$refs.input.focus()
    })
  },
  data: () => ({
    title: null,
    saveError: null,
    working: false
  }),
  methods: {
    async submit() {
      const payload = { id: this.query.id, title: this.title}
      this.working = true
      try {
        await this.$store.dispatch('data/queries/save', payload)
        this.$noty.success("Query successfully renamed")
        this.$emit('done')
      } catch (ex) {
        this.saveError = ex.message
        log.error(ex)
      } finally {
        this.working = false
      }
    }
  }

})
</script>

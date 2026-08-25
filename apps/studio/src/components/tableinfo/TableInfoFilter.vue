<template>
  <div class="table-info-filter">
    <i class="material-icons search-icon">search</i>
    <input
      ref="input"
      class="filter-input"
      type="text"
      spellcheck="false"
      :placeholder="placeholder"
      v-model="query"
      @keydown.esc.prevent="clear"
    >
    <!-- The suffix and the clear button toggle with `visibility` so the input
         never changes width mid-typing -->
    <span
      class="filter-matches"
      :class="{ 'is-hidden': !suffix }"
    >{{ suffix }}</span>
    <button
      class="clear-filter"
      :class="{ 'is-hidden': !query }"
      type="button"
      title="Clear filter"
      @click.prevent="clear"
    >
      <i class="material-icons">close</i>
    </button>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

/**
 * A plain search box. Emits `search` with the raw text on every change; the
 * owner of the grid decides what filtering means and reports the result back
 * through `suffix`.
 */
export default Vue.extend({
  props: {
    placeholder: {
      type: String,
      default: 'Filter',
    },
    /** Match count rendered after the input, e.g. '11/14' */
    suffix: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      query: '',
    }
  },
  watch: {
    query() {
      this.$emit('search', this.query)
    },
  },
  methods: {
    clear() {
      this.query = ''
    },
  },
})
</script>

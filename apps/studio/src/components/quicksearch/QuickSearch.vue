<template>
  <div class="quicksearch" v-hotkey="keymap">
    <div class="quicksearch-wrap" ref="menu">
      <div class="form-group">
        <input type="text" ref="searchBox" placeholder="Search" v-model="searchTerm">
        <span class="clear" @click.prevent="searchTerm = null"><i class="material-icons">cancel</i></span>
      </div>
      <ul class="results empty" v-if="!results.length && searchTerm">
        <li>No Results</li>
      </ul>
      <ul class="results empty" v-if="!results.length && !searchTerm">
        <li><strong>Quick Search</strong></li>
        <li>Type a table name or query name</li>
        <li>click or enter - Open</li>
        <li>{{ctrlOrCmd(" click or enter")}} - Alt Open (tables only)</li>
      </ul>
      <ul class="results" v-if="results && results.length">
        <li 
          class="result-item" 
          v-for="(blob, idx) in results" 
          :key="idx" 
          :class="{selected: idx === selectedItem}"
          @click.prevent="handleClick($event, blob)"
        >
          <i class="material-icons item-icon table-icon" v-if="blob.type === 'table'">grid_on</i> 
          <i class="material-icons item-icon query" v-if="blob.type === 'query'">code</i> 
          <span v-html="highlight(blob)"></span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import { AppEvent } from '@/common/AppEvent'
import { escapeHtml } from '@/mixins/data_mutators'
export default Vue.extend({
  mounted() {
    document.addEventListener('mousedown', this.maybeHide)
    this.$nextTick(() => {
      this.$refs.searchBox.focus()
    })
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.maybeHide)
  },
  data() {
    return {
      active: false,
      searchTerm: null,
      results: [],
      // @ts-ignore-error
      selectedItem: 0
    }
  },
  watch: {
    selectedItem() {
      if (this.selectedItem < 0) {
        this.selectedItem = Math.max(0, this.results.length - 1)
      } else if (this.results.length && this.selectedItem >= this.results.length) {
        this.selectedItem = 0
      }

    },
    async searchTerm() {
      if (this.searchTerm) {
        const indexes = await this.searchIndex.searchAsync(this.searchTerm, 10)
        this.results = indexes.map((i) => {
          return this.database[i]
        })

        if (this.selectedItem >= this.results.length) this.selectedItem = this.results.length - 1
      } else {
        this.results = []
        this.selectedItem = 0
      }
    },

  },
  computed: {
    ...mapState('search', ['searchIndex']),
    ...mapGetters({ database: 'search/database'}),
    elements() {
      if (this.$refs.menu) {
        return Array.from(this.$refs.menu.getElementsByTagName("*"))
      } else {
        return []
      }
    },
    keymap() {
      const result = {}

      result[this.ctrlOrCmd('k')] = this.openSearch
      result[this.ctrlOrCmd('o')] = this.openSearch

      result['up'] = this.selectUp
      result['down'] = this.selectDown
      result['esc'] = this.closeSearch
      result['enter'] = this.enter
      result[this.ctrlOrCmd('enter')] = this.metaEnter
      // /announce I like emacs bindings and there's nothing you can do to stop me.
      // /me *evil laugh*
      result['ctrl+p'] = this.selectUp
      result['ctrl+n'] = this.selectDown

      return result
    }
  },
  methods: {
    highlight(blob) {
      const dangerous = blob.title
      const text = escapeHtml(dangerous || "unknown item")
      const regex = new RegExp(this.searchTerm.split(/\s+/).filter((i) => i?.length).join("|"), 'gi')
      const result = text.replace(regex, (match) => `<strong>${match}</strong>`)

      return result
    },

    openSearch() {
      this.$nextTick(() => {
        this.$refs.searchBox.focus()
      })
    },
    closeSearch() {
      this.$emit('close')
    },
    selectUp() {
      this.selectedItem = this.selectedItem - 1
    },
    selectDown() {
      this.selectedItem = this.selectedItem + 1
    },
    submit(result) {
      if(!result?.item) return
      if (result.type === 'table') {
        this.$root.$emit(AppEvent.loadTable, {table: result.item})
      } else {
        this.$root.$emit('favoriteClick', result.item)
      }
      this.closeSearch()

    },
    submitAlt(result) {
      if(!result?.item) return

      if (result.type === 'table') {
        this.$root.$emit(AppEvent.openTableProperties, { table: result.item })
      } else {
        return this.submit(result)
      }
      this.closeSearch()
    },
    handleClick(event: MouseEvent, result: any) {
      if (event.ctrlKey) {
        this.submitAlt(result)
      } else {
        this.submit(result)
      }
    },
    enter() {
      const result = this.results[this.selectedItem]
      this.submit(result)
    },
    metaEnter() {
      const result = this.results[this.selectedItem]
      this.submitAlt(result)

    },
    maybeHide(event: MouseEvent) {
      const target = event.target
      if (!this.elements.includes(target)) {
        this.closeSearch()
      }
    }

  }
})
</script>
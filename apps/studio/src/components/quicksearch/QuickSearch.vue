<template>
  <div
    class="quicksearch"
    v-hotkey="keymap"
  >
    <div class="quicksearch-bg" />
    <div
      class="quicksearch-wrap"
      ref="menu"
    >
      <div class="form-group">
        <input
          type="text"
          ref="searchBox"
          placeholder="Quick Search"
          v-model="searchTerm"
        >
        <span
          class="clear"
          @click.prevent="searchTerm = null"
        ><i class="material-icons">cancel</i></span>
      </div>
      <ul
        class="results no-results"
        v-if="!results.length && searchTerm"
      >
        <li>No Results</li>
      </ul>
      <div
        class="results empty"
        v-if="!results.length && !searchTerm"
      >
        <p>Type a table name or query name</p>
        <div class="shortcut-item">
          <div>Open </div>
          <div class="shortcut">
            <span>Enter</span>
          </div>
        </div>
        <div class="shortcut-item">
          <div>Alt Open</div>
          <div class="shortcut">
            <span v-if="this.$config.isMac">Cmd</span>
            <span v-if="!this.$config.isMac">Ctrl</span>
            <span>Enter</span>
          </div>
          <span class="hint">(tables only)</span>
        </div>
        <div class="shortcut-item">
          <div>Open In Background</div>
          <div class="shortcut">
            <!-- <span v-if="this.$config.isMac">Cmd</span>
            <span v-if="!this.$config.isMac">Ctrl</span> -->
            <span>Right Arrow</span>
          </div>
          <span class="hint">(tables only)</span>
        </div>
        <div class="shortcut-item">
          <div>Alt In Background</div>
          <div class="shortcut">
            <span v-if="this.$config.isMac">Cmd</span>
            <span v-if="!this.$config.isMac">Ctrl</span>
            <span>Right Arrow</span>
          </div>
          <span class="hint">(tables only)</span>
        </div>
      </div>
      <ul
        class="results"
        v-if="results && results.length"
      >
        <li
          class="result-item"
          v-for="(blob, idx) in results"
          :key="idx"
          :class="{selected: idx === selectedItem}"
          @click.prevent="handleClick($event, blob)"
        >
          <table-icon
            v-if="blob.type === 'table'"
            :table="blob.item"
          />
          <i
            class="material-icons item-icon query"
            v-if="blob.type === 'query'"
          >code</i>
          <i
            class="material-icons item-icon connection"
            v-if="blob.type === 'connection'"
          >power</i>
          <i
            class="material-icons item-icon database"
            v-if="blob.type === 'database'"
          >storage</i>
          <span v-html="highlight(blob)" />
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
import TableIcon from '@/components/common/TableIcon.vue'
import { escapeHtml } from '@shared/lib/tabulator'
export default Vue.extend({
  components: { TableIcon },
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
        const ids: any[] = await this.searchIndex.searchAsync(this.searchTerm, 20)
        this.results = this.database.filter((blob) => ids.includes(blob.id))

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
      result['right'] = this.persistentSearchEnter
      result[this.ctrlOrCmd('right')] = this.persistentSearchMetaEnter

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
    selectUp(e: Event) {
      e.stopPropagation()
      this.selectedItem = this.selectedItem - 1
    },
    selectDown(e) {
      e.stopPropagation()
      this.selectedItem = this.selectedItem + 1
    },
    async submit(result, persistSearch = false) {
      if(!result?.item) return
      switch (result.type) {
        case 'table':
          this.$root.$emit(AppEvent.loadTable, {table: result.item})
          break;
        case 'query':
          this.$root.$emit('favoriteClick', result.item)
          break;
        case 'connection':
          await this.$store.dispatch('disconnect')
          try {
            await this.$store.dispatch('connect', result.item)
          } catch (ex) {
            this.$noty.error("Error establishing a connection")
            console.error(ex)
          }
          break;
        case 'database':
          this.$store.dispatch('changeDatabase', result.item)
          break;
        default:
          break;
      }
      if (!persistSearch) this.closeSearch()
    },
    submitAlt(result, persistSearch = false) {
      if(!result?.item) return

      if (result.type === 'table') {
        this.$root.$emit(AppEvent.openTableProperties, { table: result.item })
      } else {
        return this.submit(result)
      }
      if (!persistSearch) this.closeSearch()
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
    persistentSearchEnter(){
      const cursorPosition = this.$refs.searchBox.selectionStart
      if (this.searchTerm.length === cursorPosition){
        const result = this.results[this.selectedItem]
        this.submit(result, true)
      }
    },
    persistentSearchMetaEnter(){
      const cursorPosition = this.$refs.searchBox.selectionStart
      if (this.searchTerm.length === cursorPosition){
        const result = this.results[this.selectedItem]
        this.submitAlt(result, true)
      }
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

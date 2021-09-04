<template>
  <div class="quicksearch" v-hotkey="keymap" v-show="active" >
    <!-- <span class="top-right">
      <a @click.prevent="active = false" class="btn btn-link">Close</a>
    </span> -->
    <div class="quicksearch-wrap"> 
    <div class="form-group">
      <input type="text" ref="searchBox" placeholder="Search" v-model="searchTerm">
      <span class="clear" @click.prevent="searchTerm = null"><i class="material-icons">cancel</i></span>
    </div>
      <ul class="results empty" v-if="!results.length">
        <li>No Results</li>
      </ul>
      <ul class="results" v-if="results && results.length">
        <li class="result-item" v-for="(blob, idx) in results" :key="idx" :class="{selected: idx === selectedItem}">
          {{blob.item.name || blob.item.title}} -  {{blob.type}}
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import FlexSearch from 'flexsearch'
import { mapState } from 'vuex'
import { AppEvent } from '@/common/AppEvent'
export default Vue.extend({
  mounted() {
    this.updateDatabase()
  },
  data() {
    return {
      active: false,
      searchTerm: null,
      results: [],
      worker: new FlexSearch.Worker({ tokenize: 'forward', }),
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
    active() {
      if (!this.active) {
        this.searchTerm = null
        
      }
    },
    async searchTerm() {
      if (this.searchTerm) {
        // eslint-disable-next-line no-debugger
        const indexes = await this.worker.searchAsync(this.searchTerm, 10)
        this.results = indexes.map((i) => {
          return this.database[i]
        })

        if (this.selectedItem >= this.results.length) this.selectedItem = this.results.length - 1
      } else {
        this.results = []
        this.selectedItem = 0
      }
    },
    database: {
      deep: true,
      handler() {
        this.updateDatabase()

      }
    }
  },
  computed: {
    ...mapState(['tables', 'favorites']),
    database(): any[] {
      const tables = this.tables.map((t) => ({item: t, type: 'table'}))
      const favorites = this.favorites.map((f) => ({item: f, type: 'favorite'}))
      return [ ...tables, ...favorites]
    },
    keymap() {
      const result = {}
      if (!this.active) {
        result[this.ctrlOrCmd('k')] = this.openSearch
        result[this.ctrlOrCmd('o')] = this.openSearch
      } else {
        result['up'] = this.selectUp
        result['down'] = this.selectDown
        result['esc'] = this.closeSearch
        result['enter'] = this.submit
        result[this.ctrlOrCmd('enter')] = this.submitAlt
      }

      return result
    }
  },
  methods: {
    async updateDatabase() {
      await Promise.all(
        this.database.map((item, idx) => 
          this.worker.addAsync(idx, item.item.name || item.item.title)
        )
      )
    },
    openSearch() {
      this.active = true
      this.$nextTick(() => {
        this.$refs.searchBox.focus()
      })
    },
    closeSearch() {
      this.active = false
    },
    selectUp() {
      this.selectedItem = this.selectedItem - 1
    },
    selectDown() {
      this.selectedItem = this.selectedItem + 1
    },
    submit() {
      const result = this.results[this.selectedItem]

      if(!result?.item) return


      if (result.type === 'table') {
        this.$root.$emit(AppEvent.loadTable, {table: result.item})
      } else {
        this.$root.$emit('favoriteClick', result.item)
      }
      this.active = false
    },
    submitAlt() {
      const result = this.results[this.selectedItem]
      if(!result?.item) return

      if (result.type === 'table') {
        this.$root.$emit(AppEvent.openTableProperties, { table: result.item })
      } else {
        return this.submit()
      }
      this.active = false
      
    }

  }
})
</script>
<template>
  <div v-if="false" />
</template>
<script lang="ts">
import _ from 'lodash'
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
import rawLog from '@bksLogger'

const log = rawLog.scope('StateManager')
export default Vue.extend({
  mounted() {
    this.updateDatabase(this.database)
  },
  computed: {
    ...mapState('search', ['searchIndex']),
    // ...mapState({ searchIndex: 'search/searchIndex'}),
    ...mapGetters({database: 'search/database'}),
  },
  watch: {
    database: {
      deep: true,
      handler(newDb, oldDb) {
        const newIds = newDb.map((i) => i.id)
        const oldIds = oldDb.map((i)=> i.id)
        const removed = oldDb.filter((i) => !newIds.includes(i.id))
        log.debug("removing from search index", removed.length)
        removed.forEach((blob) => {
          this.searchIndex.removeAsync(blob.id)
        })


        const newItems = newDb.filter((i) => !oldIds.includes(i.id))
        log.debug("adding to search index", newItems.length)
        this.updateDatabase(newItems)
      }
    }
  },
  methods: {
    updateDatabase(items) {
      items.map((item) => {
        const type = item.type
        const payload = `${item.title} ${type}`
        this.searchIndex.addAsync(item.id, payload)
      })
    },
  }

})
</script>

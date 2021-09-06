<template>
  <div v-if="false"></div>
</template>
<script lang="ts">
import Vue from 'vue'
import { mapGetters, mapState } from 'vuex'
export default Vue.extend({
  mounted() {
    this.updateDatabase()
  },
  computed: {
    ...mapState('search', ['searchIndex']),
    // ...mapState({ searchIndex: 'search/searchIndex'}),
    ...mapGetters({database: 'search/database'}),
  },
  watch: {
    database: {
      deep: true,
      handler() {
        this.updateDatabase()
      }
    }
  },
  methods: {
    async updateDatabase() {
      await Promise.all(
        this.database.map((item, idx) => {
          const type = item.type
          const payload = `${item.title} ${type}`
          this.searchIndex.addAsync(idx, payload)
        })
      )
    },
  }

})
</script>
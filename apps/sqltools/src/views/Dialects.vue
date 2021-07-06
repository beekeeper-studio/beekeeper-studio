<template>
  <div class="dialects-page small-wrap">
    <h1>Code examples by SQL Dialect</h1>
    <div class="dialect-list">
      <ul>
        <li v-for="dialect in dialects" :key="dialect">
          <router-link :to="{name: 'Dialect', params: {dialect_id: dialect}}">{{titleFor(dialect)}}</router-link>
        </li>
      </ul>
    </div>
  </div>
</template>
<script lang="ts">
import { Dialect, DialectTitles } from '@shared/lib/dialects/models'
import Vue from 'vue'
import { mapState } from 'vuex'
export default Vue.extend({
  metaInfo() {
    return {
      title: "SQL Code examples by dialect",
      meta: [
        {
          name: 'description',
          content: "Code examples for Postgres, MySQL, Redshift, SQLite, and SQL Server"
        }
      ]
    }
  },
  computed: {
    ...mapState(['dialects']),
  },
  methods: {
    titleFor(dialect: Dialect) {
      return DialectTitles[dialect]
    }
  }
})
</script>
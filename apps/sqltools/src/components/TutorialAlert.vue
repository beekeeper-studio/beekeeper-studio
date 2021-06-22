<template>
  <div class="alert">
    <div>{{content}}</div>
  </div>

</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {
      content: "SQLTools is a SQL table builder for Postgres, MySQL, SQL Server, SQLite, and Redshift databases. We also provide some simple sql table starter templates, check them out above 👆."
    }
  }
})
</script>
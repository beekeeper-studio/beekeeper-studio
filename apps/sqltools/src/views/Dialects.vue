<template>
  <div class="dialects-page">
    <div class="subheader">
      <div class="small-wrap">
        <h1>Code examples by SQL Dialect</h1>
      </div>
    </div>
    <section>
      <div class="small-wrap">
        <div class="dialect-list">
          <div class="row gutter">
            <div class="col s3" v-for="dialect in dialects" :key="dialect">
              <router-link :to="{name: 'Dialect', params: {dialect_id: dialect}}" class="card-flat card-link padding flex-col">
                <img :src="require(`@/assets/img/db-logos/${dialect}-client.svg`)">
                <div>{{titleFor(dialect)}}</div>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </section>
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

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  $img-size:          150px;

  .dialect-list {
    a {
      display: flex;
    }
    img {
      width: $img-size;
      height: $img-size * 0.65;
      margin-bottom: $gutter-w;
    }
    .card-flat {
      transition: background 0.2s ease-in-out;
      border-radius: 32px;
    }
  }
</style>
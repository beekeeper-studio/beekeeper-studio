<template>
<div class="home">
  <section class="subheader">
    <div class="small-wrap">
      <h1>SQLTools</h1>
      <div class="subtitle">
        SQLTools is a collection of useful utilities for relational databases from the makers of <a class="text-primary" href="https://beekeeperstudio.io" target="_blank">Beekeeper Studio</a>. These tools are all free and open source, contain no creepy tracking, and non of the data you enter will be sent to our servers.
      </div>
    </div>
  </section>
  <section>
    <div class="small-wrap">
      <router-link to="/format">
        <div class="card-flat padding">
          <h2>SQL Formatter</h2>
          <p>Quickly format SQL queries, just paste your ugly SQL and get beautiful SQL back.</p>
        </div>

      </router-link>
      <router-link to="/build">
        <div class="card-flat padding">
          <h2>Table Builder</h2>
          <p>Visually create database tables with an intuitive interface. We always forget CREATE TABLE syntax, so we built this to help.</p>
          <p>
            <span class="badge" v-for="s in syntaxes" :key="s">{{s}}</span>
          </p>
        </div>

      </router-link>
      <router-link to="/templates">
        <div class="card-flat padding">
          <h2>Table Templates</h2>
          <p>SQL table templates and examples. These are super useful if you're building a database schema and don't know where to start. Once you find a template you like, modify it in our Table Builder, or just copy the CREATE TABLE syntax as needed.</p>
          <p>
            <span class="badge" v-for="s in syntaxes" :key="s">{{s}}</span>
          </p>
        </div>

      </router-link>
    </div>
  </section>
</div>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  data() {
    return {
      syntaxes: ['Postgres', 'MySQL', 'SqLite', 'SQL Server', 'Redshift']
    }
  }
})
</script>
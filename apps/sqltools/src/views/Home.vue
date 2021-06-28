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

  <!-- Tools List -->
  <section class="tools-list">
    <div class="small-wrap">

      <router-link to="/format" class="card-flat card-link padding">
        <h2>SQL Formatter</h2>
        <div>Quickly format SQL queries, just paste your ugly SQL and get beautiful SQL back.</div>
      </router-link>

      <router-link to="/build" class="card-flat card-link padding">
        <h2>Table Builder</h2>
        <p>Visually create database tables with an intuitive interface. We always forget CREATE TABLE syntax, so we built this to help.</p>
        <div>
          <span class="badge" v-for="s in syntaxes" :key="s">{{s}}</span>
        </div>
      </router-link>

      <router-link to="/templates" class="card-flat card-link padding">
        <h2>Table Templates</h2>
        <p>SQL table templates and examples. These are super useful if you're building a database schema and don't know where to start. Once you find a template you like, modify it in our Table Builder, or just copy the CREATE TABLE syntax as needed.</p>
        <div>
          <span class="badge" v-for="s in syntaxes" :key="s">{{s}}</span>
        </div>
      </router-link>

    </div>
  </section>

  <!-- Promise -->
  <section class="promise">
    <div class="small-wrap">
      <h2>Our Promise</h2>
      <p>SQLTools is made by <a href="https://beekeeperstudio.io" target="_blank" class="text-primary">Beekeeper Studio</a> and is 100% MIT open source and free. We promise to keep it that way.</p>
      <p>We are</p>
      <ul>
        <li><strong>Open and Free</strong> We believe basic development tools should be free and open source under a permissive license.</li>
        <li><strong>Private</strong> SQLTools does not transmit your data to our servers or any third party tool. It is private to you</li>
        <li><strong>Inclusive</strong> We are an inclusive community and have a code of conduct. Diversity and inclusivity is good for the world.</li>
      </ul>
      <p><a href="https://beekeeperstudio.io" target="_blank" class="text-primary">Beekeeper Studio</a> is an open source and free SQL management app available for Linux, MacOS and Windows. Many SQLTools utilities are also part of the Beekeeper Studio app, but we thought they might be useful to the rest of the internet too.</p>
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

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  section {
    padding: ($gutter-w * 4) $gutter-w;
  }
  .card-flat {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: $gutter-w;
    width: 100%;
  }
  .promise {
    background: darken($theme-bg, 3%);
  }
</style>

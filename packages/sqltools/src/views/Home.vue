<template>
  <div class="home">
    <div class="big-wrap">
      <schema-builder>
        <template>
          <span class="table-title">Schema Builder</span>
        </template>
      </schema-builder>
    </div>
  </div>
</template>

<script>
import Vue from 'vue';
import SchemaBuilder from '../../../components/src/components/SchemaBuilder.vue';

export default Vue.extend ({
  name: 'Home',
  components: { 
    SchemaBuilder
  }
})
</script>

<style lang="scss" scoped>
  @import '@/assets/styles/app/_variables';

  .home {
    padding: 0 ($gutter-w * 2);
  }
  .table-header {
    padding: $gutter-w 0;
    .table-title {
      font-weight: bold;
      font-size: 1.25rem;
      margin: 0;
      color: $text-dark;
    }
  }
</style>